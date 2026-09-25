import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRaceRecord, sampleRace, finishTailMs } from "./raceEngine.js";
import {
  DEFAULTS,
  STORAGE_KEY,
  eliminateEntries,
  getParticipants,
  loadSession,
  validateSettings,
} from "./session.js";
import { BREEDS } from "./catalog.js";
import { hashString } from "./raceUtils.js";

export default function useRaceSession() {
  const [initial] = useState(() => {
    try {
      return loadSession(window.localStorage, window.location.search);
    } catch {
      return loadSession(null, window.location.search);
    }
  });
  const [settings, setSettings] = useState(initial.settings);
  const [history, setHistory] = useState(initial.history);
  const [legacyHistory, setLegacyHistory] = useState(initial.legacyHistory);
  const [notice, setNotice] = useState(initial.notice);
  const [record, setRecord] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState("ready");
  const [countdown, setCountdown] = useState(null);
  const [undo, setUndo] = useState(null);
  const [replaying, setReplaying] = useState(false);
  const clock = useRef(null),
    tick = useRef(null),
    locked = useRef(false),
    audio = useRef(null);
  const rendererUnavailable = useRef(false);
  const sceneReady = useCallback((raceScene = false) => {
    rendererUnavailable.current = false;
    if (raceScene) clock.current?.begin?.();
  }, []);
  const sceneFailed = useCallback(() => {
    rendererUnavailable.current = true;
    clock.current?.begin?.();
  }, []);
  const audioSettings = useRef(settings);
  const rafProgressRef = useRef([]);
  useEffect(() => {
    audioSettings.current = settings;
  }, [settings]);
  const params = new URLSearchParams(window.location.search);
  const overlay = params.get("view") === "overlay";
  const [audience, setAudience] = useState(
    overlay || ["1", "true", "yes"].includes(String(params.get("audience")).toLowerCase()),
  );
  const [screen, setScreen] = useState(audience ? "race" : "home");
  const participants = useMemo(
    () => getParticipants(settings.entriesText, settings.dedupe, settings.filter),
    [settings.entriesText, settings.dedupe, settings.filter],
  );
  const appearances = useMemo(
    () =>
      participants.map((p) => ({
        breed: settings.mixedBreeds
          ? BREEDS[(hashString(p.name) + settings.appearanceRound) % BREEDS.length].id
          : settings.breed,
        accessory: settings.accessory,
      })),
    [
      participants,
      settings.mixedBreeds,
      settings.appearanceRound,
      settings.breed,
      settings.accessory,
    ],
  );
  const frame = useMemo(
    () =>
      record
        ? sampleRace(record, elapsed)
        : {
            progress: participants.map(() => 0),
            ranking: participants.map((p) => p.id),
            elapsedMs: 0,
            finished: false,
          },
    [record, elapsed, participants],
  );
  const busy = phase === "preparing" || phase === "countdown" || phase === "racing";
  const error =
    participants.length > 100
      ? `${participants.length} entries. Maximum 100 per race; edit the list to continue.`
      : !participants.length
        ? "Add at least one entry to start."
        : "";

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 3, settings, history, legacyHistory }),
      );
    } catch {
      window.setTimeout(() => {
        setNotice("Browser storage is unavailable or full. Export results to keep them.");
      }, 0);
    }
  }, [settings, history, legacyHistory]);
  useEffect(
    () => () => {
      if (tick.current) cancelAnimationFrame(tick.current);
      if (audio.current) audio.current.close().catch(() => {});
    },
    [],
  );

  function patch(values) {
    const allowed = locked.current
      ? Object.fromEntries(
          Object.entries(values).filter(([k]) =>
            ["camera", "quality", "sound", "volume", "channels", "reducedMotion"].includes(k),
          ),
        )
      : values;
    setSettings((s) => validateSettings({ ...s, ...allowed }));
  }
  function sound(kind, force = false) {
    const current = audioSettings.current;
    if (!current.sound && !force) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!audio.current || audio.current.state === "closed") audio.current = new Audio();
      const ctx = audio.current;
      const play = () => {
        const notes =
          kind === "finish" ? [523, 659, 784, 1046] : kind === "start" ? [440, 660] : [330];
        const minimal = current.soundPreset === "minimal";
        (minimal ? notes.slice(0, 1) : notes).forEach((freq, i) => {
          const osc = ctx.createOscillator(),
            gain = ctx.createGain(),
            at = ctx.currentTime + i * 0.12;
          const volume = Math.max(
            0.0001,
            (((0.08 * current.volume) / 100) * (current.channels[kind] ?? 100)) / 100,
          );
          osc.type = current.soundPreset === "sport" ? "triangle" : "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.0001, at);
          gain.gain.exponentialRampToValueAtTime(volume, at + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, at + (minimal ? 0.1 : 0.25));
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(at);
          osc.stop(at + (minimal ? 0.13 : 0.28));
        });
      };
      ctx
        .resume()
        .then(play)
        .catch(() => setNotice("Sound could not start. Tap Test sound to try again."));
    } catch {
      setNotice("Audio is unavailable in this browser.");
    }
  }
  function complete(run) {
    if (run.completed) return;
    run.completed = true;
    locked.current = false;
    setPhase("finished");
    setCountdown(null);
    if (!run.replay) {
      const ids = run.record.eliminationPlaces.map((p) => run.record.order[p]);
      const nextText = ids.length
        ? eliminateEntries(run.sourceText, run.record.participants, ids, run.dedupe)
        : run.sourceText;
      const row = {
        id: window.crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        record: run.record,
        eliminatedIds: ids,
      };
      setHistory((h) => [row, ...h].slice(0, 40));
      if (ids.length) setUndo({ before: run.sourceText, after: nextText, historyId: row.id });
      setSettings((s) => ({
        ...s,
        entriesText: nextText,
        appearanceRound: s.reroll ? (s.appearanceRound + 1) % 1000000 : s.appearanceRound,
      }));
      sound("finish");
    }
    if (!audience) setScreen("results");
  }
  function animate(run) {
    const loop = (now) => {
      if (clock.current !== run) return;
      const time = now - run.start;
      if (time < 0) {
        const n = Math.ceil(-time / 1000);
        if (n !== run.lastCount) {
          run.lastCount = n;
          setCountdown(n);
          sound("countdown");
        }
      } else {
        if (!run.started) {
          run.started = true;
          setCountdown(null);
          setPhase("racing");
          sound("start");
        }
        const second = Math.floor(time / 2000);
        if (second !== run.lastSound) {
          run.lastSound = second;
          sound("race");
        }
        rafProgressRef.current = sampleRace(run.record, time).progress;
        if (!run.lastUi || now - run.lastUi >= 33 || time >= run.record.durationMs) {
          run.lastUi = now;
          setElapsed(time);
        }
        if (time >= run.record.durationMs + finishTailMs(run.record)) {
          setElapsed(time);
          complete(run);
          tick.current = null;
          return;
        }
      }
      tick.current = requestAnimationFrame(loop);
    };
    tick.current = requestAnimationFrame(loop);
  }
  function start(instant = false) {
    if (locked.current) return;
    if (error) {
      setNotice(error);
      setScreen("setup");
      return;
    }
    try {
      const next = createRaceRecord({
        entries: participants,
        seed: settings.seed.trim(),
        duration: settings.duration,
        podiumCount: Math.min(settings.podiumCount, participants.length),
        eliminationPlaces: settings.eliminationPlaces.filter(
          (p) => p < Math.min(settings.podiumCount, participants.length),
        ),
        stage: settings.stage,
        appearances,
        presentationShuffle: settings.shuffle,
      });
      const run = {
        record: next,
        sourceText: settings.entriesText,
        dedupe: settings.dedupe,
        start: performance.now() + (instant ? 0 : 3000),
        replay: false,
        completed: false,
      };
      locked.current = !instant;
      clock.current = run;
      setRecord(next);
      setElapsed(instant ? next.durationMs + 2000 : 0);
      setReplaying(false);
      setNotice("");
      if (instant) complete(run);
      else {
        run.begin = () => {
          if (clock.current !== run || run.presentationStarted) return;
          run.presentationStarted = true;
          run.start = performance.now() + 3000;
          setPhase("countdown");
          setCountdown(3);
          animate(run);
        };
        setScreen("race");
        setPhase("preparing");
        setCountdown(null);
        if (rendererUnavailable.current || (audience && settings.chroma)) run.begin();
      }
    } catch (e) {
      locked.current = false;
      setNotice(e.message);
    }
  }
  function cancel() {
    if (tick.current) cancelAnimationFrame(tick.current);
    clock.current = null;
    locked.current = false;
    setPhase("ready");
    setCountdown(null);
    setElapsed(0);
    setRecord(null);
    setReplaying(false);
  }
  function replay(target = history[0]?.record) {
    if (!target || locked.current) return;
    const run = { record: target, start: performance.now(), replay: true, completed: false };
    locked.current = true;
    clock.current = run;
    run.begin = () => {
      if (clock.current !== run || run.presentationStarted) return;
      run.presentationStarted = true;
      run.start = performance.now();
      setPhase("racing");
      animate(run);
    };
    setRecord(target);
    setElapsed(0);
    setReplaying(true);
    setScreen("race");
    setPhase("preparing");
    if (rendererUnavailable.current || (audience && settings.chroma)) run.begin();
  }
  function undoElimination() {
    if (!undo || busy) return;
    if (settings.entriesText !== undo.after) {
      setNotice(
        "Entries changed since elimination. Undo would overwrite those edits. Export the current list, then restore eliminated names from the race history if needed.",
      );
      return;
    }
    setSettings((s) => ({ ...s, entriesText: undo.before }));
    setHistory((h) =>
      h.map((x) => (x.id === undo.historyId ? { ...x, eliminationUndone: true } : x)),
    );
    setUndo(null);
    setNotice("Elimination undone. Entries restored.");
  }
  function clearSaved() {
    cancel();
    try {
      for (const k of [STORAGE_KEY, "duck-race-randomizer:v2", "duck-race-randomizer:v1"])
        window.localStorage.removeItem(k);
    } catch {
      /* Storage may be disabled. */
    }
    setSettings({ ...DEFAULTS });
    setHistory([]);
    setLegacyHistory([]);
    setUndo(null);
    setNotice("Saved session cleared.");
  }
  const actionsRef = useRef({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    actionsRef.current = { start, busy, setAudience, setSettings };
  });
  useEffect(() => {
    const keydown = (e) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target?.tagName)
      )
        return;
      const { start: runStart, busy: isBusy, setAudience: updateAudience, setSettings: updateSettings } = actionsRef.current;
      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        runStart();
      }
      if (e.key.toLowerCase() === "i") {
        e.preventDefault();
        runStart(true);
      }
      if (e.key.toLowerCase() === "m") updateSettings((s) => ({ ...s, sound: !s.sound }));
      if (e.key === "Escape" && !isBusy) updateAudience(false);
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  return {
    settings,
    patch,
    history,
    legacyHistory,
    notice,
    setNotice,
    record,
    frame,
    phase,
    countdown,
    busy,
    error,
    participants,
    appearances,
    start,
    cancel,
    replay,
    replaying,
    undo,
    undoElimination,
    clearSaved,
    screen,
    setScreen,
    audience,
    setAudience,
    overlay,
    sound,
    sceneReady,
    sceneFailed,
    rafProgressRef,
  };
}
