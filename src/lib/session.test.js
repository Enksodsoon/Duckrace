import { describe, expect, it } from "vitest";
import { createRaceRecord } from "./raceEngine.js";
import {
  csvCell,
  eliminateEntries,
  getParticipants,
  loadSession,
  parseImport,
  STORAGE_KEY,
  validateSettings,
} from "./session.js";
describe("session compatibility and entry identity", () => {
  it("migrates v2 controls and keeps legacy history", () => {
    const old = {
      entriesText: "A\nB",
      duration: 7,
      podiumCountInput: "2",
      dedupeEntries: false,
      raceSeedInput: "test",
      eliminationPlaces: [0],
      raceLogs: [{ summary: "1st A" }],
      soundEnabled: true,
    };
    const data = loadSession({ getItem: (k) => (k.endsWith(":v2") ? JSON.stringify(old) : null) });
    expect(data.settings).toMatchObject({
      entriesText: "A\nB",
      duration: 7,
      podiumCount: 2,
      dedupe: false,
      seed: "test",
      eliminationPlaces: [0],
      sound: true,
    });
    expect(data.legacyHistory).toHaveLength(1);
    expect(data.history).toHaveLength(0);
  });
  it("restores valid records and ignores invalid records", () => {
    const record = createRaceRecord({ entries: ["A", "B"], seed: "x" });
    const value = JSON.stringify({
      settings: { entriesText: "Saved" },
      history: [
        { id: "ok", record },
        { id: "bad", record: {} },
      ],
    });
    const data = loadSession({ getItem: (k) => (k === STORAGE_KEY ? value : null) }, "?seed=");
    expect(data.history).toHaveLength(1);
    expect(data.settings.seed).toBe("");
  });
  it("recovers from blocked or malformed storage", () => {
    expect(loadSession(null).settings.entriesText).toContain("Group 1");
    expect(loadSession({ getItem: () => "{" }).notice).toContain("could not be read");
  });
  it("preserves exact duplicate occurrences and filtered-out names during elimination", () => {
    const text = "Same\nOther\nSame\nHidden";
    const participants = getParticipants(text, false, "Same");
    expect(participants.map((p) => p.id)).toEqual(["entry-0", "entry-2"]);
    expect(eliminateEntries(text, participants, ["entry-2"])).toBe("Same\nOther\nHidden");
  });
  it("does not silently truncate a 101-entry pool", () => {
    expect(
      getParticipants(Array.from({ length: 101 }, (_, i) => `Name ${i}`).join("\n")),
    ).toHaveLength(101);
  });
  it("elimination removes the logical deduplicated entry rather than resurrecting it", () => {
    const text = "Sam\nSAM\nLee";
    expect(eliminateEntries(text, getParticipants(text, true), ["entry-0"], true)).toBe("Lee");
  });
  it("reads CSV header, escaped commas and rejects malformed quote", () => {
    const names = parseImport('entry\r\n"Smith, Jane"\r\n"A ""quoted"" name"', "entries.csv");
    expect(names).toEqual(["Smith, Jane", 'A "quoted" name']);
    expect(getParticipants(names.join("\n") + "\n").map((p) => p.name)).toEqual(names);
    expect(() => parseImport('"Unfinished', "a.csv")).toThrow("unclosed");
    expect(() => parseImport('name\n"Alice\nBob"', "a.csv")).toThrow("one line");
  });
  it("preserves comma-containing names when importing multiline text files", () => {
    const textNames = parseImport("Smith, Jane\nDoe, John", "entries.txt");
    expect(textNames).toEqual(["Smith, Jane", "Doe, John"]);
    const singleLine = parseImport("Alpha, Beta, Gamma", "entries.txt");
    expect(singleLine).toEqual(["Alpha", "Beta", "Gamma"]);
  });
  it("correctly imports results.csv roundtrip and multi-column files", () => {
    const resultsCsv = '"rank","name"\n"1","Mallard Prime"\n"2","Pekin Swift"';
    expect(parseImport(resultsCsv, "results.csv")).toEqual(["Mallard Prime", "Pekin Swift"]);

    const multiCol = '"#","score","Participant"\n"1","99","Duck A"\n"2","88","Duck B"';
    expect(parseImport(multiCol, "data.csv")).toEqual(["Duck A", "Duck B"]);

    const noHeader = '"Racer 1","10"\n"Racer 2","20"';
    expect(parseImport(noHeader, "raw.csv")).toEqual(["Racer 1", "Racer 2"]);
  });
  it("neutralizes spreadsheet formulas, sorts elimination places and bounds saved settings", () => {
    expect(csvCell("=1+2")).toBe('"\'=1+2"');
    expect(
      validateSettings({
        duration: Infinity,
        podiumCount: 900,
        stage: "unknown",
        eliminationPlaces: [2, 0, 0, -1, 101],
      }),
    ).toMatchObject({
      duration: 15,
      podiumCount: 100,
      stage: "forest-lake",
      eliminationPlaces: [0, 2],
    });
  });
});
