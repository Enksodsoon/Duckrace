import {
  ArrowRight,
  ChevronDown,
  Download,
  Flag,
  Mountain,
  Play,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
} from "lucide-react";
import { Button, Field, Heading, Toggle } from "./design.jsx";
import { SAMPLE, STAGES } from "../lib/catalog.js";
import { placeLabel } from "../lib/raceUtils.js";
import { parseImport } from "../lib/session.js";
import { exportEntries } from "../lib/exports.js";
export function StartButtons({ session: s }) {
  return (
    <div className="start-actions">
      <Button primary icon={Play} onClick={() => s.start()} disabled={!!s.error || s.busy}>
        Start Race
      </Button>
      <Button icon={Shuffle} onClick={() => s.start(true)} disabled={!!s.error || s.busy}>
        Instant Pick
      </Button>
    </div>
  );
}
export default function SetupScreen({ session: s, navigate }) {
  const { settings: o, patch } = s;
  async function importFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error("Import must be smaller than 1 MB.");
      const names = parseImport(await file.text(), file.name);
      if (!names.length) throw new Error("No entries found in this file.");
      if (names.length > 100)
        throw new Error(
          `File contains ${names.length} entries. Maximum 100; nothing was imported.`,
        );
      patch({ entriesText: names.join("\n") + "\n", filter: "" });
      s.setNotice(`Imported ${names.length} entries.`);
    } catch (error) {
      s.setNotice(error.message);
    }
    e.target.value = "";
  }
  function generate() {
    const a = Number(o.numberStart),
      b = Number(o.numberEnd),
      length = Math.abs(b - a) + 1;
    if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || length > 100) {
      s.setNotice("Use whole numbers defining no more than 100 entries.");
      return;
    }
    patch({
      entriesText: Array.from({ length }, (_, i) => `${o.prefix}${Math.min(a, b) + i}`).join("\n"),
      filter: "",
    });
  }
  return (
    <section className="setup-layout">
      <div className="panel setup-panel">
        <Heading icon={Flag} title="Race Setup" />
        <div className="entry-heading">
          <label htmlFor="entries">
            Entries <span>({s.participants.length})</span>
          </label>
          <span className="muted">Up to 100</span>
        </div>
        <textarea
          id="entries"
          aria-label="Race entries"
          placeholder="One entry per line, or use commas"
          value={o.entriesText}
          onChange={(e) => patch({ entriesText: e.target.value })}
          spellCheck="false"
        />
        <div className="entry-tools">
          <label className="button import-button">
            <Download size={17} />
            Import List
            <input
              type="file"
              accept=".csv,.txt,text/plain,text/csv"
              aria-label="Import entries"
              onChange={importFile}
            />
          </label>
          <Toggle
            label="Remove duplicates"
            checked={o.dedupe}
            onChange={(dedupe) => patch({ dedupe })}
          />
        </div>
        <div className="form-stack">
          <Field label="Duration">
            <select
              aria-label="Race duration"
              value={o.duration}
              onChange={(e) => patch({ duration: Number(e.target.value) })}
            >
              {[3, 5, 7, 10, 15, 20, 25, 30].map((n) => (
                <option key={n} value={n}>
                  {n} seconds
                </option>
              ))}
            </select>
          </Field>
          <Field label="Winners">
            <input
              aria-label="Podium size"
              type="number"
              min="1"
              max="100"
              value={o.podiumCount}
              onChange={(e) => patch({ podiumCount: Number(e.target.value) })}
            />
          </Field>
          <Field label="Elimination">
            <select
              aria-label="Elimination rule"
              value={
                o.eliminationPlaces.length === 0
                  ? "none"
                  : o.eliminationPlaces.length === 1 && o.eliminationPlaces[0] === 0
                    ? "first"
                    : "custom"
              }
              onChange={(e) =>
                patch({
                  eliminationPlaces:
                    e.target.value === "none"
                      ? []
                      : e.target.value === "first"
                        ? [0]
                        : Array.from(
                            {
                              length: Math.min(
                                o.podiumCount,
                                s.participants.length || o.podiumCount,
                              ),
                            },
                            (_, i) => i,
                          ),
                })
              }
            >
              <option value="none">None</option>
              <option value="first">1st place</option>
              <option value="custom">Selected podium places</option>
            </select>
          </Field>
        </div>
        {s.error && <p className="validation">{s.error}</p>}
        <StartButtons session={s} />
        <details className="advanced">
          <summary>
            <SlidersHorizontal size={17} />
            Advanced options
            <ChevronDown size={16} />
          </summary>
          <div className="advanced-content">
            <Field label="Filter active entries">
              <input
                aria-label="Filter active entries"
                value={o.filter}
                onChange={(e) => patch({ filter: e.target.value })}
                placeholder="Search names"
              />
            </Field>
            {o.filter && (
              <p className="validation">
                Only matching names enter this draw. Clear the filter for the whole list.
              </p>
            )}
            <div className="number-generator">
              <input
                aria-label="Number start"
                placeholder="Start"
                value={o.numberStart}
                onChange={(e) => patch({ numberStart: e.target.value })}
              />
              <input
                aria-label="Number end"
                placeholder="End"
                value={o.numberEnd}
                onChange={(e) => patch({ numberEnd: e.target.value })}
              />
              <input
                aria-label="Number prefix"
                placeholder="Prefix"
                value={o.prefix}
                onChange={(e) => patch({ prefix: e.target.value })}
              />
              <Button onClick={generate}>Generate</Button>
            </div>
            <div className="button-row">
              <Button onClick={() => patch({ entriesText: SAMPLE, filter: "" })}>Sample</Button>
              <Button onClick={() => patch({ entriesText: "", filter: "" })}>Clear</Button>
              <Button onClick={() => exportEntries(s.participants)}>Export TXT</Button>
              <Button onClick={() => exportEntries(s.participants, true)}>Export CSV</Button>
            </div>
            <fieldset>
              <legend>Eliminate finishing places</legend>
              <div className="place-chips">
                {Array.from(
                  {
                    length: Math.min(
                      o.podiumCount,
                      s.participants.length || o.podiumCount,
                      100,
                    ),
                  },
                  (_, i) => (
                    <label key={i}>
                      <input
                        type="checkbox"
                        checked={o.eliminationPlaces.includes(i)}
                        onChange={() =>
                          patch({
                            eliminationPlaces: o.eliminationPlaces.includes(i)
                              ? o.eliminationPlaces.filter((x) => x !== i)
                              : [...o.eliminationPlaces, i],
                          })
                        }
                      />
                      {placeLabel(i)}
                    </label>
                  ),
                )}
              </div>
              <div className="button-row">
                <Button onClick={() => patch({ eliminationPlaces: [] })}>No elimination</Button>
                <Button onClick={() => patch({ eliminationPlaces: [0] })}>
                  Eliminate 1st only
                </Button>
              </div>
            </fieldset>
            <Field label="Race seed">
              <input
                aria-label="Race seed"
                placeholder="Leave empty for a fresh draw"
                value={o.seed}
                onChange={(e) => patch({ seed: e.target.value })}
              />
            </Field>
            <p className="muted">
              {o.seed.trim()
                ? "Seeded draw — the same entries and seed repeat the result."
                : "Fresh draw — every entry has an equal chance."}
            </p>
            <Button
              onClick={() =>
                patch({
                  seed: Array.from(window.crypto.getRandomValues(new Uint32Array(2)), (x) =>
                    x.toString(16).padStart(8, "0"),
                  ).join(""),
                })
              }
              icon={Shuffle}
            >
              Randomize seed
            </Button>
            <Toggle
              label="Shuffle presentation"
              checked={o.shuffle}
              onChange={(shuffle) => patch({ shuffle })}
            />
            <Button onClick={s.undoElimination} disabled={!s.undo} icon={RotateCcw}>
              Undo last elimination round
            </Button>
          </div>
        </details>
      </div>
      <div className="stage-dock panel">
        <Mountain size={24} />
        <div>
          <small>Selected stage</small>
          <h2>{(STAGES.find((x) => x.id === o.stage) || STAGES[0]).name}</h2>
        </div>
        <Button icon={ArrowRight} onClick={() => navigate("stages")}>
          Change Stage
        </Button>
      </div>
    </section>
  );
}
