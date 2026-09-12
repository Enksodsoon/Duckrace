import { describe, expect, it } from 'vitest';
import {
  RACE_RECORD_VERSION,
  createRaceRecord,
  sampleRace,
  validateRaceRecord,
} from './raceEngine.js';

function sequenceCrypto(values) {
  let index = 0;
  return {
    get calls() {
      return index;
    },
    getRandomValues(array) {
      if (index >= values.length) throw new Error('fake crypto exhausted');
      array[0] = values[index];
      index += 1;
      return array;
    },
  };
}

describe('createRaceRecord', () => {
  it('creates a deeply immutable, versioned seeded record', () => {
    const appearances = [{ breed: 'mallard', accessory: { kind: 'hat' } }, { breed: 'runner' }];
    const record = createRaceRecord({
      entries: ['Ada', 'Lin'],
      seed: 'class-7',
      duration: 12.5,
      stage: 'mountain-river',
      appearances,
      podiumCount: 3,
      eliminationPlaces: [1],
    });

    expect(record).toMatchObject({
      version: RACE_RECORD_VERSION,
      drawMode: 'seeded',
      seed: 'class-7',
      durationMs: 12500,
      stage: 'mountain-river',
      podiumCount: 2,
      eliminationPlaces: [1],
    });
    expect(validateRaceRecord(record)).toBe(true);
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.participants)).toBe(true);
    expect(Object.isFrozen(record.appearances[0].accessory)).toBe(true);
    appearances[0].accessory.kind = 'glasses';
    expect(record.appearances[0].accessory.kind).toBe('hat');
  });

  it('keeps duplicate names as distinct participant occurrences', () => {
    const generated = createRaceRecord({ entries: ['Sam', 'Sam'], seed: 'duplicate-test' });
    expect(generated.participants.map(({ name }) => name)).toEqual(['Sam', 'Sam']);
    expect(new Set(generated.participants.map(({ id }) => id)).size).toBe(2);

    const supplied = createRaceRecord({
      entries: [{ id: 'sam-a', name: 'Sam' }, { id: 'sam-b', name: 'Sam' }],
      seed: 'duplicate-test',
    });
    expect(supplied.order.slice().sort()).toEqual(['sam-a', 'sam-b']);
  });

  it('rejects empty, oversized, and malformed entry collections without truncation', () => {
    expect(() => createRaceRecord({ entries: [], seed: 'x' })).toThrow(/at least one/);
    expect(() => createRaceRecord({ entries: Array.from({ length: 101 }, (_, index) => `Duck ${index}`), seed: 'x' })).toThrow(/100/);
    expect(() => createRaceRecord({ entries: ['ok', '   '], seed: 'x' })).toThrow(/names/);
    expect(() => createRaceRecord({ entries: [{ id: 'same', name: 'A' }, { id: 'same', name: 'B' }], seed: 'x' })).toThrow(/duplicate participant id/);
    expect(() => createRaceRecord({ entries: ['A'], seed: 'x', duration: 0.0001 })).toThrow(/one millisecond/);
  });

  it('uses rejection sampling for an unbiased cryptographic Fisher-Yates draw', () => {
    // For bound 3, 0xffffffff is outside the largest divisible Uint32 range.
    const crypto = sequenceCrypto([0xffffffff, 0, 1, 10, 11, 12, 13]);
    const record = createRaceRecord({ entries: ['A', 'B', 'C'] }, crypto);

    expect(record.drawMode).toBe('crypto');
    expect(record.order).toEqual(['participant-3', 'participant-2', 'participant-1']);
    expect(record.presentationSeed).toBe('0000000a0000000b0000000c0000000d');
    expect(crypto.calls).toBe(7);
  });

  it('rejects a fresh draw when cryptographic entropy is unavailable', () => {
    expect(() => createRaceRecord({ entries: ['A', 'B'] }, null)).toThrow(/getRandomValues/);
  });

  it('draws the same seeded result regardless of presentation settings', () => {
    const entries = ['A', 'B', 'C', 'D', 'E'];
    const forest = createRaceRecord({
      entries,
      seed: 'stable-seed',
      duration: 9,
      stage: 'forest-lake',
      appearances: entries.map(() => ({ breed: 'mallard' })),
    });
    const marsh = createRaceRecord({
      entries,
      seed: 'stable-seed',
      duration: 9,
      stage: 'sunset-marsh',
      appearances: entries.map(() => ({ breed: 'mandarin', accessory: 'medal' })),
    });

    expect(marsh.order).toEqual(forest.order);
    expect(marsh.presentationSeed).toBe(forest.presentationSeed);
    for (const elapsed of [0, 17, 1000, 4500, 9000, 9720]) {
      expect(sampleRace(marsh, elapsed)).toEqual(sampleRace(forest, elapsed));
    }
  });

  it('creates an exact permutation of all participant IDs', () => {
    const entries = Array.from({ length: 100 }, (_, index) => ({ id: `duck-${index}`, name: `Duck ${index}` }));
    const record = createRaceRecord({ entries, seed: 'hundred-ducks' });
    expect(record.order).toHaveLength(100);
    expect(new Set(record.order).size).toBe(100);
    expect(record.order.slice().sort()).toEqual(entries.map(({ id }) => id).sort());
  });
});

