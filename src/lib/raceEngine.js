export const RACE_RECORD_VERSION = 1;

const UINT32_RANGE = 0x100000000;
const MAX_PARTICIPANTS = 100;
const MAX_DURATION_SECONDS = 3600;
const MAX_APPEARANCE_DEPTH = 64;
const MAX_APPEARANCE_NODES = 10000;
const validatedImmutableRecords = new WeakSet();

/**
 * @typedef {object} RaceParticipant
 * @property {string} id Stable, unique occurrence ID.
 * @property {string} name Display name. Duplicate names are allowed.
 *
 * @typedef {object} RaceRecordV1
 * @property {1} version
 * @property {ReadonlyArray<Readonly<RaceParticipant>>} participants Input-order participants.
 * @property {ReadonlyArray<string>} order Finish-order participant IDs.
 * @property {'crypto'|'seeded'} drawMode
 * @property {string} seed Empty for a fresh cryptographic draw.
 * @property {string} presentationSeed 128-bit hexadecimal animation seed.
 * @property {boolean} [presentationShuffle] Whether display lanes use presentation-seeded placement.
 * @property {number} durationMs Time at which the winner crosses the finish.
 * @property {string} stage
 * @property {ReadonlyArray<unknown>} appearances Participant-aligned cosmetics, or an empty array.
 * @property {number} podiumCount
 * @property {ReadonlyArray<number>} eliminationPlaces Zero-based finish places.
 */

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isJsonValue(value) {
  const ancestors = new Set();
  const stack = [{ value, depth: 0, exiting: false }];
  let visited = 0;

  try {
    while (stack.length > 0) {
      const frame = stack.pop();
      if (frame.exiting) {
        ancestors.delete(frame.value);
        continue;
      }

      visited += 1;
      if (visited > MAX_APPEARANCE_NODES || frame.depth > MAX_APPEARANCE_DEPTH) return false;
      const item = frame.value;
      if (item === null || typeof item === 'string' || typeof item === 'boolean') continue;
      if (typeof item === 'number') {
        if (!Number.isFinite(item)) return false;
        continue;
      }
      if (typeof item !== 'object' || ancestors.has(item)) return false;
      if (!Array.isArray(item) && !isPlainObject(item)) return false;

      const entries = Array.isArray(item)
        ? item.map((child) => [null, child])
        : Object.entries(item);
      if (entries.some(([key]) => key !== null && key.length === 0)) return false;

      ancestors.add(item);
      stack.push({ value: item, depth: frame.depth, exiting: true });
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        stack.push({ value: entries[index][1], depth: frame.depth + 1, exiting: false });
      }
    }
    return true;
  } catch {
    return false;
  }
}

function cloneJsonValue(value) {
  if (Array.isArray(value)) return value.map(cloneJsonValue);
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneJsonValue(item)]));
  }
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const item of Object.values(value)) deepFreeze(item);
  return value;
}

function normalizeParticipants(entries) {
  if (!Array.isArray(entries)) throw new TypeError('entries must be an array');
  if (entries.length === 0) throw new RangeError('at least one entry is required');
  if (entries.length > MAX_PARTICIPANTS) {
    throw new RangeError(`entries cannot exceed ${MAX_PARTICIPANTS}`);
  }

  const explicitIds = new Set();
  for (const entry of entries) {
    if (typeof entry === 'string') continue;
    if (!isPlainObject(entry) || typeof entry.id !== 'string' || entry.id.trim() === '') {
      throw new TypeError('object entries require a non-empty string id');
    }
    const id = entry.id.trim();
    if (explicitIds.has(id)) throw new RangeError(`duplicate participant id: ${id}`);
    explicitIds.add(id);
  }

  const ids = new Set(explicitIds);
  return entries.map((entry, index) => {
    const rawName = typeof entry === 'string' ? entry : entry.name;
    if (typeof rawName !== 'string' || rawName.trim() === '') {
      throw new TypeError('entry names must be non-empty strings');
    }

    let id;
    if (typeof entry === 'string') {
      const base = `participant-${index + 1}`;
      id = base;
      let suffix = 2;
      while (ids.has(id)) {
        id = `${base}-${suffix}`;
        suffix += 1;
      }
      ids.add(id);
    } else {
      id = entry.id.trim();
    }

    return { id, name: rawName.trim() };
  });
}

// xmur3 plus sfc32 gives a stable cross-platform Uint32 stream. Seeded mode is
// reproducible and auditable; only unseeded mode claims cryptographic entropy.
function xmur3(value) {
  let hash = 1779033703 ^ value.length;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    return (hash ^= hash >>> 16) >>> 0;
  };
}

