import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Home, Menu, Mountain, Play, Settings, Trophy, X } from "lucide-react";
import useRaceSession from "./lib/useRaceSession.js";
import { BREEDS, STAGES } from "./lib/catalog.js";
import { hashString } from "./lib/raceUtils.js";
import { Button, DuckIcon } from "./components/design.jsx";
import SceneBoundary from "./components/SceneBoundary.jsx";
import SetupScreen from "./components/SetupScreen.jsx";
import { GarageScreen, StagesScreen } from "./components/CollectionScreens.jsx";
import ResultsScreen from "./components/ResultsScreen.jsx";
import RaceScreen from "./components/RaceScreen.jsx";
import SettingsScreen from "./components/SettingsScreen.jsx";
const DuckScene = lazy(() => import("./scene/DuckScene.jsx"));
const NAV = [
  ["setup", "Play Race", Play],
  ["garage", "Duck Garage", DuckIcon],
  ["stages", "Stages", Mountain],
  ["results", "Results", Trophy],
  ["settings", "Settings", Settings],
];
export default function App() {
  const s = useRaceSession(),
    o = s.settings;
  const [menu, setMenu] = useState(false),
    [sceneState, setSceneState] = useState("loading"),
    [sceneError, setSceneError] = useState(""),
    [sceneKey, setSceneKey] = useState(0),
    [followId, setFollowId] = useState(null);
  const [systemMotion, setSystemMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const { sceneReady, sceneFailed } = s;
  const sceneFailure = useRef(false);
  const onReady = useCallback(
    (info) => {
      if (sceneFailure.current) return;
      setSceneState("ready");
      sceneReady(info?.screen === "race");
    },
    [sceneReady],
  );
  const onLoading = useCallback(() => {
    if (!sceneFailure.current) setSceneState("loading");
  }, []);
  const onError = useCallback(
    (e) => {
      sceneFailure.current = true;
      setSceneState("error");
      setSceneError(e?.message || "3D rendering is unavailable.");
      sceneFailed();
    },
    [sceneFailed],
  );
  const onMetrics = useCallback((metrics) => {
    document.documentElement.dataset.graphicsTier = metrics.quality || "";
    document.documentElement.dataset.fps = String(Math.round(metrics.fps));
    document.documentElement.dataset.graphicsMetrics = JSON.stringify(metrics);
  }, []);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setSystemMotion(m.matches);
    m.addEventListener("change", change);
    return () => m.removeEventListener("change", change);
  }, []);
  const chroma = s.audience && o.chroma;
  const navigate = (screen) => {
    if (s.busy) return;
    s.setScreen(screen);
    setMenu(false);
  };
  const sceneRecord =
    s.screen === "results"
      ? s.record || s.history[0]?.record
      : s.screen === "race"
        ? s.record
        : null;
  const sceneData = useMemo(() => {
    if (!sceneRecord && s.screen !== "race")
      return {
        participants: [{ id: "preview", name: BREEDS.find((b) => b.id === o.breed).name }],
        appearances: [{ breed: o.breed, accessory: o.accessory }],
        progress: [],
      };
    if (!sceneRecord)
      return {
        participants: s.participants.slice(0, 100),
        appearances: s.appearances.slice(0, 100),
        progress: [],
      };
    if (s.screen === "results") {
      const winner = sceneRecord.participants.findIndex((p) => p.id === sceneRecord.order[0]);
      return {
        participants: [sceneRecord.participants[winner] || { id: "winner", name: "Winner" }],
        appearances: [sceneRecord.appearances?.[winner] || { breed: o.breed, accessory: o.accessory }],
        progress: [100],
      };
    }
    const indices = sceneRecord.participants.map((_, i) => i);
    if (sceneRecord.presentationShuffle)
      indices.sort(
        (a, b) =>
          hashString(`${sceneRecord.presentationSeed}:${sceneRecord.participants[a].id}`) -
          hashString(`${sceneRecord.presentationSeed}:${sceneRecord.participants[b].id}`),
      );
    const recAppearances =
      sceneRecord.appearances?.length === sceneRecord.participants.length
        ? sceneRecord.appearances
        : sceneRecord.participants.map(() => ({ breed: o.breed, accessory: o.accessory }));
    return {
      participants: indices.map((i) => sceneRecord.participants[i]),
      appearances: indices.map((i) => recAppearances[i]),
      indices,
    };
  }, [s.screen, s.participants, s.appearances, sceneRecord, o.breed, o.accessory]);
  const sceneProgress = useMemo(
    () =>
      sceneData.indices
        ? sceneData.indices.map((i) => s.frame.progress[i])
        : sceneData.progress,
    [sceneData.indices, sceneData.progress, s.frame.progress],
  );
  return (
    <div
      className={`app screen-${s.screen} ${s.audience ? "audience" : ""} ${o.compact ? "compact" : ""} ${chroma ? "chroma" : ""}`}
    >
      <a href="#main-content" className="skip-link">
        Skip to controls
      </a>
      <div
        className="scene-layer"
        aria-label="Real 3D duck race track"
        data-stage={sceneRecord?.stage || o.stage}
        data-phase={s.phase}
        data-racing={s.busy ? "true" : "false"}
        data-winner-progress={s.phase === "finished" ? "100" : "0"}
        data-scene-state={sceneState}
      >
        {!chroma && (
          <SceneBoundary key={sceneKey} onError={onError}>
            <Suspense fallback={null}>
              <DuckScene
                preparing={s.phase === "preparing"}
                screen={s.screen}
                stage={sceneRecord?.stage || o.stage}
                {...sceneData}
                progress={sceneProgress}
                isRacing={s.phase === "racing"}
                finished={s.phase === "finished" || (s.screen === "results" && !!sceneRecord)}
                cameraMode={o.camera}
                followId={followId}
                quality={o.quality}
                reducedMotion={o.reducedMotion || systemMotion}
                onLoading={onLoading}
                onReady={onReady}
                onError={onError}
                onMetrics={onMetrics}
              />
            </Suspense>
          </SceneBoundary>
        )}
      </div>
      <div className="scene-vignette" aria-hidden="true" />
      {!s.audience && (
        <header className="topbar">
          <button className="brand" onClick={() => navigate("home")} disabled={s.busy}>
            <DuckIcon size={30} />
            <span>Duck Race</span>
          </button>
          <nav aria-label="Main navigation" className={menu ? "nav open" : "nav"}>
            <button
              className={s.screen === "home" ? "active" : ""}
              onClick={() => navigate("home")}
              disabled={s.busy}
            >
              <Home size={17} />
              Home
            </button>
            {NAV.map(([id, label, Icon]) => (
              <button
                key={id}
                className={s.screen === id ? "active" : ""}
                onClick={() => navigate(id)}
                disabled={s.busy}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </nav>
          <button
            className="icon-button menu-toggle"
            aria-label={menu ? "Close menu" : "Open menu"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </header>
      )}
      <main id="main-content">
        {s.screen === "home" && (
          <section className="home-panel">
            <div className="timber-title">
              <DuckIcon size={53} />
              <h1>Duck Race</h1>
            </div>
            <div className="home-menu">
              {NAV.map(([id, label, Icon], i) => (
                <Button key={id} primary={!i} icon={Icon} onClick={() => navigate(id)}>
                  {label}
                </Button>
              ))}
            </div>
            <div className="home-caption">
              <span className="hairline" />
              <span>{(STAGES.find((x) => x.id === o.stage) || STAGES[0]).name}</span>
            </div>
          </section>
        )}
        {s.screen === "setup" && <SetupScreen session={s} navigate={navigate} />}
        {s.screen === "stages" && <StagesScreen session={s} navigate={navigate} />}
        {s.screen === "garage" && <GarageScreen session={s} navigate={navigate} />}
        {s.screen === "results" && <ResultsScreen session={s} navigate={navigate} />}
        {s.screen === "race" && <RaceScreen session={s} followId={followId} setFollowId={setFollowId} />}
        {s.screen === "settings" && (
          <SettingsScreen session={s} navigate={navigate} systemMotion={systemMotion} />
        )}
      </main>
      {!chroma && sceneState === "loading" && (
        <div className="loading-label">
          <span className="loading-ring" />
          Loading 3D scenery…
        </div>
      )}
      {!chroma && sceneState === "error" && (
        <div className="scene-error panel" role="alert">
          <strong>3D view unavailable</strong>
          <p>{sceneError} Your entries and randomizer remain available.</p>
          <div className="button-row">
            <Button
              onClick={async () => {
                try {
                  const { clearFailedSceneLoads } = await import("./lib/retryScene.js");
                  clearFailedSceneLoads(
                    s.screen,
                    sceneData.participants,
                    sceneData.appearances,
                    sceneRecord?.stage || o.stage,
                  );
                  sceneFailure.current = false;
                  setSceneState("loading");
                  setSceneKey((k) => k + 1);
                } catch (error) {
                  onError(error);
                }
              }}
            >
              Retry 3D
            </Button>
            <Button onClick={() => navigate("setup")}>Use randomizer</Button>
          </div>
        </div>
      )}
      {s.notice && (
        <div className="notice" role="status">
          <span>{s.notice}</span>
          <button aria-label="Dismiss notice" onClick={() => s.setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {s.phase === "finished" && s.record
          ? `Winner: ${s.record.participants.find((p) => p.id === s.record.order[0])?.name}`
          : s.phase === "racing"
            ? "Race in progress"
            : ""}
      </div>
      {s.screen !== "race" && (
        <footer className="site-footer">
          <span>
            <DuckIcon size={16} />
            Duck Race Randomizer
          </span>
          <span>Every entry. Equal odds.</span>
        </footer>
      )}
    </div>
  );
}
