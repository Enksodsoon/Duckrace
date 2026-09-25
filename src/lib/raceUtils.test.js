import { describe, it, expect } from 'vitest';
import {
  parseBooleanParam,
  seededShuffle,
  toCsvRow,
  parseCsvOrTextEntries,
  splitEntries,
  clamp,
  placeLabel,
  removeManyOccurrences,
  hashString,
  mulberry32,
  generateNumberedEntries,
  dedupeEntries,
  exportEntriesCsvText,
  exportResultsCsvText,
  buildShareUrl,
  readPersistedState,
  PERSISTED_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  shuffleTextEntries,
  formatResultsText,
} from './raceUtils.js';

function memoryStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
  };
}

describe('splitEntries', () => {
  it('splits on newlines', () => {
    expect(splitEntries('a\nb\nc')).toEqual(['a', 'b', 'c']);
  });

  it('splits on commas', () => {
    expect(splitEntries('a,b, c')).toEqual(['a', 'b', 'c']);
  });

  it('splits on semicolons', () => {
    expect(splitEntries('a;b;c')).toEqual(['a', 'b', 'c']);
  });

  it('splits on tabs', () => {
    expect(splitEntries('a\tb\tc')).toEqual(['a', 'b', 'c']);
  });

  it('splits on mixed delimiters and trims empties', () => {
    expect(splitEntries('a, b\nc;d\te')).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(splitEntries('  a , , b  ')).toEqual(['a', 'b']);
  });
});

describe('dedupeEntries', () => {
  it('removes duplicates preserving first-seen order', () => {
    expect(dedupeEntries(['a', 'b', 'a', 'c', 'b'])).toEqual({
      list: ['a', 'b', 'c'],
      removedCount: 2,
    });
  });

  it('returns zero removedCount when no duplicates', () => {
    expect(dedupeEntries(['x', 'y'])).toEqual({ list: ['x', 'y'], removedCount: 0 });
  });
});

describe('generateNumberedEntries', () => {
  it('generates prefixed range ascending', () => {
    expect(generateNumberedEntries(1, 3, 'Group ')).toEqual(['Group 1', 'Group 2', 'Group 3']);
  });

  it('generates ascending even when end < start', () => {
    expect(generateNumberedEntries(5, 3, 'Group ')).toEqual(['Group 3', 'Group 4', 'Group 5']);
    expect(generateNumberedEntries('10', '8', '#')).toEqual(['#8', '#9', '#10']);
  });

  it('returns empty array for non-finite bounds', () => {
    expect(generateNumberedEntries('foo', 5, 'Group ')).toEqual([]);
  });
});

describe('seededShuffle', () => {
  it('is repeatable with the same seed', () => {
    const input = ['a', 'b', 'c', 'd', 'e'];
    const first = seededShuffle(input, mulberry32(42));
    const second = seededShuffle(input, mulberry32(42));
    expect(first).toEqual(second);
  });

  it('preserves all elements without mutating input', () => {
    const input = ['a', 'b', 'c', 'd'];
    const snapshot = [...input];
    const out = seededShuffle(input, mulberry32(7));
    expect(out.slice().sort()).toEqual(snapshot.slice().sort());
    expect(input).toEqual(snapshot);
  });
});

describe('placeLabel', () => {
  it('labels 1st, 2nd, 3rd correctly', () => {
    expect(placeLabel(0)).toBe('1st');
    expect(placeLabel(1)).toBe('2nd');
    expect(placeLabel(2)).toBe('3rd');
  });

  it('handles teen exceptions like 11th, 12th, 13th', () => {
    expect(placeLabel(10)).toBe('11th');
    expect(placeLabel(11)).toBe('12th');
    expect(placeLabel(12)).toBe('13th');
  });

  it('labels other ordinals', () => {
    expect(placeLabel(3)).toBe('4th');
    expect(placeLabel(20)).toBe('21st');
    expect(placeLabel(21)).toBe('22nd');
  });
});

describe('toCsvRow', () => {
  it('quotes and joins values', () => {
    expect(toCsvRow(['a', 'b'])).toBe('"a","b"');
  });

  it('escapes embedded quotes and nullish values', () => {
    expect(toCsvRow(['a"b'])).toBe('"a""b"');
    expect(toCsvRow([null, undefined])).toBe('"",""');
  });
});

describe('parseCsvOrTextEntries', () => {
  it('extracts first column from csv lines', () => {
    expect(parseCsvOrTextEntries('Alice,extra\nBob,extra2')).toEqual(['Alice', 'Bob']);
  });

  it('handles quoted first cells containing commas', () => {
    expect(parseCsvOrTextEntries('"Doe, John",30\n"Smith, Jane",25')).toEqual(['Doe, John', 'Smith, Jane']);
  });

  it('falls back to plain entries when no commas present', () => {
    expect(parseCsvOrTextEntries('a\nb\nc')).toEqual(['a', 'b', 'c']);
  });
});