function seededUint32(seed, domain) {
  const seedWords = xmur3(`${domain}\u0000${seed}`);
  let a = seedWords();
  let b = seedWords();
  let c = seedWords();
  let d = seedWords();
  return () => {
    const result = (a + b + d) >>> 0;
    d = (d + 1) >>> 0;
    a = (b ^ (b >>> 9)) >>> 0;
    b = (c + (c << 3)) >>> 0;
    c = ((c << 21) | (c >>> 11)) >>> 0;
    c = (c + result) >>> 0;
    return result;
  };
}

function cryptoUint32(source) {
  if (!source || typeof source.getRandomValues !== 'function') {
    throw new TypeError('fresh races require crypto.getRandomValues');
  }
  return () => {
    const word = new Uint32Array(1);
    source.getRandomValues(word);
    return word[0];
  };
}

function randomBelow(nextUint32, bound) {
  if (!Number.isInteger(bound) || bound < 1 || bound > UINT32_RANGE) {
    throw new RangeError('random bound must be a positive Uint32 range');
  }
  const acceptanceLimit = Math.floor(UINT32_RANGE / bound) * bound;
  let value;
  do {
    value = nextUint32();
    if (!Number.isInteger(value) || value < 0 || value >= UINT32_RANGE) {
      throw new TypeError('random source must return Uint32 values');
    }
  } while (value >= acceptanceLimit);
  return value % bound;
}

function shuffledIds(participants, nextUint32) {
  const ids = participants.map(({ id }) => id);
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const swapIndex = randomBelow(nextUint32, index + 1);
    [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
  }
  return ids;
}

function seedHex(nextUint32) {
  let result = '';
  for (let index = 0; index < 4; index += 1) {
    result += nextUint32().toString(16).padStart(8, '0');
  }
  return result;
}

function normalizeAppearances(appearances, participantCount) {
  if (!Array.isArray(appearances)) throw new TypeError('appearances must be an array');
  if (appearances.length !== 0 && appearances.length !== participantCount) {
    throw new RangeError('appearances must be empty or aligned with participants');
  }
  if (!isJsonValue(appearances)) throw new TypeError('appearances must contain JSON-safe values');
  return cloneJsonValue(appearances);
}

function normalizeEliminationPlaces(places, participantCount) {
  if (!Array.isArray(places)) throw new TypeError('eliminationPlaces must be an array');
  const seen = new Set();
  return places.map((place) => {
    if (!Number.isInteger(place) || place < 0 || place >= participantCount) {
      throw new RangeError('eliminationPlaces must contain valid zero-based finish places');
    }
    if (seen.has(place)) throw new RangeError(`duplicate elimination place: ${place}`);
    seen.add(place);
    return place;
  });
}

/**
 * Draws and returns an immutable race record. A non-empty seed selects the
 * reproducible seeded draw; an empty seed uses unbiased rejection-sampled
 * cryptographic Fisher-Yates draws. Presentation options never enter the order
 * draw. `duration` is expressed in seconds.
 *
 * @param {object} options
 * @param {Array<string|{id:string,name:string}>} options.entries
 * @param {string} [options.seed='']
 * @param {number} [options.duration=15]
 * @param {number} [options.podiumCount=3]
 * @param {string} [options.stage='forest-lake']
 * @param {Array<unknown>} [options.appearances=[]]
 * @param {Array<number>} [options.eliminationPlaces=[]]
 * @param {boolean} [options.presentationShuffle=true]
 * @param {{getRandomValues:(array:Uint32Array)=>Uint32Array}} [cryptoSource=globalThis.crypto]
 * @returns {Readonly<RaceRecordV1>}
 */
