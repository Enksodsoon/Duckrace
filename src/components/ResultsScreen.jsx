import { ChevronDown, Download, Play, RotateCcw, Trophy } from "lucide-react";
import { Button, DuckIcon, Heading } from "./design.jsx";
import { COLORS } from "../lib/catalog.js";
import { placeLabel } from "../lib/raceUtils.js";
import { exportHistory, exportResults } from "../lib/exports.js";
export default function ResultsScreen({ session: s, navigate }) {
  const record = s.record || s.history[0]?.record;
  const ranked = record
    ? record.order
        .map((id) => record.participants.find((p) => p.id === id))
        .filter(Boolean)
    : [];
  return (
    <section className="results-screen">
      <Heading icon={Trophy} title="Results">
        {record
          ? `${record.participants.length} entries · ${record.drawMode === "seeded" ? "Seeded draw" : "Fresh draw"}`
          : "Your next winner is waiting."}
      </Heading>
      {record ? (
        <>
          <div className="results-panel panel">
            <div className="results-title">
              <Trophy size={40} />
              <div>
                <small>WINNER</small>
                <h2>{ranked[0]?.name}</h2>
              </div>
            </div>
            <ol className="result-list">
              {ranked.map((p, i) => (
                <li key={p.id} className={i < record.podiumCount ? `podium podium-${i}` : ""}>
                  <span className="result-place">{placeLabel(i)}</span>
                  <span className="duck-dot" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="result-name">{p.name}</span>
                  {i < record.podiumCount && <Trophy size={17} />}
                </li>
              ))}
            </ol>
            <div className="result-note">
              {record.eliminationPlaces.length
                ? `Elimination places: ${record.eliminationPlaces.map(placeLabel).join(", ")}`
                : "No elimination this round"}
            </div>
          </div>
          <div className="result-actions">
            <Button
              primary
              icon={Play}
              onClick={() => {
                s.cancel();
                navigate("setup");
              }}
            >
              Race Again
            </Button>
            <Button icon={RotateCcw} onClick={() => s.replay(record)}>
              Replay
            </Button>
            <Button icon={Download} onClick={() => exportResults(record)}>
              Results CSV
            </Button>
            <Button onClick={() => exportResults(record, true)}>Results XLS</Button>
            <Button icon={RotateCcw} disabled={!s.undo} onClick={s.undoElimination}>
              Undo Elimination
            </Button>
          </div>
        </>
      ) : (
        <div className="empty-results panel">
          <DuckIcon size={60} />
          <h2>No races yet</h2>
          <p>Enter your names and let the lake decide.</p>
          <Button primary icon={Play} onClick={() => navigate("setup")}>
            Set Up a Race
          </Button>
        </div>
      )}
      <details className="history panel">
        <summary>
          <Trophy size={17} />
          Race history <span>{s.history.length + s.legacyHistory.length}</span>
          <ChevronDown size={17} />
        </summary>
        <div className="history-content">
          <div className="button-row">
            <Button
              onClick={() => exportHistory(s.history, s.legacyHistory)}
              disabled={!s.history.length && !s.legacyHistory.length}
            >
              History JSON
            </Button>
            <Button
              onClick={() => exportHistory(s.history, s.legacyHistory, true)}
              disabled={!s.history.length && !s.legacyHistory.length}
            >
              Race log
            </Button>
          </div>
          {s.history.map((h, i) => (
            <div className="history-row" key={h.id}>
              <span>
                {new Date(h.createdAt).toLocaleString()}
                <small>
                  {h.record.participants.length} entries ·{" "}
                  {h.record.drawMode === "seeded" ? "Seeded" : "Fresh"}
                  {h.eliminationUndone ? " · elimination undone" : ""}
                </small>
              </span>
              <strong>{h.record.participants.find((p) => p.id === h.record.order[0])?.name}</strong>
              <Button onClick={() => s.replay(h.record)} aria-label={`Replay race ${i + 1}`}>
                Replay
              </Button>
            </div>
          ))}
          {s.legacyHistory.map((h, i) => (
            <div key={`legacy-${i}`} className="history-row">
              <span>
                {typeof h === "string"
                  ? h
                  : String(h?.summary || h?.winners?.join(", ") || "Earlier result")}
                <small>Legacy result — deterministic replay unavailable</small>
              </span>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
