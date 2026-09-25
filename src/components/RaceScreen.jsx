import { memo, useEffect, useMemo, useState } from "react";
import { Camera, Expand, Flag, Minimize, Pause, Play, Trophy, Volume2, VolumeX, X } from "lucide-react";
import { Button, DuckIcon } from "./design.jsx";
import { COLORS, formatTime, STAGES } from "../lib/catalog.js";
import { StartButtons } from "./SetupScreen.jsx";

const ProgressDuck = memo(function ProgressDuck({ name, index, progress }) {
  return (
    <span
      className="progress-duck"
      title={name}
      style={{
        left: `${progress}%`,
        color: COLORS[index % COLORS.length],
        zIndex: index,
      }}
    >
      <DuckIcon size={21} />
    </span>
  );
});

const LeaderboardRow = memo(function LeaderboardRow({ p, rank, color, onFollow }) {
  return (
    <li style={{ "--duck-color": color }}>
      <span className="rank-number">{rank}</span>
      <DuckIcon size={19} />
      <button onClick={onFollow} title={`Follow ${p.name}`}>
        {p.name}
      </button>
      <span className="rank-progress">
        {Math.floor(p.progress || 0)}%
      </span>
    </li>
  );
});

export default function RaceScreen({ session: s, followId, setFollowId }) {
  const o = s.settings,
    record = s.record;
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== "undefined" && Boolean(document.fullscreenElement),
  );
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const participantsList = record?.participants || s.participants;
  const participantMap = useMemo(
    () => new Map(participantsList.map((p, idx) => [p.id, { ...p, index: idx }])),
    [participantsList],
  );

  const displayLimit = o.compact ? 4 : 6;
  const live = useMemo(() => {
    if (!record) return participantsList.slice(0, displayLimit).map((p) => ({ ...p, progress: 0 }));
    return s.frame.ranking.slice(0, displayLimit).map((id) => {
      const p = participantMap.get(id);
      return p ? { ...p, progress: s.frame.progress[p.index] || 0 } : null;
    }).filter(Boolean);
  }, [record, s.frame.ranking, s.frame.progress, displayLimit, participantMap, participantsList]);

  const followOptions = useMemo(
    () =>
      participantsList.map((p, i) => (
        <option key={p.id} value={p.id}>
          {i + 1}. {p.name}
        </option>
      )),
    [participantsList],
  );

  const totalDucksRacing = record ? record.participants.length : s.participants.length;
  const winner = record?.participants.find((p) => p.id === record.order[0]);
  return (
    <section className="race-screen" aria-label="Live race">
      <div className="race-hud">
        <div className="leaderboard panel">
          <div className="hud-label">
            {s.replaying ? "Replay" : s.phase === "finished" ? "Finish order" : "Live standings"}
          </div>
          <ol>
            {live.map((p, i) => (
              <LeaderboardRow
                key={p.id}
                p={p}
                rank={i + 1}
                color={COLORS[i % COLORS.length]}
                onFollow={() => {
                  setFollowId(p.id);
                  s.patch({ camera: "follow" });
                }}
              />
            ))}
          </ol>
          {totalDucksRacing > 6 && <span className="muted">{totalDucksRacing} ducks racing</span>}
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
      {s.paused && (
        <div className="race-paused-overlay panel" role="alert">
          <h2>Race Paused</h2>
          <p>Press Space or click Resume to continue</p>
          <Button primary icon={Play} onClick={s.resume}>
            Resume Race
          </Button>
        </div>
      )}
      <div className="race-bottom">
        <div className="race-progress panel">
          <span>START</span>
          <div className="progress-track">
            {participantsList.slice(0, 100).map((p, i) => (
              <ProgressDuck
                key={p.id}
                name={p.name}
                index={i}
                progress={record && s.frame.progress[i] != null ? Math.round(s.frame.progress[i]) : 0}
              />
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
              value={followId || ""}
              onChange={(e) => {
                setFollowId(e.target.value);
                s.patch({ camera: "follow" });
              }}
            >
              <option value="" disabled>
                Follow a duck…
              </option>
              {followOptions}
            </select>
          </label>
          {s.busy && (
            <Button
              icon={s.paused ? Play : Pause}
              onClick={s.togglePause}
              title={s.paused ? "Resume race (Space)" : "Pause race (Space)"}
            >
              {s.paused ? "Resume" : "Pause"}
            </Button>
          )}
          <Button icon={o.sound ? Volume2 : VolumeX} onClick={() => s.patch({ sound: !o.sound })}>
            {o.sound ? "Sound on" : "Sound off"}
          </Button>
          <Button
            icon={isFullscreen ? Minimize : Expand}
            onClick={() =>
              document.fullscreenElement
                ? document.exitFullscreen?.()
                : document.documentElement
                    .requestFullscreen?.()
                    .catch(() => s.setNotice("Fullscreen is unavailable."))
            }
          >
            {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
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