export function createRaceRecord(
  {
    entries,
    seed = '',
    duration = 15,
    podiumCount = 3,
    stage = 'forest-lake',
    appearances = [],
    eliminationPlaces = [],
    presentationShuffle = true,
  },
  cryptoSource = globalThis.crypto,
) {
  const participants = normalizeParticipants(entries);
  if (typeof seed !== 'string') throw new TypeError('seed must be a string');
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0 || duration > MAX_DURATION_SECONDS) {
    throw new RangeError(`duration must be greater than zero and at most ${MAX_DURATION_SECONDS} seconds`);
  }
  const durationMs = Math.round(duration * 1000);
  if (durationMs < 1) throw new RangeError('duration must be at least one millisecond');
  if (!Number.isInteger(podiumCount) || podiumCount < 1) {
    throw new RangeError('podiumCount must be a positive integer');
  }
  if (typeof stage !== 'string' || stage.trim() === '') throw new TypeError('stage must be a non-empty string');
  if (typeof presentationShuffle !== 'boolean') throw new TypeError('presentationShuffle must be a boolean');

  const drawMode = seed.length > 0 ? 'seeded' : 'crypto';
  const orderSource = drawMode === 'seeded'
    ? seededUint32(seed, 'duck-race/outcome/v1')
    : cryptoUint32(cryptoSource);
  const order = shuffledIds(participants, orderSource);

  // Domain separation means seeded presentation motion cannot perturb outcome.
  // Fresh mode draws this only after Fisher-Yates has completed.
  const presentationSource = drawMode === 'seeded'
    ? seededUint32(seed, 'duck-race/presentation/v1')
    : orderSource;

  const record = {
    version: RACE_RECORD_VERSION,
    participants,
    order,
    drawMode,
    seed,
    presentationSeed: seedHex(presentationSource),
    presentationShuffle,
    durationMs,
    stage: stage.trim(),
    appearances: normalizeAppearances(appearances, participants.length),
    podiumCount: Math.min(podiumCount, participants.length),
    eliminationPlaces: normalizeEliminationPlaces(eliminationPlaces, participants.length),
  };

  const immutableRecord = deepFreeze(record);
  validatedImmutableRecords.add(immutableRecord);
  return immutableRecord;
}

/**
 * Checks the complete persisted v1 schema without throwing. This accepts a
 * JSON-parsed record; object freezing is an in-memory creation guarantee.
 *
 * @param {unknown} record
 * @returns {record is RaceRecordV1}
 */
export function validateRaceRecord(record) {
  if (record && typeof record === 'object' && validatedImmutableRecords.has(record)) return true;
  if (!isPlainObject(record) || record.version !== RACE_RECORD_VERSION) return false;
  const {
    participants,
    order,
    drawMode,
    seed,
    presentationSeed,
    presentationShuffle,
    durationMs,
    stage,
    appearances,
    podiumCount,
    eliminationPlaces,
  } = record;

  if (!Array.isArray(participants) || participants.length < 1 || participants.length > MAX_PARTICIPANTS) return false;
  const ids = new Set();
  for (const participant of participants) {
    if (!isPlainObject(participant)) return false;
    if (typeof participant.id !== 'string' || participant.id.trim() === '') return false;
    if (typeof participant.name !== 'string' || participant.name.trim() === '') return false;
    if (ids.has(participant.id)) return false;
    ids.add(participant.id);
  }

  if (!Array.isArray(order) || order.length !== participants.length) return false;
  if (new Set(order).size !== ids.size || order.some((id) => typeof id !== 'string' || !ids.has(id))) return false;
  if (drawMode !== 'crypto' && drawMode !== 'seeded') return false;
  if (typeof seed !== 'string' || (drawMode === 'crypto' ? seed !== '' : seed.length === 0)) return false;
  if (typeof presentationSeed !== 'string' || !/^[0-9a-f]{32}$/.test(presentationSeed)) return false;
  if (presentationShuffle !== undefined && typeof presentationShuffle !== 'boolean') return false;
  if (!Number.isInteger(durationMs) || durationMs < 1 || durationMs > MAX_DURATION_SECONDS * 1000) return false;
  if (typeof stage !== 'string' || stage.trim() === '') return false;
  if (!Array.isArray(appearances) || (appearances.length !== 0 && appearances.length !== participants.length)) return false;
  if (!isJsonValue(appearances)) return false;
  if (!Number.isInteger(podiumCount) || podiumCount < 1 || podiumCount > participants.length) return false;
  if (!Array.isArray(eliminationPlaces)) return false;
  const seenPlaces = new Set();
  for (const place of eliminationPlaces) {
    if (!Number.isInteger(place) || place < 0 || place >= participants.length || seenPlaces.has(place)) return false;
    seenPlaces.add(place);
  }
  return true;
}

function presentationFraction(presentationSeed, participantId) {
  return seededUint32(`${presentationSeed}\u0000${participantId}`, 'duck-race/motion/v1')() / UINT32_RANGE;
}

export function finishTailMs(record) {
  if (record.participants.length === 1) return 0;
  return Math.min(1200, Math.max(150, record.durationMs * 0.08));
}

const recordSamplingCache = new WeakMap();

