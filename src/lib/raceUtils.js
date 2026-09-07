export const RESULTS_EXPORT_HEADERS = ["rank", "name"];
export const PERSISTED_STORAGE_KEY = "duck-race-randomizer:v2";
export const LEGACY_STORAGE_KEY = "duck-race-randomizer:v1";

export function parseBooleanParam(value, fallback = false) {
  if (value == null) return fallback;
  const normalized = String(value).toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function seededShuffle(arr, rng) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function toCsvRow(values) {
  return values
    .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
    .join(",");
}

export function parseCsvOrTextEntries(content) {
  const raw = String(content || "").replace(/\r\n/g, "\n");
  const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];

  const looksLikeCsv = lines.some((line) => line.includes(","));
  if (!looksLikeCsv) return splitEntries(raw);

  return lines
    .map((line) => {
      const firstCell = line.match(/^\s*"((?:[^"]|"")*)"\s*(?:,|$)/);
      if (firstCell) return firstCell[1].replace(/""/g, '"').trim();
      return line.split(",")[0]?.trim() || "";
    })
    .filter(Boolean);
}

export function downloadText(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function splitEntries(text) {
  return String(text || "")
    .split(/[\n,;\t]+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

export function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function placeLabel(index) {
  const n = index + 1;
  const mod10 = n % 10;
  const mod100 = n % 100;
  let suffix = "th";
  if (mod10 === 1 && mod100 !== 11) suffix = "st";
  else if (mod10 === 2 && mod100 !== 12) suffix = "nd";
  else if (mod10 === 3 && mod100 !== 13) suffix = "rd";
  return `${n}${suffix}`;
}

export function removeManyOccurrences(list, values) {
  const remaining = [...list];
  for (const value of values) {
    const index = remaining.indexOf(value);
    if (index !== -1) remaining.splice(index, 1);
  }
  return remaining;
}

export function hashString(value) {
  const input = String(value || "");
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function buildDuckVariant(name, styleSeed = 0) {
  const rng = mulberry32(hashString(`${name}::${styleSeed}`));
  const palettes = [
    { bodyA: "#fff8d7", bodyB: "#f6d95b", wing: "#e8bd29", accent: "#0f766e", accentSoft: "#7dd3c7", bill: "#f97316" },
    { bodyA: "#f6fbff", bodyB: "#b4ebf8", wing: "#5fcde4", accent: "#0f766e", accentSoft: "#d8fbff", bill: "#fb923c" },
    { bodyA: "#ffe6e0", bodyB: "#ffc1ab", wing: "#ff9878", accent: "#0ea5a4", accentSoft: "#ffd9cb", bill: "#ea580c" },
    { bodyA: "#eefdf8", bodyB: "#9ae6d4", wing: "#5cc7ba", accent: "#115e59", accentSoft: "#cbfbf1", bill: "#fb923c" },
    { bodyA: "#f4f1ff", bodyB: "#d8c8ff", wing: "#b8a2ff", accent: "#0f766e", accentSoft: "#eee7ff", bill: "#f97316" },
    { bodyA: "#edf7ff", bodyB: "#91d5f6", wing: "#49b7d8", accent: "#155e75", accentSoft: "#d6f6ff", bill: "#fb923c" },
  ];
  return {
    palette: pick(rng, palettes),
    accessory: pick(rng, ["cap", "scarf", "glasses", "bow", "none"]),
    pattern: pick(rng, ["none", "spot", "stripe"]),
    eyeSize: 1 + rng() * 0.25,
    tiltAccent: rng() > 0.5 ? 1 : -1,
  };
}

export function generateNumberedEntries(start, end, prefix = "") {
  const s = Number(start);
  const e = Number(end);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return [];
  const low = Math.min(s, e);
  const high = Math.max(s, e);
  const list = [];
  for (let i = low; i <= high; i += 1) list.push(`${prefix ?? ""}${i}`.trim());
  return list;
}

export function dedupeEntries(list) {
  const input = Array.isArray(list) ? list : [];
  const seen = new Set();
  const deduped = [];
  for (const entry of input) {
    const key = String(entry).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }
  return { list: deduped, removedCount: input.length - deduped.length };
}

export function exportEntriesCsvText(entries) {
  const list = Array.isArray(entries) ? entries : [];
  return [toCsvRow(["entry"]), ...list.map((entry) => toCsvRow([entry]))].join("\n");
}

export function exportResultsCsvText(winners) {
  const list = Array.isArray(winners) ? winners : [];
  return [toCsvRow(RESULTS_EXPORT_HEADERS), ...list.map((name, index) => toCsvRow([placeLabel(index), name]))].join("\n");
}

export function buildShareUrl(base, { seed, audience, minimal, shuffle } = {}) {
  const url = new URL(base);
  if (seed) url.searchParams.set("seed", String(seed));
  else url.searchParams.delete("seed");
  if (audience) url.searchParams.set("audience", "1");
  else url.searchParams.delete("audience");
  if (minimal) url.searchParams.set("minimal", "1");
  else url.searchParams.delete("minimal");
  if (shuffle) url.searchParams.set("shuffle", "1");
  else url.searchParams.delete("shuffle");
  return url.toString();
}

function asClampedNumber(value, min, max) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return clamp(value, min, max);
}

// Reads persisted app state (v2, falling back to v1) and returns a validated
// partial state object. Returns null when nothing usable is stored.
// Malformed data is ignored (never throws). Pure apart from the storage read,
// so it can run inside lazy useState initializers and avoid a hydration effect.
export function readPersistedState(storage) {
  try {
    const rawV2 = storage?.getItem?.(PERSISTED_STORAGE_KEY);
    const rawV1 = rawV2 ? null : storage?.getItem?.(LEGACY_STORAGE_KEY);
    const raw = rawV2 ?? rawV1;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const out = { migratedFromLegacy: !rawV2 && !!rawV1 };
    if (typeof parsed.entriesText === "string") out.entriesText = parsed.entriesText;
    if (typeof parsed.numberStart === "string") out.numberStart = parsed.numberStart;
    if (typeof parsed.numberEnd === "string") out.numberEnd = parsed.numberEnd;
    if (typeof parsed.prefix === "string") out.prefix = parsed.prefix;
    const duration = asClampedNumber(parsed.duration, 3, 30);
    if (duration !== undefined) out.duration = duration;
    if (typeof parsed.shuffleBeforeRace === "boolean") out.shuffleBeforeRace = parsed.shuffleBeforeRace;
    if (typeof parsed.soundEnabled === "boolean") out.soundEnabled = parsed.soundEnabled;
    const soundVolume = asClampedNumber(parsed.soundVolume, 0, 200);
    if (soundVolume !== undefined) out.soundVolume = soundVolume;
    if (typeof parsed.soundPreset === "string") out.soundPreset = parsed.soundPreset;
    const countdownChannelVolume = asClampedNumber(parsed.countdownChannelVolume, 0, 200);
    if (countdownChannelVolume !== undefined) out.countdownChannelVolume = countdownChannelVolume;
    const startChannelVolume = asClampedNumber(parsed.startChannelVolume, 0, 200);
    if (startChannelVolume !== undefined) out.startChannelVolume = startChannelVolume;
    const raceChannelVolume = asClampedNumber(parsed.raceChannelVolume, 0, 200);
    if (raceChannelVolume !== undefined) out.raceChannelVolume = raceChannelVolume;
    const finishChannelVolume = asClampedNumber(parsed.finishChannelVolume, 0, 200);
    if (finishChannelVolume !== undefined) out.finishChannelVolume = finishChannelVolume;
    if (typeof parsed.rerollAvatarsEachRound === "boolean") out.rerollAvatarsEachRound = parsed.rerollAvatarsEachRound;
    if (typeof parsed.podiumCountInput === "string") out.podiumCountInput = parsed.podiumCountInput;
    if (Array.isArray(parsed.eliminationPlaces)) {
      out.eliminationPlaces = parsed.eliminationPlaces.filter((n) => Number.isInteger(n) && n >= 0);
    }
    if (Array.isArray(parsed.lastResults)) out.lastResults = parsed.lastResults.slice(0, 8).map(String);
    if (typeof parsed.raceSeedInput === "string") out.raceSeedInput = parsed.raceSeedInput;
    if (typeof parsed.isCompactOverlay === "boolean") out.isCompactOverlay = parsed.isCompactOverlay;
    if (typeof parsed.fairnessMode === "boolean") out.fairnessMode = parsed.fairnessMode;
    if (typeof parsed.dedupeEntries === "boolean") out.dedupeEntries = parsed.dedupeEntries;
    if (typeof parsed.entryFilter === "string") out.entryFilter = parsed.entryFilter;
    if (Array.isArray(parsed.raceLogs)) out.raceLogs = parsed.raceLogs.slice(0, 40);
    if (Array.isArray(parsed.roundHistory)) out.roundHistory = parsed.roundHistory.slice(0, 40);
    if (typeof parsed.roundNumber === "number" && Number.isFinite(parsed.roundNumber)) {
      out.roundNumber = Math.max(1, Math.floor(parsed.roundNumber));
    }
    return out;
  } catch {
    return null;
  }
}
