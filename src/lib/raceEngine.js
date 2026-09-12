export const RACE_RECORD_VERSION = 1;

const UINT32_RANGE = 0x100000000;
const MAX_PARTICIPANTS = 100;
const MAX_DURATION_SECONDS = 3600;

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

function isJsonValue(value, seen = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || seen.has(value)) return false;

  seen.add(value);
  const valid = Array.isArray(value)
    ? value.every((item) => isJsonValue(item, seen))
    : isPlainObject(value)
      && Object.entries(value).every(([key, item]) => key.length > 0 && isJsonValue(item, seen));
  seen.delete(value);
  return valid;
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
    durationMs,
    stage: stage.trim(),
    appearances: normalizeAppearances(appearances, participants.length),
    podiumCount: Math.min(podiumCount, participants.length),
    eliminationPlaces: normalizeEliminationPlaces(eliminationPlaces, participants.length),
  };

  return deepFreeze(record);
}

/**
 * Checks the complete persisted v1 schema without throwing. This accepts a
 * JSON-parsed record; object freezing is an in-memory creation guarantee.
 *
 * @param {unknown} record
 * @returns {record is RaceRecordV1}
 */
export function validateRaceRecord(record) {
  if (!isPlainObject(record) || record.version !== RACE_RECORD_VERSION) return false;
  const {
    participants,
    order,
    drawMode,
    seed,
    presentationSeed,
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

function finishTailMs(record) {
  if (record.participants.length === 1) return 0;
  return Math.min(1200, Math.max(150, record.durationMs * 0.08));
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

  const participantCount = record.participants.length;
  const tailMs = finishTailMs(record);
  const finishGapMs = participantCount > 1 ? tailMs / (participantCount - 1) : 0;
  const totalDurationMs = record.durationMs + tailMs;
  const sampledElapsedMs = Math.min(Math.max(0, elapsedMs), totalDurationMs);
  const orderIndex = new Map(record.order.map((id, index) => [id, index]));
  const participantIndex = new Map(record.participants.map(({ id }, index) => [id, index]));

  const progress = record.participants.map(({ id }) => {
    const rank = orderIndex.get(id);
    const finishMs = record.durationMs + rank * finishGapMs;
    const normalizedTime = Math.min(1, sampledElapsedMs / finishMs);
    const rankFraction = participantCount === 1 ? 0 : rank / (participantCount - 1);
    // Lower placed ducks lead early; the later finish times force real overtakes.
    // A small deterministic variation keeps the motion from looking uniform.
    const variation = (presentationFraction(record.presentationSeed, id) - 0.5) * 0.08;
    const exponent = 1.24 - rankFraction * 0.46 + variation;
    return normalizedTime >= 1 ? 100 : 100 * normalizedTime ** exponent;
  });

  const ranking = record.participants
    .map(({ id }) => id)
    .sort((left, right) => {
      const leftProgress = progress[participantIndex.get(left)];
      const rightProgress = progress[participantIndex.get(right)];
      if (rightProgress !== leftProgress) return rightProgress - leftProgress;
      if (leftProgress === 100) return orderIndex.get(left) - orderIndex.get(right);
      return participantIndex.get(left) - participantIndex.get(right);
    });

  return {
    progress,
    ranking,
    finished: sampledElapsedMs >= totalDurationMs,
    elapsedMs: sampledElapsedMs,
  };
}