function getPreparedSamplingData(record) {
  let prepared = recordSamplingCache.get(record);
  if (prepared) return prepared;

  const participantCount = record.participants.length;
  const tailMs = finishTailMs(record);
  const finishGapMs = participantCount > 1 ? tailMs / (participantCount - 1) : 0;
  const totalDurationMs = record.durationMs + tailMs;
  const orderIndex = new Map(record.order.map((id, index) => [id, index]));
  const participantIndex = new Map(record.participants.map(({ id }, index) => [id, index]));

  const participantData = record.participants.map(({ id }, index) => {
    const rank = orderIndex.get(id);
    const finishMs = record.durationMs + rank * finishGapMs;
    const rankFraction = participantCount === 1 ? 0 : rank / (participantCount - 1);
    const variation = (presentationFraction(record.presentationSeed, id) - 0.5) * 0.08;
    const exponent = 1.24 - rankFraction * 0.46 + variation;
    return {
      id,
      index,
      rank,
      finishMs,
      exponent,
    };
  });

  const participantIds = record.participants.map(({ id }) => id);
  const finishOrder = [...record.order];
  const indices = Object.freeze(Array.from({ length: participantCount }, (_, i) => i));
  const finishedProgress = Object.freeze(new Array(participantCount).fill(100));

  prepared = {
    participantCount,
    totalDurationMs,
    orderIndex,
    participantIndex,
    participantData,
    participantIds,
    finishOrder,
    indices,
    finishedProgress,
  };

  recordSamplingCache.set(record, prepared);
  return prepared;
}

/**
 * High-frequency progress sampling for animation loops. Writes directly into `out`
 * if supplied, avoiding garbage collection pressure and sort overhead in the RAF loop.
 *
 * @param {RaceRecordV1} record
 * @param {number} elapsedMs
 * @param {number[]|Float64Array} [out]
 * @returns {number[]|Float64Array}
 */
export function sampleRaceProgress(record, elapsedMs, out = null) {
  if (!validateRaceRecord(record)) throw new TypeError('invalid race record');
  if (typeof elapsedMs !== 'number' || !Number.isFinite(elapsedMs)) {
    throw new TypeError('elapsedMs must be a finite number');
  }

  const prepared = getPreparedSamplingData(record);
  const totalDurationMs = prepared.totalDurationMs;
  const sampledElapsedMs = Math.min(Math.max(0, elapsedMs), totalDurationMs);
  const length = prepared.participantCount;

  if (sampledElapsedMs >= totalDurationMs) {
    if (out && out.length === length) {
      for (let i = 0; i < length; i++) out[i] = 100;
      return out;
    }
    return prepared.finishedProgress;
  }

  const data = prepared.participantData;
  const progress = out && out.length === length ? out : new Array(length);
  for (let i = 0; i < length; i++) {
    const p = data[i];
    if (sampledElapsedMs >= p.finishMs) {
      progress[i] = 100;
    } else {
      const normalizedTime = sampledElapsedMs / p.finishMs;
      progress[i] = 100 * normalizedTime ** p.exponent;
    }
  }
  return progress;
}

/**
 * Samples a replay without consuming randomness or causing effects. Progress is
 * aligned with `record.participants`. The winner crosses at `durationMs`; other
 * ducks cross at unique, evenly-spaced times during a short tail of at most
 * 1.2 seconds (and normally 8% of the winner duration). `finished` means every
 * duck has crossed.
 *
 * @param {RaceRecordV1} record
 * @param {number} elapsedMs
 * @returns {{progress:number[],ranking:string[],finished:boolean,elapsedMs:number}}
 */
export function sampleRace(record, elapsedMs) {
  if (!validateRaceRecord(record)) throw new TypeError('invalid race record');
  if (typeof elapsedMs !== 'number' || !Number.isFinite(elapsedMs)) {
    throw new TypeError('elapsedMs must be a finite number');
  }

  const prepared = getPreparedSamplingData(record);
  const totalDurationMs = prepared.totalDurationMs;
  const sampledElapsedMs = Math.min(Math.max(0, elapsedMs), totalDurationMs);
  const finished = sampledElapsedMs >= totalDurationMs;

  if (finished) {
    return {
      progress: prepared.finishedProgress,
      ranking: prepared.finishOrder,
      finished: true,
      elapsedMs: totalDurationMs,
    };
  }

  const data = prepared.participantData;
  const length = data.length;
  const progress = new Array(length);
  for (let i = 0; i < length; i++) {
    const p = data[i];
    if (sampledElapsedMs >= p.finishMs) {
      progress[i] = 100;
    } else {
      const normalizedTime = sampledElapsedMs / p.finishMs;
      progress[i] = 100 * normalizedTime ** p.exponent;
    }
  }

  const ranking = prepared.indices.slice().sort((leftIdx, rightIdx) => {
    const leftProgress = progress[leftIdx];
    const rightProgress = progress[rightIdx];
    if (rightProgress !== leftProgress) return rightProgress - leftProgress;
    if (leftProgress === 100) return data[leftIdx].rank - data[rightIdx].rank;
    return leftIdx - rightIdx;
  }).map(idx => data[idx].id);

  return {
    progress,
    ranking,
    finished,
    elapsedMs: sampledElapsedMs,
  };
}
