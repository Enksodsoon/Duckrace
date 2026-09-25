import { readPersistedState, splitEntries } from "./raceUtils.js";
import { validateRaceRecord } from "./raceEngine.js";
import { SAMPLE, STAGES, BREEDS, ACCESSORIES } from "./catalog.js";

export const STORAGE_KEY = "duck-race-randomizer:v3";
export const DEFAULTS = {
  entriesText: SAMPLE,
  duration: 15,
  podiumCount: 3,
  eliminationPlaces: [],
  dedupe: true,
  seed: "",
  stage: "forest-lake",
  breed: "mallard",
  accessory: "none",
  mixedBreeds: true,
  reroll: false,
  appearanceRound: 0,
  quality: "auto",
  reducedMotion: false,
  camera: "chase",
  sound: false,
  volume: 70,
  soundPreset: "cinematic",
  channels: { countdown: 100, start: 100, race: 30, finish: 100 },
  shuffle: true,
  compact: false,
  chroma: false,
  numberStart: "1",
  numberEnd: "10",
  prefix: "Group ",
  filter: "",
};
const bounded = (n, min, max, fallback) =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
export function validateSettings(s = {}) {
  const next = { ...DEFAULTS };
  if (!s || typeof s !== "object") return next;
  for (const k of ["entriesText", "seed", "numberStart", "numberEnd", "prefix", "filter"])
    if (typeof s[k] === "string") next[k] = s[k].slice(0, k === "entriesText" ? 100000 : 1000);
  for (const k of [
    "dedupe",
    "mixedBreeds",
    "reroll",
    "reducedMotion",
    "sound",
    "shuffle",
    "compact",
    "chroma",
  ])
    if (typeof s[k] === "boolean") next[k] = s[k];
  next.duration = bounded(s.duration, 3, 30, 15);
  next.podiumCount = Math.floor(bounded(s.podiumCount, 1, 100, 3));
  next.volume = bounded(s.volume, 0, 200, 70);
  next.appearanceRound = Math.floor(bounded(s.appearanceRound, 0, 1000000, 0));
  for (const [key, allowed] of Object.entries({
    stage: STAGES.map((x) => x.id),
    breed: BREEDS.map((x) => x.id),
    accessory: ACCESSORIES.map((x) => x.id),
    quality: ["auto", "high", "medium", "low"],
    camera: ["chase", "overview", "follow"],
    soundPreset: ["sport", "cinematic", "minimal"],
  }))
    if (allowed.includes(s[key])) next[key] = s[key];
  next.eliminationPlaces = Array.isArray(s.eliminationPlaces)
    ? [
        ...new Set(
          s.eliminationPlaces.filter((n) => Number.isInteger(n) && n >= 0 && n < next.podiumCount),
        ),
      ].sort((a, b) => a - b)
    : [];
  next.channels = Object.fromEntries(
    Object.entries(DEFAULTS.channels).map(([k, fallback]) => [
      k,
      bounded(s.channels?.[k], 0, 200, fallback),
    ]),
  );
  return next;
}
export function loadSession(storage, search = "") {
  let settings = { ...DEFAULTS },
    history = [],
    legacyHistory = [],
    notice = "";
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      settings = validateSettings(parsed.settings);
      history = Array.isArray(parsed.history)
        ? parsed.history
            .filter((x) => x && validateRaceRecord(x.record) && typeof x.id === "string")
            .slice(0, 40)
        : [];
      legacyHistory = Array.isArray(parsed.legacyHistory) ? parsed.legacyHistory.slice(0, 40) : [];
    } else {
      const old = readPersistedState(storage);
      if (old) {
        settings = validateSettings({
          ...old,
          seed: old.raceSeedInput,
          podiumCount: Number(old.podiumCountInput),
          dedupe: old.dedupeEntries,
          sound: old.soundEnabled,
          volume: old.soundVolume,
          shuffle: old.shuffleBeforeRace,
          compact: old.isCompactOverlay,
          filter: old.entryFilter,
          reroll: old.rerollAvatarsEachRound,
          channels: {
            countdown: old.countdownChannelVolume,
            start: old.startChannelVolume,
            race: old.raceChannelVolume,
            finish: old.finishChannelVolume,
          },
        });
        legacyHistory = (old.raceLogs?.length ? old.raceLogs : old.lastResults || []).slice(0, 40);
        notice = "Saved settings restored. Earlier results are retained as legacy history.";
      }
    }
  } catch {
    notice = "Saved data could not be read. This session can still run races.";
  }
  const params = new URLSearchParams(search);
  if (params.has("theme")) settings.chroma = params.get("theme") === "chroma";
  if (params.has("seed")) settings.seed = params.get("seed").slice(0, 1000);
  for (const [param, key] of [
    ["shuffle", "shuffle"],
    ["sound", "sound"],
    ["minimal", "compact"],
  ])
    if (params.has(param)) settings[key] = ["1", "true", "yes"].includes(params.get(param));
  return { settings, history, legacyHistory, notice };
}
export function getDuplicateCount(text) {
  const lines = entryLines(text);
  const seen = new Set();
  let duplicates = 0;
  for (const rawName of lines) {
    const name = rawName.toLowerCase();
    if (seen.has(name)) duplicates++;
    else seen.add(name);
  }
  return duplicates;
}
export function getParticipants(text, dedupe = true, filter = "") {
  const seen = new Set();
  return entryLines(text)
    .map((name, index) => ({ id: `entry-${index}`, name }))
    .filter((entry) => {
      const name = entry.name.toLowerCase();
      if (dedupe && seen.has(name)) return false;
      seen.add(name);
      return !filter.trim() || name.includes(filter.trim().toLowerCase());
    });
}
export function eliminateEntries(text, participants, removedIds, dedupe = false) {
  const sourceIndexes = new Set(
    participants.filter((p) => removedIds.includes(p.id)).map((p) => Number(p.id.slice(6))),
  );
  const removedNames = new Set(
    participants.filter((p) => removedIds.includes(p.id)).map((p) => p.name.toLowerCase()),
  );
  const remaining = entryLines(text).filter(
    (name, i) => !sourceIndexes.has(i) && !(dedupe && removedNames.has(name.toLowerCase())),
  );
  return remaining.join("\n") + (remaining.some((x) => /[,;\t]/.test(x)) ? "\n" : "");
}
export function entryLines(text) {
  const raw = String(text || "");
  return (raw.includes("\n") ? raw.split(/\r?\n/) : raw.split(/[,;\t]/))
    .map((x) => x.trim())
    .filter(Boolean);
}
// Parse quoted CSV (including newlines) without treating commas inside a name as separators.
export function parseImport(content, filename = "") {
  const raw = String(content).replace(/^\uFEFF/, "");
  if (!filename.toLowerCase().endsWith(".csv")) {
    return raw.includes("\n")
      ? raw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
      : splitEntries(raw);
  }
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '"') {
      if (quoted && raw[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === "," || c === "\n" || c === "\r")) {
      row.push(cell.trim());
      cell = "";
      if (c !== ",") {
        rows.push(row);
        row = [];
        if (c === "\r" && raw[i + 1] === "\n") i++;
      }
    } else cell += c;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  if (cell || row.length) rows.push([...row, cell.trim()]);
  const header = rows[0]?.map((c) => c.toLowerCase());
  let nameCol = 0;
  let hasHeader = false;
  if (header && rows.length > 0) {
    const knownHeaders = [
      "name",
      "entry",
      "participant",
      "duck",
      "racer",
      "names",
      "entries",
      "participants",
      "ducks",
      "racers",
    ];
    const foundIdx = header.findIndex((h) => knownHeaders.includes(h));
    if (foundIdx >= 0) {
      nameCol = foundIdx;
      hasHeader = true;
    } else if (["rank", "pos", "position", "#", "place"].includes(header[0]) && header.length > 1) {
      nameCol = 1;
      hasHeader = true;
    }
  }
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const names = dataRows.map((r) => r[nameCol]).filter(Boolean);
  if (names.some((name) => /[\r\n]/.test(name)))
    throw new Error(
      "Entry names must fit on one line. Remove embedded line breaks from CSV names.",
    );
  return names;
}
export function csvCell(value) {
  const text = String(value ?? "");
  const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