describe('other utils (sanity)', () => {
  it('parseBooleanParam handles truthy strings', () => {
    expect(parseBooleanParam('1')).toBe(true);
    expect(parseBooleanParam('true')).toBe(true);
    expect(parseBooleanParam('yes')).toBe(true);
    expect(parseBooleanParam('0')).toBe(false);
    expect(parseBooleanParam(null, true)).toBe(true);
  });

  it('clamp bounds values', () => {
    expect(clamp(5, 1, 3)).toBe(3);
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it('removeManyOccurrences removes one occurrence per value', () => {
    expect(removeManyOccurrences(['a', 'b', 'a'], ['a'])).toEqual(['b', 'a']);
  });

  it('hashString is deterministic', () => {
    expect(hashString('duck')).toBe(hashString('duck'));
  });

  it('exportEntriesCsvText includes header plus rows', () => {
    expect(exportEntriesCsvText(['a', 'b'])).toBe('"entry"\n"a"\n"b"');
  });

  it('exportResultsCsvText includes rank header plus place labels', () => {
    expect(exportResultsCsvText(['Alice', 'Bob'])).toBe('"rank","name"\n"1st","Alice"\n"2nd","Bob"');
  });

  it('buildShareUrl sets and clears params', () => {
    const url = buildShareUrl('https://example.com/?seed=old', {
      seed: 'abc',
      audience: true,
      minimal: false,
      shuffle: true,
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('seed')).toBe('abc');
    expect(parsed.searchParams.get('audience')).toBe('1');
    expect(parsed.searchParams.has('minimal')).toBe(false);
    expect(parsed.searchParams.get('shuffle')).toBe('1');

    const cleared = new URL(buildShareUrl('https://example.com/?seed=abc&audience=1', {}));
    expect(cleared.searchParams.has('seed')).toBe(false);
    expect(cleared.searchParams.has('audience')).toBe(false);
  });
});

describe('readPersistedState', () => {
  it('returns null when storage is empty', () => {
    expect(readPersistedState(memoryStorage())).toBeNull();
    expect(readPersistedState(null)).toBeNull();
    expect(readPersistedState(undefined)).toBeNull();
  });

  it('returns null on malformed JSON without throwing', () => {
    expect(readPersistedState(memoryStorage({ [PERSISTED_STORAGE_KEY]: 'not-json{{' }))).toBeNull();
    expect(readPersistedState(memoryStorage({ [PERSISTED_STORAGE_KEY]: '[1,2,3]' }))).toBeNull();
  });

  it('reads and validates v2 fields, clamping numbers', () => {
    const storage = memoryStorage({
      [PERSISTED_STORAGE_KEY]: JSON.stringify({
        entriesText: 'A\nB',
        duration: 100,
        soundVolume: -5,
        roundNumber: 0.5,
        eliminationPlaces: [0, 2, 'x', -1],
        lastResults: ['r1'],
        bogus: true,
      }),
    });
    const out = readPersistedState(storage);
    expect(out.entriesText).toBe('A\nB');
    expect(out.duration).toBe(30);
    expect(out.soundVolume).toBe(0);
    expect(out.roundNumber).toBe(1);
    expect(out.eliminationPlaces).toEqual([0, 2]);
    expect(out).not.toHaveProperty('bogus');
    expect(out.migratedFromLegacy).toBe(false);
  });

  it('falls back to v1 and flags migration', () => {
    const storage = memoryStorage({
      [LEGACY_STORAGE_KEY]: JSON.stringify({ entriesText: 'Old', duration: 5 }),
    });
    const out = readPersistedState(storage);
    expect(out.entriesText).toBe('Old');
    expect(out.duration).toBe(5);
    expect(out.migratedFromLegacy).toBe(true);
  });

  it('prefers v2 over v1 when both exist', () => {
    const storage = memoryStorage({
      [PERSISTED_STORAGE_KEY]: JSON.stringify({ entriesText: 'New' }),
      [LEGACY_STORAGE_KEY]: JSON.stringify({ entriesText: 'Old' }),
    });
    expect(readPersistedState(storage).entriesText).toBe('New');
  });
});

describe('shuffleTextEntries', () => {
  it('returns same text for empty or single line', () => {
    expect(shuffleTextEntries('')).toBe('');
    expect(shuffleTextEntries('One')).toBe('One');
  });

  it('preserves all items after shuffling multiline entries', () => {
    const text = 'Alpha\nBeta\nGamma\nDelta';
    const shuffled = shuffleTextEntries(text);
    const originalSorted = text.split('\n').sort();
    const shuffledSorted = shuffled.trim().split('\n').sort();
    expect(shuffledSorted).toEqual(originalSorted);
  });
});

describe('formatResultsText', () => {
  it('formats podium results with medals and stage name', () => {
    const record = {
      participants: [
        { id: 'p1', name: 'Mallard' },
        { id: 'p2', name: 'Runner' },
        { id: 'p3', name: 'Mandarin' },
      ],
      order: ['p2', 'p1', 'p3'],
    };
    const formatted = formatResultsText(record, 'Forest Lake');
    expect(formatted).toContain('🦆 Duck Race Results (Forest Lake)');
    expect(formatted).toContain('🥇 1st: Runner');
    expect(formatted).toContain('🥈 2nd: Mallard');
    expect(formatted).toContain('🥉 3rd: Mandarin');
  });
});

