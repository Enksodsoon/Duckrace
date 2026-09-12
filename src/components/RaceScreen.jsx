import { Camera, Expand, Flag, Trophy, Volume2, VolumeX, X } from "lucide-react";
import { Button, DuckIcon } from "./design.jsx";
import { COLORS, formatTime, STAGES } from "../lib/catalog.js";
import { StartButtons } from "./SetupScreen.jsx";
export default function RaceScreen({ session: s, setFollowId }) {
  const o = s.settings,
    record = s.record;
  const live = record
    ? s.frame.ranking.map((id) => record.participants.find((p) => p.id === id))
    : s.participants;
  const winner = record?.participants.find((p) => p.id === record.order[0]);
  return (
    <section className="race-screen" aria-label="Live race">
      <div className="race-hud">
        <div className="leaderboard panel">
          <div className="hud-label">
            {s.replaying ? "Replay" : s.phase === "finished" ? "Finish order" : "Live standings"}
          </div>
          <ol>
            {live.slice(0, o.compact ? 4 : 6).map((p, i) => (
              <li key={p.id} style={{ "--duck-color": COLORS[i % COLORS.length] }}>
                <span className="rank-number">{i + 1}</span>
                <DuckIcon size={19} />
                <button
                  onClick={() => {
                    setFollowId(p.id);
                    s.patch({ camera: "follow" });
                  }}
                  title={`Follow ${p.name}`}
                >
                  {p.name}
                </button>
                <span className="rank-progress">
                  {record
                    ? Math.floor(
                        s.frame.progress[record.participants.findIndex((x) => x.id === p.id)],
                      )
                    : 0}
                  %
                </span>
              </li>
            ))}
          </ol>
          {live.length > 6 && <span className="muted">{live.length} ducks racing</span>}
        </div>
        <div className="timer panel">
          <small>
            {s.phase === "finished"
              ? "Finished"
              : STAGES.find((x) => x.id === (record?.stage || o.stage))?.name}
          </small>
          <strong>{formatTime(s.frame.elapsedMs)}</strong>
          <span>
            {s.replaying ? "Replay" : record?.drawMode === "seeded" ? "Seeded draw" : "Fresh draw"}
          </span>
        </div>
      </div>
      {s.phase === "preparing" && (
        <div className="race-preparing panel" role="status">
          <strong>Preparing race…</strong>
          <p>Loading your ducks and stage.</p>
          <Button onClick={s.sceneFailed}>Continue without 3D</Button>
        </div>
      )}
      {s.countdown !== null && (
        <div className="countdown" aria-live="assertive">
          {s.countdown}
        </div>
      )}
      {!record && (
        <div className="race-ready panel">
          <h1>{s.audience ? "Audience Mode" : "Ready to race"}</h1>
          <p>
            {s.participants.length} entries · {o.duration} seconds
          </p>
          <StartButtons session={s} />
          <Button
            onClick={() => {
              s.setAudience(false);
              s.setScreen("setup");
            }}
          >
            Edit entries
          </Button>
        </div>
      )}
      {s.phase === "finished" && (
        <div className="winner-ribbon">
          <Trophy />
          <span>Winner</span>
          <strong>{winner?.name}</strong>
          <Button
            onClick={() => {
              s.setAudience(false);
              s.setScreen("results");
            }}
          >
            View Results
          </Button>
        </div>
      )}
      <div className="race-bottom">
        <div className="race-progress panel">
          <span>START</span>
          <div className="progress-track">
            {(record?.participants || s.participants).slice(0, 100).map((p, i) => (
              <span
                key={p.id}
                className="progress-duck"
                title={p.name}
                style={{
                  left: `${record ? s.frame.progress[i] : 0}%`,
                  color: COLORS[i % COLORS.length],
                  zIndex: i,
                }}
              >
                <DuckIcon size={21} />
              </span>
            ))}
          </div>
          <Flag size={24} />
        </div>
        <div className="race-toolbar">
          <label className="camera-control">
            <Camera size={18} />
            <select
              aria-label="Race camera"
              value={o.camera}
              onChange={(e) => s.patch({ camera: e.target.value })}
            >
              <option value="chase">Chase</option>
              <option value="overview">Overview</option>
              <option value="follow">Follow</option>
            </select>
          </label>
          <label className="follow-control">
            <span className="sr-only">Follow participant</span>
            <select
              aria-label="Follow participant"
              defaultValue=""
              onChange={(e) => {
                setFollowId(e.target.value);
                s.patch({ camera: "follow" });
              }}
            >
              <option value="" disabled>
                Follow a duck…
              </option>
              {(record?.participants || s.participants).map((p, i) => (
                <option key={p.id} value={p.id}>
                  {i + 1}. {p.name}
                </option>
              ))}
            </select>
          </label>
          <Button icon={o.sound ? Volume2 : VolumeX} onClick={() => s.patch({ sound: !o.sound })}>
            {o.sound ? "Sound on" : "Sound off"}
          </Button>
          <Button
            icon={Expand}
            onClick={() =>
              document.fullscreenElement
                ? document.exitFullscreen?.()
                : document.documentElement
                    .requestFullscreen?.()
                    .catch(() => s.setNotice("Fullscreen is unavailable."))
            }
          >
            Fullscreen
          </Button>
          <Button
            icon={X}
            onClick={() => {
              s.cancel();
              s.setAudience(false);
              s.setScreen("setup");
            }}
          >
            {s.busy ? "Cancel race" : "Exit"}
          </Button>
        </div>
      </div>
    </section>
  );
}
