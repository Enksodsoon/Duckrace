import { useMemo, useState } from "react";
import { Check, ChevronDown, Copy, Download, Play, RotateCcw, Trophy } from "lucide-react";
import { Button, DuckIcon, Heading } from "./design.jsx";
import { COLORS, STAGES } from "../lib/catalog.js";
import { formatResultsText, placeLabel } from "../lib/raceUtils.js";
import { exportHistory, exportResults } from "../lib/exports.js";

function ConfettiCelebration({ active, reducedMotion }) {
  if (!active || reducedMotion) return null;
  const particles = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: `${(i * 3.6) % 100}%`,
    delay: `${(i % 7) * 0.12}s`,
    bg: COLORS[i % COLORS.length],
    size: 7 + (i % 5),
    duration: `${1.6 + (i % 4) * 0.3}s`,
  }));
  return (
    <div className="confetti-container" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            backgroundColor: p.bg,
            width: p.size,
            height: p.size * 1.5,
          }}
        />
      ))}
    </div>
  );
}

export default function ResultsScreen({ session: s, navigate }) {
  const [copied, setCopied] = useState(false);
  const record = s.record || s.history[0]?.record;
  const ranked = useMemo(() => {
    if (!record) return [];
    const map = new Map(record.participants.map((p) => [p.id, p]));
    return record.order.map((id) => map.get(id)).filter(Boolean);
  }, [record]);

  const stageName = STAGES.find((x) => x.id === (record?.stage || s.settings.stage))?.name;

  async function handleCopy() {
    try {
      const text = formatResultsText(record, stageName);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      s.setNotice("Podium results copied to clipboard!");
    } catch {
      s.setNotice("Could not copy to clipboard.");
    }
  }

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
            <ConfettiCelebration active={Boolean(record)} reducedMotion={s.settings.reducedMotion} />
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
            <Button icon={copied ? Check : Copy} onClick={handleCopy}>
              {copied ? "Copied!" : "Copy Results"}
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