describe('sampleRace', () => {
  it('is schedule-independent, deterministic, and has no effects on its record', () => {
    const record = createRaceRecord({ entries: ['A', 'B', 'C'], seed: 'replay', duration: 1 });
    const serialized = JSON.stringify(record);
    const direct = sampleRace(record, 640);
    sampleRace(record, 100);
    sampleRace(record, 300);
    expect(sampleRace(record, 640)).toEqual(direct);
    expect(JSON.stringify(record)).toBe(serialized);
  });

  it('keeps each duck monotonic, permits overtakes, and finishes in record order', () => {
    const record = createRaceRecord({ entries: ['A', 'B', 'C', 'D'], seed: 'motion', duration: 1 });
    const samples = [];
    for (let elapsed = 0; elapsed <= 1150; elapsed += 25) samples.push(sampleRace(record, elapsed));

    for (let participant = 0; participant < record.participants.length; participant += 1) {
      for (let index = 1; index < samples.length; index += 1) {
        expect(samples[index].progress[participant]).toBeGreaterThanOrEqual(samples[index - 1].progress[participant]);
      }
    }

    const earlyRanking = sampleRace(record, 100).ranking;
    expect(earlyRanking).not.toEqual(record.order);
    expect(sampleRace(record, 1000).ranking[0]).toBe(record.order[0]);
    const final = sampleRace(record, 1150);
    expect(final.finished).toBe(true);
    expect(final.ranking).toEqual(record.order);
    expect(final.progress).toEqual([100, 100, 100, 100]);
  });

  it('gives every duck a unique finish time after the winner reaches durationMs', () => {
    const record = createRaceRecord({ entries: ['A', 'B', 'C', 'D'], seed: 'finish-times', duration: 1 });
    const finishTimes = new Map();
    for (let elapsed = 0; elapsed <= 1150; elapsed += 1) {
      const sample = sampleRace(record, elapsed);
      sample.progress.forEach((value, index) => {
        const id = record.participants[index].id;
        if (value === 100 && !finishTimes.has(id)) finishTimes.set(id, elapsed);
      });
    }

    expect(finishTimes.get(record.order[0])).toBe(record.durationMs);
    expect(new Set(finishTimes.values()).size).toBe(record.participants.length);
    expect([...finishTimes.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id)).toEqual(record.order);
  });

  it('clamps elapsed time and reports finished only after all ducks cross', () => {
    const record = createRaceRecord({ entries: ['A', 'B'], seed: 'clamp', duration: 1 });
    expect(sampleRace(record, -50).elapsedMs).toBe(0);
    expect(sampleRace(record, 1000).finished).toBe(false);
    expect(sampleRace(record, 1150)).toMatchObject({ elapsedMs: 1150, finished: true });
    expect(sampleRace(record, 99999)).toMatchObject({ elapsedMs: 1150, finished: true });
    expect(() => sampleRace(record, Number.NaN)).toThrow(/elapsedMs/);
  });

  it('finishes all 100 ducks exactly at the clamped completion sample', () => {
    const entries = Array.from({ length: 100 }, (_, index) => `Duck ${index}`);
    const record = createRaceRecord({ entries, seed: 'hundred-finishers', duration: 1 });
    const completed = sampleRace(record, 1150);

    expect(completed.finished).toBe(true);
    expect(completed.progress).toHaveLength(100);
    expect(completed.progress.every((value) => value === 100)).toBe(true);
    expect(completed.ranking).toEqual(record.order);
  });
});

describe('validateRaceRecord', () => {
  it('accepts a JSON round trip and rejects malformed records without throwing', () => {
    const valid = JSON.parse(JSON.stringify(createRaceRecord({ entries: ['A', 'B'], seed: 'valid' })));
    expect(validateRaceRecord(valid)).toBe(true);
    expect(validateRaceRecord(null)).toBe(false);
    expect(validateRaceRecord({ ...valid, version: 2 })).toBe(false);
    expect(validateRaceRecord({ ...valid, order: [valid.order[0], valid.order[0]] })).toBe(false);
    expect(validateRaceRecord({ ...valid, drawMode: 'crypto' })).toBe(false);
    expect(validateRaceRecord({ ...valid, presentationSeed: 'not-hex' })).toBe(false);
    expect(validateRaceRecord({ ...valid, appearances: [{}] })).toBe(false);
    expect(validateRaceRecord({ ...valid, eliminationPlaces: [0, 0] })).toBe(false);
  });

  it('rejects pathologically deep appearance data without overflowing the stack', () => {
    const valid = JSON.parse(JSON.stringify(createRaceRecord({ entries: ['A'], seed: 'valid' })));
    const deeplyNested = [];
    let cursor = deeplyNested;
    for (let index = 0; index < 20000; index += 1) {
      const child = [];
      cursor.push(child);
      cursor = child;
    }

    expect(() => validateRaceRecord({ ...valid, appearances: [deeplyNested] })).not.toThrow();
    expect(validateRaceRecord({ ...valid, appearances: [deeplyNested] })).toBe(false);

    const cyclic = [];
    cyclic.push(cyclic);
    expect(validateRaceRecord({ ...valid, appearances: [cyclic] })).toBe(false);
  });

  it('revalidates mutable records rather than caching stale results', () => {
    const mutable = JSON.parse(JSON.stringify(createRaceRecord({ entries: ['A', 'B'], seed: 'mutable' })));
    expect(validateRaceRecord(mutable)).toBe(true);
    mutable.order[1] = mutable.order[0];
    expect(validateRaceRecord(mutable)).toBe(false);
  });
});
