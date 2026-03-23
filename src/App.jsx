
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Shuffle,
  RotateCcw,
  Expand,
  Minimize,
  Trophy,
  Medal,
  Volume2,
  VolumeX,
  Sparkles,
  LayoutDashboard,
  Flag,
  Shirt,
  Dice6,
  Download,
  Upload,
  SlidersHorizontal,
  History,
} from "lucide-react";

const SAMPLE = `Group 1
Group 2
Group 3
Group 4
Group 5
Group 6`;

const STORAGE_KEY = "duck-race-randomizer:v1";
const RESULTS_EXPORT_HEADERS = ["rank", "name"];

function parseBooleanParam(value, fallback = false) {
  if (value == null) return fallback;
  const normalized = String(value).toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function seededShuffle(arr, rng) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function toCsvRow(values) {
  return values
    .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
    .join(",");
}

function parseCsvOrTextEntries(content) {
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

function downloadText(filename, content, type = "text/plain;charset=utf-8") {
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

function splitEntries(text) {
  return String(text || "")
    .split(/[\n,;\t]+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function placeLabel(index) {
  const n = index + 1;
  const mod10 = n % 10;
  const mod100 = n % 100;
  let suffix = "th";
  if (mod10 === 1 && mod100 !== 11) suffix = "st";
  else if (mod10 === 2 && mod100 !== 12) suffix = "nd";
  else if (mod10 === 3 && mod100 !== 13) suffix = "rd";
  return `${n}${suffix}`;
}

function removeManyOccurrences(list, values) {
  const remaining = [...list];
  for (const value of values) {
    const index = remaining.indexOf(value);
    if (index !== -1) remaining.splice(index, 1);
  }
  return remaining;
}

function hashString(value) {
  const input = String(value || "");
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

function buildDuckVariant(name, styleSeed = 0) {
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

function getPlaceColors(place) {
  if (place === 0) return { border: "#fde68a", bg: "#fffbeb", chipBg: "#fef3c7", chipText: "#92400e" };
  if (place === 1) return { border: "#d1d5db", bg: "#f9fafb", chipBg: "#e5e7eb", chipText: "#374151" };
  if (place === 2) return { border: "#fdba74", bg: "#fff7ed", chipBg: "#fed7aa", chipText: "#9a3412" };
  return { border: "#bae6fd", bg: "#f0f9ff", chipBg: "#e0f2fe", chipText: "#0c4a6e" };
}

function getArenaMetrics(count, audience) {
  const safeCount = Math.max(1, count);
  if (audience) {
    const topPct = safeCount <= 8 ? 20 : safeCount <= 14 ? 17 : 15;
    const bottomPct = 7;
    const laneStepPct = (100 - topPct - bottomPct) / safeCount;
    const duckScale = safeCount <= 6 ? 0.9 : safeCount <= 10 ? 0.78 : safeCount <= 16 ? 0.68 : 0.58;
    return {
      topPct,
      bottomPct,
      laneStepPct,
      duckScale,
      labelSize: safeCount <= 8 ? 18 : safeCount <= 14 ? 15 : 12,
      percentSize: safeCount <= 8 ? 15 : safeCount <= 14 ? 13 : 11,
      heightStyle: { height: "calc(100vh - 180px)" },
      startX: 11,
      finishX: 91,
    };
  }
  const topPct = 20;
  const bottomPct = 8;
  const laneStepPct = (100 - topPct - bottomPct) / safeCount;
  const duckScale = safeCount <= 6 ? 0.82 : safeCount <= 10 ? 0.74 : safeCount <= 16 ? 0.64 : 0.56;
  const heightPx = Math.max(340, Math.min(680, 180 + safeCount * 38));
  return {
    topPct,
    bottomPct,
    laneStepPct,
    duckScale,
    labelSize: safeCount <= 8 ? 15 : safeCount <= 14 ? 13 : 12,
    percentSize: safeCount <= 8 ? 13 : 11,
    heightStyle: { height: `${heightPx}px` },
    startX: 12,
    finishX: 90,
  };
}

function baseButton(kind = "primary") {
  const styles = {
    primary: { background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)", color: "#fff", border: "1px solid #1e3a8a" },
    secondary: { background: "#eff6ff", color: "#0f172a", border: "1px solid #bfdbfe" },
    outline: { background: "#fff", color: "#1e293b", border: "1px solid #dbe7ff" },
    light: { background: "rgba(255,255,255,0.92)", color: "#0f172a", border: "1px solid rgba(255,255,255,0.95)" },
  };
  return {
    ...styles[kind],
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13,
    letterSpacing: "0.01em",
    boxShadow: kind === "primary" ? "0 10px 24px rgba(30,64,175,0.26)" : "none",
  };
}

function pill(bg = "#fff", color = "#334155", border = "#e2e8f0") {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: `1px solid ${border}`,
    background: bg,
    color,
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 700,
  };
}

function card() {
  return {
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e5edff",
    borderRadius: 18,
    boxShadow: "0 18px 44px rgba(15,23,42,0.08)",
    backdropFilter: "blur(10px)",
  };
}

function glassCard(tint = "rgba(8, 145, 178, 0.18)") {
  return {
    background: tint,
    border: "1px solid rgba(255,255,255,0.22)",
    borderRadius: 28,
    boxShadow: "0 24px 60px rgba(2, 32, 43, 0.22)",
    backdropFilter: "blur(12px)",
  };
}

function inputStyle() {
  return {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #cfe0ff",
    padding: "10px 12px",
    background: "#f8fbff",
    color: "#0f172a",
  };
}

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 52,
        height: 30,
        borderRadius: 999,
        border: "1px solid #cbd5e1",
        background: disabled ? "#e5e7eb" : checked ? "#0f172a" : "#fff",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 25 : 3,
          width: 22,
          height: 22,
          borderRadius: 999,
          background: checked ? "#fff" : "#cbd5e1",
          transition: "all 0.2s ease",
        }}
      />
    </button>
  );
}

function Range({ min, max, step, value, onChange }) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: "100%" }}
    />
  );
}

function CountdownOverlay({ value, audience }) {
  if (value === null) return null;
  return (
    <div style={{
      position: "absolute",
      inset: 0,
      zIndex: 40,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 32,
      background: "rgba(2,6,23,0.45)",
      backdropFilter: "blur(2px)",
    }}>
      <div style={{ display: "grid", justifyItems: "center", gap: 8 }}>
        <div style={{ fontSize: audience ? 120 : 84, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{value}</div>
        <div style={pill("rgba(255,255,255,0.1)", "#fff", "rgba(255,255,255,0.2)")}>Race starts now</div>
      </div>
    </div>
  );
}

function WinnerBanner({ name, show, audience }) {
  if (!show || !name) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: audience ? 20 : 16, zIndex: 30, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{
        margin: "0 16px",
        padding: "16px 24px",
        background: "rgba(255,255,255,0.88)",
        border: "1px solid #fde68a",
        borderRadius: 32,
        boxShadow: "0 24px 80px rgba(15,23,42,0.18)",
        maxWidth: audience ? 980 : 700,
        width: "fit-content",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: audience ? 15 : 12, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: "#d97706" }}>Winner</div>
          <div style={{ marginTop: 4, fontWeight: 900, color: "#0f172a", fontSize: audience ? 58 : 34, lineHeight: 1.05 }}>{name}</div>
        </div>
      </div>
    </div>
  );
}

function DuckAccessory({ variant }) {
  if (variant.accessory === "cap") {
    return <>
      <div style={{ position: "absolute", left: 40, top: -2, width: 20, height: 10, borderRadius: "12px 12px 4px 4px", background: variant.palette.accent }} />
      <div style={{ position: "absolute", left: 32, top: 6, width: 24, height: 4, borderRadius: 999, background: variant.palette.accentSoft }} />
    </>;
  }
  if (variant.accessory === "scarf") {
    return <>
      <div style={{ position: "absolute", left: 37, top: 28, width: 24, height: 8, borderRadius: 999, background: variant.palette.accent }} />
      <div style={{ position: "absolute", left: 49, top: 34, width: 5, height: 13, borderRadius: 999, background: variant.palette.accentSoft }} />
    </>;
  }
  if (variant.accessory === "glasses") {
    return <>
      <div style={{ position: "absolute", left: 56, top: 11, width: 10, height: 10, borderRadius: 999, border: "1px solid rgba(51,65,85,0.75)", background: "rgba(255,255,255,0.35)" }} />
      <div style={{ position: "absolute", left: 64, top: 11, width: 10, height: 10, borderRadius: 999, border: "1px solid rgba(51,65,85,0.75)", background: "rgba(255,255,255,0.35)" }} />
      <div style={{ position: "absolute", left: 62, top: 15, width: 4, height: 1, background: "rgba(51,65,85,0.75)" }} />
    </>;
  }
  if (variant.accessory === "bow") {
    return <>
      <div style={{ position: "absolute", left: 58, top: 2, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: "8px solid #f472b6" }} />
      <div style={{ position: "absolute", left: 66, top: 2, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: "8px solid #f472b6" }} />
      <div style={{ position: "absolute", left: 64, top: 9, width: 8, height: 8, borderRadius: 999, background: "#ec4899" }} />
    </>;
  }
  return null;
}

function DuckPattern({ variant }) {
  if (variant.pattern === "spot") {
    return <>
      <div style={{ position: "absolute", left: 20, top: 24, width: 6, height: 6, borderRadius: 999, background: variant.palette.accent }} />
      <div style={{ position: "absolute", left: 32, top: 30, width: 6, height: 6, borderRadius: 999, background: variant.palette.accentSoft }} />
      <div style={{ position: "absolute", left: 44, top: 26, width: 6, height: 6, borderRadius: 999, background: variant.palette.accent }} />
    </>;
  }
  if (variant.pattern === "stripe") {
    return <>
      <div style={{ position: "absolute", left: 24, top: 22, width: 4, height: 28, borderRadius: 999, transform: "rotate(18deg)", opacity: 0.75, background: variant.palette.accent }} />
      <div style={{ position: "absolute", left: 36, top: 22, width: 4, height: 28, borderRadius: 999, transform: "rotate(18deg)", opacity: 0.55, background: variant.palette.accentSoft }} />
    </>;
  }
  return null;
}

function DuckSprite({ winner, place, active, progress, index, scale, variant, motionTime }) {
  const seed = index * 0.9 + 1;
  const motion = active ? motionTime * 0.01 : progress * 0.6;
  const bob = active ? Math.sin(motion * 0.7 + seed) * 2.2 : 0;
  const tilt = active ? Math.sin(motion * 0.35 + seed) * 2.1 : 0;
  const wing = active ? Math.sin(motion * 1.15 + seed) * 7 : 0;
  const legA = active ? Math.sin(motion * 1.15 + seed) * 5 : 0;
  const legB = active ? Math.sin(motion * 1.15 + seed + Math.PI) * 5 : 0;
  const shadowScale = 0.94 + Math.abs(Math.sin(motion * 0.35 + seed)) * 0.08;
  const speedStretch = active ? 1 + Math.abs(Math.sin(motion * 0.9 + seed)) * 0.06 : 1;
  const isPodium = place > -1;

  return (
    <div style={{
      position: "absolute",
      left: 0,
      top: 0,
      transform: `translate(-50%, calc(-50% - ${bob}px)) scale(${scale}) rotate(${tilt * variant.tiltAccent}deg) skewX(${tilt * 0.35}deg) scaleX(${speedStretch})`,
      transformOrigin: "center center",
      transformStyle: "preserve-3d",
    }}>
      <div style={{ position: "absolute", left: 10, top: 44, width: 62, height: 14, borderRadius: 999, background: winner ? "rgba(245,158,11,0.2)" : "rgba(15,23,42,0.12)", filter: "blur(1px)", transform: `scale(${shadowScale}) perspective(80px) rotateX(54deg)` }} />
      {active ? <div style={{ position: "absolute", left: 2, top: 26, width: 18, height: 20, borderRadius: "999px 0 0 999px", background: "linear-gradient(90deg, rgba(56,189,248,0.0), rgba(56,189,248,0.35))", filter: "blur(1px)" }} /> : null}
      <div style={{ position: "relative", width: 80, height: 64 }}>
        <div style={{ position: "absolute", left: 8, top: 18, width: 56, height: 32, borderRadius: 999, background: "rgba(15,23,42,0.08)", filter: "blur(6px)", transform: "translateZ(-10px)" }} />
        <div style={{
          position: "absolute",
          left: 12,
          top: 20,
          width: 48,
          height: 36,
          borderRadius: 999,
          border: `1px solid ${winner ? "#fcd34d" : isPodium ? "#cbd5e1" : "#e2e8f0"}`,
          background: `radial-gradient(circle at 35% 20%, rgba(255,255,255,0.9), transparent 40%), linear-gradient(165deg, ${variant.palette.bodyA} 0%, ${variant.palette.bodyB} 70%, #cbd5e1 100%)`,
          boxShadow: winner ? "0 10px 30px rgba(245,158,11,0.24), inset -6px -6px 12px rgba(15,23,42,0.07)" : "0 8px 20px rgba(15,23,42,0.08), inset -6px -6px 12px rgba(15,23,42,0.06)",
        }}>
          <div style={{ position: "absolute", left: 8, right: 8, top: 4, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.7)", filter: "blur(0.2px)" }} />
          <DuckPattern variant={variant} />
          <div style={{ position: "absolute", left: 4, top: 12, width: 24, height: 20, borderRadius: 999, border: "1px solid rgba(226,232,240,0.8)", background: `linear-gradient(165deg, ${variant.palette.wing}, ${variant.palette.accentSoft})`, transform: `rotate(${wing}deg)` }} />
          <div style={{ position: "absolute", left: -2, top: 20, width: 8, height: 12, borderRadius: "0 999px 999px 0", background: "rgba(148,163,184,0.6)" }} />
        </div>
        <div style={{
          position: "absolute",
          left: 44,
          top: 4,
          width: 32,
          height: 32,
          borderRadius: 999,
          border: `1px solid ${winner ? "#fcd34d" : isPodium ? "#cbd5e1" : "#e2e8f0"}`,
          background: `radial-gradient(circle at 40% 20%, rgba(255,255,255,0.85), transparent 42%), linear-gradient(165deg, ${variant.palette.bodyA} 0%, ${variant.palette.bodyB} 95%)`,
          boxShadow: "inset -4px -4px 10px rgba(15,23,42,0.08)",
        }}>
          <div style={{ position: "absolute", left: 16, top: 12, width: 2, height: 2, borderRadius: 999, background: "#0f172a", transform: `scale(${variant.eyeSize})` }} />
          <div style={{ position: "absolute", left: 12, top: 8, width: 8, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.7)" }} />
        </div>
        <div style={{ position: "absolute", left: 68, top: 16, width: 16, height: 12, borderRadius: "3px 999px 999px 3px", background: `linear-gradient(165deg, #fff7ed, ${variant.palette.bill})` }} />
        <div style={{ position: "absolute", left: 68, top: 23, width: 14, height: 10, opacity: 0.9, borderRadius: "3px 999px 999px 3px", background: `linear-gradient(165deg, ${variant.palette.bill}, #fb923c)` }} />
        <div style={{ position: "absolute", left: 24, top: 48, width: 4, height: 16, borderRadius: 999, background: variant.palette.bill, transform: `rotate(${legA}deg)`, transformOrigin: "top center" }} />
        <div style={{ position: "absolute", left: 40, top: 48, width: 4, height: 16, borderRadius: 999, background: variant.palette.bill, transform: `rotate(${legB}deg)`, transformOrigin: "top center" }} />
        <DuckAccessory variant={variant} />
        {place > -1 ? (
          <div style={{
            position: "absolute",
            left: -4,
            top: -4,
            borderRadius: 999,
            border: `1px solid ${getPlaceColors(place).border}`,
            padding: "2px 6px",
            fontSize: 10,
            fontWeight: 700,
            background: getPlaceColors(place).chipBg,
            color: getPlaceColors(place).chipText,
          }}>
            {placeLabel(place)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RaceArena({ racers, progress, placements, isRacing, showBurst, countdownValue, audience, avatarSeed, motionTime }) {
  const count = racers.length;
  const metrics = getArenaMetrics(count, audience);
  const placementByIndex = useMemo(() => new Map(placements.map((item) => [item.raceIndex, item.place])), [placements]);
  const variants = useMemo(() => racers.map((name) => buildDuckVariant(name, avatarSeed)), [racers, avatarSeed]);
  const sortedPlacements = useMemo(() => placements.slice().sort((a, b) => a.place - b.place), [placements]);
  const firstPlace = sortedPlacements[0];
  const winnerName = firstPlace ? racers[firstPlace.raceIndex] : "";

  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden", borderRadius: audience ? 36 : 28, border: "1px solid rgba(255,255,255,0.25)", background: "linear-gradient(180deg, #5dd8ef 0%, #25bdd8 42%, #1494af 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 28px 70px rgba(4, 35, 48, 0.25)" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 10% 10%, rgba(255,255,255,0.5), transparent 45%), radial-gradient(circle at 100% 100%, rgba(8, 145, 178, 0.22), transparent 45%)" }} />
      <div style={{ position: "absolute", inset: 0, opacity: 0.2, backgroundImage: "radial-gradient(rgba(2, 44, 57, 0.35) 0.9px, transparent 0.9px)", backgroundSize: "14px 14px" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,0.12), transparent 22%, rgba(7, 89, 107, 0.16) 100%)" }} />
      <WinnerBanner name={winnerName} show={Boolean(winnerName && !isRacing && countdownValue === null)} audience={audience} />
      <CountdownOverlay value={countdownValue} audience={audience} />

      <div style={{ position: "relative", ...metrics.heightStyle }}>
        <div style={{ position: "absolute", top: 16, left: audience ? 24 : 20, zIndex: 10 }}><div style={pill("rgba(255,255,255,0.88)", "#0f172a", "rgba(255,255,255,0.95)")}>Start</div></div>
        <div style={{ position: "absolute", top: 16, right: audience ? 24 : 20, zIndex: 10 }}><div style={pill("rgba(255, 244, 183, 0.95)", "#92400e", "#fde68a")}>Finish</div></div>

        <div style={{ position: "absolute", top: "15%", bottom: "6%", left: `${metrics.startX}%`, right: `${100 - metrics.finishX}%`, borderRadius: 32, border: "1px solid rgba(8, 89, 107, 0.22)", background: "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(7, 89, 107, 0.14))", transform: "perspective(900px) rotateX(8deg)", transformOrigin: "center top" }} />
        <div style={{ position: "absolute", top: "15%", bottom: "6%", left: `${metrics.startX}%`, right: `${100 - metrics.finishX}%`, borderRadius: 32, opacity: 0.45, backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 3px, transparent 3px, transparent 48px), repeating-linear-gradient(120deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 9px, transparent 9px, transparent 22px)", transform: "perspective(900px) rotateX(8deg)", transformOrigin: "center top" }} />
        <div style={{ position: "absolute", top: "15%", bottom: "6%", left: `${metrics.startX}%`, right: `${100 - metrics.finishX}%`, borderRadius: 32, boxShadow: "inset 0 -24px 28px rgba(4, 35, 48, 0.18), inset 0 10px 16px rgba(255,255,255,0.18)", pointerEvents: "none" }} />

        {racers.map((name, index) => {
          const yPct = metrics.topPct + metrics.laneStepPct * (index + 0.5);
          const pct = progress[index] ?? 0;
          const xPct = metrics.startX + (metrics.finishX - metrics.startX) * (clamp(pct, 0, 100) / 100);
          const place = placementByIndex.has(index) ? placementByIndex.get(index) : -1;
          const winner = place === 0;
          const colors = place > -1 ? getPlaceColors(place) : null;
          const variant = variants[index];

          return (
            <div key={`${name}-${index}`}>
              <div style={{ position: "absolute", left: `${metrics.startX}%`, right: `${100 - metrics.finishX}%`, top: `${yPct}%`, borderTop: `1px dashed ${place > -1 ? colors.border : "rgba(148,163,184,0.35)"}`, opacity: 0.8 }} />
              <div style={{ position: "absolute", top: `${yPct}%`, left: `${metrics.startX + 0.5}%`, width: `${Math.max(0, xPct - metrics.startX - 0.5)}%`, height: 10, transform: "translateY(-50%)", borderRadius: 999, background: "linear-gradient(90deg, rgba(56,189,248,0.08), rgba(59,130,246,0.28), rgba(56,189,248,0.08))", filter: "blur(0.4px)", opacity: isRacing ? 0.9 : 0.55 }} />
              <div style={{
                position: "absolute",
                top: `${yPct}%`,
                left: `calc(${metrics.startX}% - 0.75rem)`,
                transform: "translateY(-50%)",
                maxWidth: audience ? "18rem" : "14rem",
                padding: "4px 10px",
                borderRadius: 999,
                border: `1px solid ${place > -1 ? colors.border : "#dbeafe"}`,
                background: place > -1 ? colors.bg : "rgba(255,255,255,0.82)",
                backdropFilter: "blur(4px)",
                zIndex: 10,
                fontSize: metrics.labelSize - 1,
                fontWeight: 600,
                color: "#164e63",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {name}
              </div>

              <div style={{ position: "absolute", top: `${yPct}%`, right: audience ? 20 : 16, transform: "translateY(-50%)", zIndex: 10, color: "rgba(255,255,255,0.95)", fontWeight: 700, fontSize: metrics.percentSize }}>
                {Math.round(pct)}%
              </div>

              {place > -1 ? (
                <div style={{
                  position: "absolute",
                  top: `${yPct}%`,
                  left: audience ? 16 : 14,
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  borderRadius: 999,
                  border: `1px solid ${colors.border}`,
                  padding: "2px 8px",
                  fontSize: 10,
                  fontWeight: 700,
                  background: colors.chipBg,
                  color: colors.chipText,
                }}>
                  {placeLabel(place)}
                </div>
              ) : null}

              <div style={{ position: "absolute", top: `${yPct}%`, left: `${xPct}%`, zIndex: 20, filter: winner && showBurst ? "drop-shadow(0 0 28px rgba(251,191,36,0.75))" : "drop-shadow(0 6px 8px rgba(15,23,42,0.15))" }}>
                <DuckSprite winner={winner} place={place} active={isRacing} progress={pct} index={index} scale={metrics.duckScale} variant={variant} motionTime={motionTime} />
              </div>

              {winner && showBurst ? (
                <>
                  <div style={{ position: "absolute", top: `${yPct}%`, left: `${metrics.finishX}%`, transform: "translate(-50%,-50%)", zIndex: 10, width: audience ? 144 : 96, height: audience ? 144 : 96, borderRadius: 999, background: "rgba(253,224,71,0.26)", filter: "blur(18px)" }} />
                  {Array.from({ length: 10 }).map((_, burstIndex) => (
                    <div
                      key={`burst-${index}-${burstIndex}`}
                      style={{
                        position: "absolute",
                        top: `${yPct}%`,
                        left: `${metrics.finishX}%`,
                        zIndex: 10,
                        width: `${28 + (burstIndex % 3) * 12}px`,
                        height: 2,
                        transform: `translateY(-50%) rotate(${burstIndex * 36}deg)`,
                        transformOrigin: "left center",
                        background: "linear-gradient(to right, rgba(252,211,77,0.85), transparent)",
                        borderRadius: 999,
                      }}
                    />
                  ))}
                </>
              ) : null}
            </div>
          );
        })}

        <div style={{ position: "absolute", top: "14%", bottom: "6%", left: `${metrics.finishX}%`, width: 10, transform: "translateX(-50%)", borderRadius: 999, background: "repeating-linear-gradient(180deg, #ffd43b 0px, #ffd43b 10px, #fff 10px, #fff 20px)", boxShadow: "0 0 0 3px rgba(255,255,255,0.42), 0 0 24px rgba(255,212,59,0.58)" }} />
        <div style={{ position: "absolute", top: "14%", bottom: "6%", left: `${metrics.finishX}%`, width: 80, transform: "translateX(-50%)", background: "radial-gradient(circle at center, rgba(251,191,36,0.26), transparent 70%)", pointerEvents: "none" }} />
      </div>
    </div>
  );
}

function PlaceSelectionRow({ podiumSlots, eliminationPlaces, onToggle, onClear, onFirstOnly, onAll }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Array.from({ length: podiumSlots }).map((_, index) => {
          const active = eliminationPlaces.includes(index);
          return (
            <button
              key={index}
              type="button"
              onClick={() => onToggle(index)}
              style={{
                borderRadius: 999,
                padding: "8px 12px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                border: active ? "1px solid #0f172a" : "1px solid #e2e8f0",
                background: active ? "#0f172a" : "#fff",
                color: active ? "#fff" : "#334155",
              }}
            >
              Eliminate {placeLabel(index)}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={onClear} style={baseButton("outline")}>None</button>
        <button type="button" onClick={onFirstOnly} style={baseButton("outline")}>1st only</button>
        <button type="button" onClick={onAll} style={baseButton("outline")}>All podium places</button>
      </div>
    </div>
  );
}

function SidebarNavButton({ icon: Icon, label, description, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        borderRadius: 22,
        border: active ? "1px solid rgba(255, 214, 77, 0.7)" : "1px solid rgba(255,255,255,0.55)",
        background: active
          ? "linear-gradient(135deg, rgba(255,247,186,0.95) 0%, rgba(255,227,122,0.76) 100%)"
          : "linear-gradient(135deg, rgba(255,255,255,0.56) 0%, rgba(255,255,255,0.18) 100%)",
        color: active ? "#7c4a00" : "#475569",
        cursor: "pointer",
        boxShadow: active ? "0 18px 34px rgba(255, 191, 0, 0.18)" : "0 10px 24px rgba(148,163,184,0.08)",
        backdropFilter: "blur(18px)",
        textAlign: "left",
      }}
    >
      <span style={{
        width: 38,
        height: 38,
        borderRadius: 14,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? "rgba(255,255,255,0.56)" : "rgba(255,255,255,0.5)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
      }}>
        <Icon size={18} />
      </span>
      <span style={{ display: "grid", gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>{label}</span>
        <span style={{ fontSize: 11, opacity: 0.8 }}>{description}</span>
      </span>
    </button>
  );
}

function DuckPreviewBadge({ index, variant, motionTime }) {
  const previewPlace = index < 3 ? index : -1;

  return (
    <div style={{ width: 132, height: 132, borderRadius: 999, background: "radial-gradient(circle at 35% 20%, rgba(255,255,255,0.96), rgba(49,187,211,0.3))", border: "10px solid rgba(255,255,255,0.86)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 18px 40px rgba(10, 88, 108, 0.18)", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "relative", width: 104, height: 104 }}>
        <div style={{ position: "absolute", left: "50%", top: "56%" }}>
          <DuckSprite winner={index === 0} place={previewPlace} active={false} progress={0} index={index} scale={1.08} variant={variant} motionTime={motionTime} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const initialConfig = useMemo(() => {
    const safeWindow = typeof window !== "undefined" ? window : null;
    const params = safeWindow ? new URLSearchParams(safeWindow.location.search) : null;
    const seedParam = params?.get("seed") ?? "";
    const audienceParam = parseBooleanParam(params?.get("audience"), false) || params?.get("view") === "overlay";
    return {
      seedParam,
      audienceParam,
      overlayOnlyParam: params?.get("view") === "overlay",
      overlayTheme: params?.get("theme") || "default",
      shuffleParam: parseBooleanParam(params?.get("shuffle"), true),
      soundParam: parseBooleanParam(params?.get("sound"), false),
      compactOverlayParam: parseBooleanParam(params?.get("minimal"), false),
    };
  }, []);

  const [entriesText, setEntriesText] = useState(SAMPLE);
  const [numberStart, setNumberStart] = useState("1");
  const [numberEnd, setNumberEnd] = useState("10");
  const [prefix, setPrefix] = useState("Group ");
  const [duration, setDuration] = useState(7);
  const [shuffleBeforeRace, setShuffleBeforeRace] = useState(initialConfig.shuffleParam);
  const [soundEnabled, setSoundEnabled] = useState(initialConfig.soundParam);
  const [soundVolume, setSoundVolume] = useState(70);
  const [soundPreset, setSoundPreset] = useState("sport");
  const [countdownChannelVolume, setCountdownChannelVolume] = useState(100);
  const [startChannelVolume, setStartChannelVolume] = useState(100);
  const [raceChannelVolume, setRaceChannelVolume] = useState(100);
  const [finishChannelVolume, setFinishChannelVolume] = useState(100);
  const [rerollAvatarsEachRound, setRerollAvatarsEachRound] = useState(false);
  const [avatarSeed, setAvatarSeed] = useState(0);
  const [podiumCountInput, setPodiumCountInput] = useState("3");
  const [eliminationPlaces, setEliminationPlaces] = useState([0]);
  const [racers, setRacers] = useState([]);
  const [progress, setProgress] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [lastResults, setLastResults] = useState([]);
  const [lastWinners, setLastWinners] = useState([]);
  const [lastEliminationUndo, setLastEliminationUndo] = useState(null);
  const [isRacing, setIsRacing] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const [isAudienceMode, setIsAudienceMode] = useState(initialConfig.audienceParam);
  const [isCompactOverlay, setIsCompactOverlay] = useState(initialConfig.compactOverlayParam);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [countdownValue, setCountdownValue] = useState(null);
  const [motionTime, setMotionTime] = useState(0);
  const [raceSeedInput, setRaceSeedInput] = useState(initialConfig.seedParam);
  const [copyNotice, setCopyNotice] = useState("");
  const [fairnessMode, setFairnessMode] = useState(false);
  const [raceLogs, setRaceLogs] = useState([]);
  const [roundHistory, setRoundHistory] = useState([]);
  const [roundNumber, setRoundNumber] = useState(1);
  const [dedupeEntries, setDedupeEntries] = useState(true);
  const [entryFilter, setEntryFilter] = useState("");
  const [activeView, setActiveView] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const fileImportRef = useRef(null);

  const animationRef = useRef(null);
  const progressRef = useRef([]);
  const audioContextRef = useRef(null);
  const countdownTimeoutsRef = useRef([]);
  const raceSoundIntervalRef = useRef(null);
  const persistenceEnabledRef = useRef(true);

  const rawEntries = useMemo(() => splitEntries(entriesText), [entriesText]);
  const normalizedEntries = useMemo(() => {
    if (!dedupeEntries) return rawEntries;
    const seen = new Set();
    return rawEntries.filter((entry) => {
      const key = entry.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rawEntries, dedupeEntries]);
  const parsedEntries = useMemo(() => {
    const term = entryFilter.trim().toLowerCase();
    if (!term) return normalizedEntries;
    return normalizedEntries.filter((entry) => entry.toLowerCase().includes(term));
  }, [normalizedEntries, entryFilter]);
  const duplicateCount = Math.max(0, rawEntries.length - normalizedEntries.length);
  const activeEntryCount = Math.max(parsedEntries.length, racers.length, 1);
  const parsedPodiumInput = Number(podiumCountInput);
  const podiumRequested = Number.isFinite(parsedPodiumInput) ? Math.floor(parsedPodiumInput) : 3;
  const podiumSlots = clamp(Math.max(1, podiumRequested || 1), 1, activeEntryCount);
  const displayRacers = racers.length ? racers : parsedEntries;
  const displayProgress = progress.length === displayRacers.length ? progress : displayRacers.map(() => 0);
  const liveRanking = useMemo(() => {
    return displayRacers
      .map((name, index) => ({
        name,
        index,
        progress: displayProgress[index] ?? 0,
        place: placements.find((item) => item.raceIndex === index)?.place ?? null,
      }))
      .sort((a, b) => {
        if (a.place !== null && b.place !== null) return a.place - b.place;
        if (a.place !== null) return -1;
        if (b.place !== null) return 1;
        return b.progress - a.progress;
      });
  }, [displayProgress, displayRacers, placements]);
  const leadingRacer = liveRanking[0] ?? null;
  const stablePreviewEntries = displayRacers.length ? displayRacers : parsedEntries;
  const podiumWinners = placements.slice().sort((a, b) => a.place - b.place).map((item) => ({ place: item.place, name: displayRacers[item.raceIndex] }));
  const activeSeed = raceSeedInput.trim();
  const isOverlayRoute = initialConfig.overlayOnlyParam;
  const sharedUrl = useMemo(() => {
    const safeWindow = typeof window !== "undefined" ? window : null;
    if (!safeWindow) return "";
    const url = new URL(safeWindow.location.href);
    if (activeSeed) url.searchParams.set("seed", activeSeed);
    else url.searchParams.delete("seed");
    if (isAudienceMode) url.searchParams.set("audience", "1");
    else url.searchParams.delete("audience");
    if (isCompactOverlay) url.searchParams.set("minimal", "1");
    else url.searchParams.delete("minimal");
    if (shuffleBeforeRace) url.searchParams.set("shuffle", "1");
    else url.searchParams.delete("shuffle");
    return url.toString();
  }, [activeSeed, isAudienceMode, isCompactOverlay, shuffleBeforeRace]);

  function makeRaceRng(scope) {
    if (!activeSeed) return Math.random;
    return mulberry32(hashString(`${activeSeed}::${scope}::${parsedEntries.join("|")}`));
  }

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      countdownTimeoutsRef.current.forEach(clearTimeout);
      if (raceSoundIntervalRef.current) clearInterval(raceSoundIntervalRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    setEliminationPlaces((prev) => prev.filter((place) => place < podiumSlots));
  }, [podiumSlots]);

  useEffect(() => {
    const safeWindow = typeof window !== "undefined" ? window : null;
    if (!safeWindow) return;
    try {
      const raw = safeWindow.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      if (typeof parsed.entriesText === "string") setEntriesText(parsed.entriesText);
      if (typeof parsed.numberStart === "string") setNumberStart(parsed.numberStart);
      if (typeof parsed.numberEnd === "string") setNumberEnd(parsed.numberEnd);
      if (typeof parsed.prefix === "string") setPrefix(parsed.prefix);
      if (typeof parsed.duration === "number") setDuration(clamp(parsed.duration, 3, 30));
      if (typeof parsed.shuffleBeforeRace === "boolean") setShuffleBeforeRace(parsed.shuffleBeforeRace);
      if (typeof parsed.soundEnabled === "boolean") setSoundEnabled(parsed.soundEnabled);
      if (typeof parsed.soundVolume === "number") setSoundVolume(clamp(parsed.soundVolume, 0, 200));
      if (typeof parsed.soundPreset === "string") setSoundPreset(parsed.soundPreset);
      if (typeof parsed.countdownChannelVolume === "number") setCountdownChannelVolume(clamp(parsed.countdownChannelVolume, 0, 200));
      if (typeof parsed.startChannelVolume === "number") setStartChannelVolume(clamp(parsed.startChannelVolume, 0, 200));
      if (typeof parsed.raceChannelVolume === "number") setRaceChannelVolume(clamp(parsed.raceChannelVolume, 0, 200));
      if (typeof parsed.finishChannelVolume === "number") setFinishChannelVolume(clamp(parsed.finishChannelVolume, 0, 200));
      if (typeof parsed.rerollAvatarsEachRound === "boolean") setRerollAvatarsEachRound(parsed.rerollAvatarsEachRound);
      if (typeof parsed.podiumCountInput === "string") setPodiumCountInput(parsed.podiumCountInput);
      if (Array.isArray(parsed.eliminationPlaces)) setEliminationPlaces(parsed.eliminationPlaces.filter((n) => Number.isInteger(n) && n >= 0));
      if (Array.isArray(parsed.lastResults)) setLastResults(parsed.lastResults.slice(0, 8).map(String));
      if (typeof parsed.raceSeedInput === "string" && !initialConfig.seedParam) setRaceSeedInput(parsed.raceSeedInput);
      if (typeof parsed.isCompactOverlay === "boolean") setIsCompactOverlay(parsed.isCompactOverlay);
      if (typeof parsed.fairnessMode === "boolean") setFairnessMode(parsed.fairnessMode);
      if (typeof parsed.dedupeEntries === "boolean") setDedupeEntries(parsed.dedupeEntries);
      if (typeof parsed.entryFilter === "string") setEntryFilter(parsed.entryFilter);
      if (Array.isArray(parsed.raceLogs)) setRaceLogs(parsed.raceLogs.slice(0, 40));
      if (Array.isArray(parsed.roundHistory)) setRoundHistory(parsed.roundHistory.slice(0, 40));
      if (typeof parsed.roundNumber === "number") setRoundNumber(Math.max(1, Math.floor(parsed.roundNumber)));
    } catch {
      // Ignore malformed saved data.
    }
  }, [initialConfig.seedParam]);

  useEffect(() => {
    const safeWindow = typeof window !== "undefined" ? window : null;
    if (!safeWindow) return;
    if (!persistenceEnabledRef.current) return;
    const payload = {
      entriesText,
      numberStart,
      numberEnd,
      prefix,
      duration,
      shuffleBeforeRace,
      soundEnabled,
      soundVolume,
      soundPreset,
      countdownChannelVolume,
      startChannelVolume,
      raceChannelVolume,
      finishChannelVolume,
      rerollAvatarsEachRound,
      podiumCountInput,
      eliminationPlaces,
      lastResults,
      raceSeedInput,
      isCompactOverlay,
      fairnessMode,
      dedupeEntries,
      entryFilter,
      raceLogs,
      roundHistory,
      roundNumber,
    };
    safeWindow.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    entriesText,
    numberStart,
    numberEnd,
    prefix,
    duration,
    shuffleBeforeRace,
    soundEnabled,
    soundVolume,
    soundPreset,
    countdownChannelVolume,
    startChannelVolume,
    raceChannelVolume,
    finishChannelVolume,
    rerollAvatarsEachRound,
    podiumCountInput,
    eliminationPlaces,
    lastResults,
    raceSeedInput,
    isCompactOverlay,
    fairnessMode,
    dedupeEntries,
    entryFilter,
    raceLogs,
    roundHistory,
    roundNumber,
  ]);

  useEffect(() => {
    const safeWindow = typeof window !== "undefined" ? window : null;
    if (!safeWindow) return undefined;
    const onKeyDown = (event) => {
      const targetTag = event.target?.tagName?.toLowerCase();
      const typing = targetTag === "textarea" || targetTag === "input" || event.target?.isContentEditable;
      if (typing) return;
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        startRaceWithCountdown();
      }
      if (event.key.toLowerCase() === "i") {
        event.preventDefault();
        instantPick();
      }
      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        setSoundEnabled((prev) => !prev);
      }
    };
    safeWindow.addEventListener("keydown", onKeyDown);
    return () => safeWindow.removeEventListener("keydown", onKeyDown);
  });

  function getNextAvatarSeed() {
    return Math.floor(Date.now() % 1000000000);
  }

  function getAudioContext() {
    if (!soundEnabled || audioBlocked) return null;
    try {
      const safeWindow = typeof window !== "undefined" ? window : null;
      if (!safeWindow) return null;
      if (!audioContextRef.current) {
        const AudioContextClass = safeWindow.AudioContext || safeWindow.webkitAudioContext;
        if (!AudioContextClass) return null;
        audioContextRef.current = new AudioContextClass();
      }
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(() => setAudioBlocked(true));
      }
      return audioContextRef.current;
    } catch {
      setAudioBlocked(true);
      return null;
    }
  }

  function playToneSequence(tones) {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const start = ctx.currentTime;
      for (const tone of tones) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = tone.type || "sine";
        osc.frequency.setValueAtTime(tone.freq, start + tone.at);
        gain.gain.setValueAtTime(0.0001, start + tone.at);
        const normalizedVolume = clamp(soundVolume / 200, 0, 1);
        const presetBoost =
          soundPreset === "minimal" ? 0.8 :
          soundPreset === "cinematic" ? 1.25 :
          1;
        const volumeScale = Math.pow(normalizedVolume, 0.58) * 2.6 * presetBoost;
        gain.gain.exponentialRampToValueAtTime((tone.volume || 0.04) * volumeScale, start + tone.at + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.at + tone.duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start + tone.at);
        osc.stop(start + tone.at + tone.duration + 0.03);
      }
    } catch {
      setAudioBlocked(true);
    }
  }

  function playStartSound() {
    const channelScale = clamp(startChannelVolume / 100, 0, 2);
    playToneSequence([
      { freq: 330, at: 0, duration: 0.08, volume: 0.04 * channelScale, type: "triangle" },
      { freq: 440, at: 0.1, duration: 0.08, volume: 0.04 * channelScale, type: "triangle" },
      { freq: 554, at: 0.2, duration: 0.1, volume: 0.05 * channelScale, type: "triangle" },
    ]);
  }

  function playCountdownTick(value) {
    const channelScale = clamp(countdownChannelVolume / 100, 0, 2);
    const tones = {
      3: [{ freq: 330, at: 0, duration: 0.08, volume: 0.05 * channelScale, type: "square" }],
      2: [{ freq: 415, at: 0, duration: 0.08, volume: 0.06 * channelScale, type: "square" }],
      1: [{ freq: 523, at: 0, duration: 0.1, volume: 0.08 * channelScale, type: "triangle" }],
    };
    playToneSequence(tones[value] || tones[1]);
  }

  function startRaceLoopSound() {
    if (raceSoundIntervalRef.current) clearInterval(raceSoundIntervalRef.current);
    const channelScale = clamp(raceChannelVolume / 100, 0, 2);
    raceSoundIntervalRef.current = setInterval(() => {
      playToneSequence([
        { freq: 180 + Math.random() * 35, at: 0, duration: 0.06, volume: 0.04 * channelScale, type: "sawtooth" },
        { freq: 240 + Math.random() * 45, at: 0.05, duration: 0.05, volume: 0.032 * channelScale, type: "triangle" },
      ]);
    }, 520);
  }

  function stopRaceLoopSound() {
    if (!raceSoundIntervalRef.current) return;
    clearInterval(raceSoundIntervalRef.current);
    raceSoundIntervalRef.current = null;
  }

  function playFinishSound() {
    const channelScale = clamp(finishChannelVolume / 100, 0, 2);
    playToneSequence([
      { freq: 523, at: 0, duration: 0.12, volume: 0.09 * channelScale, type: "triangle" },
      { freq: 659, at: 0.08, duration: 0.12, volume: 0.09 * channelScale, type: "triangle" },
      { freq: 784, at: 0.16, duration: 0.18, volume: 0.11 * channelScale, type: "triangle" },
      { freq: 1046, at: 0.3, duration: 0.24, volume: 0.12 * channelScale, type: "sine" },
    ]);
  }

  function clearCountdown() {
    countdownTimeoutsRef.current.forEach(clearTimeout);
    countdownTimeoutsRef.current = [];
    setCountdownValue(null);
  }

  function clearAnimation() {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    progressRef.current = [];
    stopRaceLoopSound();
  }

  function generateNumbers() {
    const start = Number(numberStart);
    const end = Number(numberEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;
    const low = Math.min(start, end);
    const high = Math.max(start, end);
    const list = [];
    for (let i = low; i <= high; i += 1) list.push(`${prefix}${i}`.trim());
    setEntriesText(list.join("\n"));
  }

  function resetVisual() {
    clearAnimation();
    clearCountdown();
    setIsRacing(false);
    setPlacements([]);
    setShowBurst(false);
    setRacers(parsedEntries);
    setProgress(parsedEntries.map(() => 0));
  }

  function toggleEliminationPlace(placeIndex) {
    setEliminationPlaces((prev) =>
      prev.includes(placeIndex)
        ? prev.filter((item) => item !== placeIndex)
        : [...prev, placeIndex].sort((a, b) => a - b),
    );
  }

  function storeResults(winners, raceContext = {}) {
    if (!winners.length) return;
    setLastWinners(winners);
    const summary = winners.map((name, index) => `${placeLabel(index)} ${name}`).join(" • ");
    setLastResults((prev) => [summary, ...prev.filter((item) => item !== summary)].slice(0, 8));

    const participantSnapshot = raceContext.participants || parsedEntries;
    const logEntry = {
      timestamp: new Date().toISOString(),
      round: roundNumber,
      seed: activeSeed || null,
      fairnessMode,
      entriesHash: hashString(participantSnapshot.join("|")),
      participants: participantSnapshot,
      winners,
      summary,
      settings: {
        duration,
        podiumSlots,
        shuffleBeforeRace,
        soundPreset,
      },
    };

    setRaceLogs((prev) => [logEntry, ...prev].slice(0, 40));

    const eliminated = eliminationPlaces.map((place) => winners[place]).filter(Boolean);
    setRoundHistory((prev) => [
      ...prev,
      {
        round: roundNumber,
        participants: participantSnapshot,
        winners,
        eliminated,
      },
    ].slice(-40));
    setRoundNumber((prev) => prev + 1);
  }

  function maybeEliminateWinners(winnersByPlace) {
    const targets = eliminationPlaces.map((place) => winnersByPlace[place]).filter(Boolean);
    if (!targets.length) return;
    setLastEliminationUndo(parsedEntries.join("\n"));
    const remaining = removeManyOccurrences(parsedEntries, targets);
    setEntriesText(remaining.join("\n"));
  }

  function undoLastElimination() {
    if (!lastEliminationUndo) return;
    setEntriesText(lastEliminationUndo);
    setLastEliminationUndo(null);
  }

  function triggerImportFilePicker() {
    if (!fileImportRef.current) return;
    fileImportRef.current.click();
  }

  function handleImportEntries(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const nextEntries = parseCsvOrTextEntries(reader.result);
      if (nextEntries.length) setEntriesText(nextEntries.join("\n"));
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  function exportEntriesTxt() {
    downloadText("entries.txt", parsedEntries.join("\n"));
  }

  function exportEntriesCsv() {
    const csv = [toCsvRow(["entry"]), ...parsedEntries.map((entry) => toCsvRow([entry]))].join("\n");
    downloadText("entries.csv", csv, "text/csv;charset=utf-8");
  }

  function exportResultsCsv() {
    const rows = [toCsvRow(RESULTS_EXPORT_HEADERS), ...lastWinners.map((name, index) => toCsvRow([placeLabel(index), name]))].join("\n");
    downloadText("results.csv", rows, "text/csv;charset=utf-8");
  }

  function exportHistoryJson() {
    const payload = {
      createdAt: new Date().toISOString(),
      seed: activeSeed || null,
      lastWinners,
      lastResults,
    };
    downloadText("results-history.json", JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
  }

  function exportRaceLogJson() {
    const payload = {
      createdAt: new Date().toISOString(),
      fairnessMode,
      logs: raceLogs,
    };
    downloadText("race-log.json", JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
  }

  function copyShareLink() {
    if (!sharedUrl) return;
    const done = () => {
      setCopyNotice("Copied share link");
      setTimeout(() => setCopyNotice(""), 1400);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(sharedUrl).then(done).catch(() => {
        downloadText("share-link.txt", sharedUrl);
        done();
      });
      return;
    }
    downloadText("share-link.txt", sharedUrl);
    done();
  }

  function randomizeSeed() {
    setRaceSeedInput(String(Math.floor(Date.now() % 1000000000)));
  }

  function clearSavedState() {
    const safeWindow = typeof window !== "undefined" ? window : null;
    if (!safeWindow) return;
    persistenceEnabledRef.current = false;
    safeWindow.localStorage.removeItem(STORAGE_KEY);

    clearAnimation();
    clearCountdown();
    setEntriesText(SAMPLE);
    setNumberStart("1");
    setNumberEnd("10");
    setPrefix("Group ");
    setDuration(7);
    setShuffleBeforeRace(initialConfig.shuffleParam);
    setSoundEnabled(initialConfig.soundParam);
    setSoundVolume(70);
    setSoundPreset("sport");
    setCountdownChannelVolume(100);
    setStartChannelVolume(100);
    setRaceChannelVolume(100);
    setFinishChannelVolume(100);
    setRerollAvatarsEachRound(false);
    setAvatarSeed(0);
    setPodiumCountInput("3");
    setEliminationPlaces([0]);
    setRacers([]);
    setProgress([]);
    setPlacements([]);
    setLastResults([]);
    setLastWinners([]);
    setLastEliminationUndo(null);
    setIsRacing(false);
    setShowBurst(false);
    setAudioBlocked(false);
    setCountdownValue(null);
    setMotionTime(0);
    setRaceSeedInput(initialConfig.seedParam);
    setIsCompactOverlay(initialConfig.compactOverlayParam);
    setIsAudienceMode(initialConfig.audienceParam);
    setFairnessMode(false);
    setRaceLogs([]);
    setRoundHistory([]);
    setRoundNumber(1);
    setDedupeEntries(true);
    setEntryFilter("");
    setCopyNotice("Saved data cleared");
    setTimeout(() => setCopyNotice(""), 1400);
    setTimeout(() => {
      persistenceEnabledRef.current = true;
    }, 0);
  }

  function instantPick() {
    const nextAvatarSeed = rerollAvatarsEachRound ? getNextAvatarSeed() : 0;
    const list = parsedEntries;
    if (!list.length) return;
    const rng = makeRaceRng("instant");

    clearAnimation();
    clearCountdown();

    const displayList = shuffleBeforeRace ? seededShuffle(list, rng) : [...list];
    const winnerIndexes = seededShuffle(displayList.map((_, index) => index), rng).slice(0, Math.min(podiumSlots, displayList.length));
    const placementMap = winnerIndexes.map((raceIndex, place) => ({ raceIndex, place }));
    const winnersByPlace = placementMap.map(({ raceIndex }) => displayList[raceIndex]);

    setAvatarSeed(nextAvatarSeed);
    setRacers(displayList);
    setProgress(displayList.map((_, index) => {
      const found = placementMap.find((item) => item.raceIndex === index);
      if (!found) return 22 + rng() * 68;
      return 100 - found.place * 2;
    }));
    setPlacements(placementMap);
    setShowBurst(true);
    setIsRacing(false);
    storeResults(winnersByPlace, { participants: displayList });
    maybeEliminateWinners(winnersByPlace);
    stopRaceLoopSound();
    playFinishSound();
  }

  function runRace() {
    const nextAvatarSeed = rerollAvatarsEachRound ? getNextAvatarSeed() : 0;
    const list = parsedEntries;
    if (!list.length) return;
    const rng = makeRaceRng("race");

    clearAnimation();

    const raceList = shuffleBeforeRace ? seededShuffle(list, rng) : [...list];
    const durationMs = Math.max(3, duration) * 1000;
    const startAt = performance.now();
    let lastAt = startAt;
    let finalized = false;

    const durationSeconds = Math.max(3, duration);
    const targetAvgSpeed = 100 / durationSeconds;

    const racerState = raceList.map(() => ({
      baseSpeed: targetAvgSpeed * (0.84 + rng() * 0.34),
      volatility: 0.35 + rng() * 0.85,
      rhythm: 0.6 + rng() * 1.9,
      pulse: rng() * Math.PI * 2,
      progress: 0,
      speedNow: targetAvgSpeed * (0.78 + rng() * 0.22),
      burstAt: 0.12 + rng() * 0.76,
      burstUsed: false,
      staminaDrop: 0.45 + rng() * 0.45,
      jitterBias: rng() * 0.5,
      catchup: 0.94 + rng() * 0.2,
      laneLuck: 0.9 + rng() * 0.22,
    }));

    const finishOrder = [];

    const getPlacementMap = (nextProgress) => {
      const finishedFirst = [...finishOrder];
      const remaining = raceList
        .map((_, index) => index)
        .filter((index) => !finishedFirst.includes(index))
        .sort((a, b) => (nextProgress[b] ?? 0) - (nextProgress[a] ?? 0));
      return [...finishedFirst, ...remaining]
        .slice(0, Math.min(podiumSlots, raceList.length))
        .map((raceIndex, place) => ({ raceIndex, place }));
    };

    const finalizeRace = () => {
      if (finalized) return;
      finalized = true;
      const placementMap = getPlacementMap(progressRef.current);
      const winnersByPlace = placementMap.map(({ raceIndex }) => raceList[raceIndex]);
      const settledProgress = racerState.map((state, index) => (finishOrder.includes(index) ? 100 : Math.min(99.5, state.progress)));
      progressRef.current = settledProgress;
      setProgress(settledProgress);
      setPlacements(placementMap);
      setIsRacing(false);
      setShowBurst(true);
      storeResults(winnersByPlace, { participants: raceList });
      maybeEliminateWinners(winnersByPlace);
      stopRaceLoopSound();
      playFinishSound();
      animationRef.current = null;
    };

    progressRef.current = raceList.map(() => 0);
    setAvatarSeed(nextAvatarSeed);
    setRacers(raceList);
    setProgress(raceList.map(() => 0));
    setPlacements([]);
    setShowBurst(false);
    setIsRacing(true);
    playStartSound();
    startRaceLoopSound();

    const frame = (now) => {
      setMotionTime(now);
      const elapsed = now - startAt;
      const t = clamp(elapsed / durationMs, 0, 1.25);
      const delta = clamp((now - lastAt) / 1000, 0.010, 0.04);
      lastAt = now;

      const currentProgress = racerState.map((state) => state.progress);
      const leaderProgress = currentProgress.length ? Math.max(...currentProgress) : 0;

      const nextProgress = racerState.map((state, index) => {
        if (finishOrder.includes(index)) {
          state.progress = 100;
          return 100;
        }

        const current = state.progress;
        const behindLeader = Math.max(0, leaderProgress - current);
        const catchupBoost = 1 + Math.min(0.45, (behindLeader / 100) * state.catchup);
        const chaos =
          Math.sin(elapsed * 0.0019 * state.rhythm + state.pulse) * (0.7 + state.volatility) +
          Math.sin(elapsed * 0.0034 * (state.rhythm + 0.4) + state.pulse * 0.55) * (0.25 + state.jitterBias);
        const jitter = (rng() - 0.5) * targetAvgSpeed * 1.5 * state.volatility;
        const staminaFactor = t < state.staminaDrop ? 1 : Math.max(0.74, 1 - (t - state.staminaDrop) * 0.62);
        const desiredSpeed = Math.max(
          targetAvgSpeed * 0.38,
          (state.baseSpeed + chaos * targetAvgSpeed * 0.62 + jitter) * state.laneLuck,
        ) * staminaFactor * catchupBoost;

        // Smooth abrupt speed changes so ducks don't look jittery.
        state.speedNow = state.speedNow * 0.84 + desiredSpeed * 0.16;
        let speed = state.speedNow;

        if (!state.burstUsed && t >= state.burstAt) {
          state.burstUsed = true;
          speed += targetAvgSpeed * (0.9 + rng() * 1.5);
          state.speedNow = speed;
        }

        const stride = speed * delta;
        state.progress = clamp(state.progress + stride, 0, 100);

        if (state.progress >= 100 && !finishOrder.includes(index)) finishOrder.push(index);
        return state.progress;
      });

      progressRef.current = nextProgress;
      setProgress(nextProgress);
      setPlacements(getPlacementMap(nextProgress));

      const leaderNow = nextProgress.length ? Math.max(...nextProgress) : 0;
      if (leaderNow >= 100) {
        finalizeRace();
        return;
      }

      if (t >= 1.03) {
        finalizeRace();
        return;
      }

      animationRef.current = requestAnimationFrame(frame);
    };

    animationRef.current = requestAnimationFrame(frame);
  }

  function startRaceWithCountdown() {
    const list = parsedEntries;
    if (!list.length || isRacing || countdownValue !== null) return;

    clearAnimation();
    clearCountdown();
    setShowBurst(false);
    setPlacements([]);

    setCountdownValue(3);
    playCountdownTick(3);
    countdownTimeoutsRef.current = [
      setTimeout(() => {
        setCountdownValue(2);
        playCountdownTick(2);
      }, 900),
      setTimeout(() => {
        setCountdownValue(1);
        playCountdownTick(1);
      }, 1800),
      setTimeout(() => setCountdownValue(null), 2700),
      setTimeout(() => runRace(), 2750),
    ];
  }

  function rerollAvatarsFromHeader() {
    setAvatarSeed((value) => value + 1);
    setActiveView("stable");
    setIsProfileMenuOpen(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #d7f8ff 0%, #8fe6f3 24%, #31bbd3 58%, #0f7489 100%)", padding: 14 }}>
      <input ref={fileImportRef} type="file" accept=".txt,.csv,text/plain,text/csv" onChange={handleImportEntries} style={{ display: "none" }} />

      {!isOverlayRoute ? (
        <div style={{ maxWidth: 1820, margin: "0 auto", display: "grid", gap: 18 }}>
          <div style={{ position: "relative", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 18px", borderRadius: 28, border: "1px solid rgba(255,255,255,0.48)", background: "linear-gradient(135deg, rgba(255,255,255,0.84) 0%, rgba(255,255,255,0.42) 100%)", backdropFilter: "blur(22px)", boxShadow: "0 20px 50px rgba(15,23,42,0.12)", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#172033" }}>Quack Velocity</div>
              <div style={{ width: 1, height: 28, background: "rgba(100,116,139,0.24)" }} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setActiveView("dashboard")} style={{ border: activeView === "dashboard" ? "1px solid rgba(255,214,77,0.7)" : "1px solid rgba(255,255,255,0.44)", background: activeView === "dashboard" ? "linear-gradient(135deg, rgba(255,247,186,0.96) 0%, rgba(255,227,122,0.76) 100%)" : "linear-gradient(135deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.16) 100%)", color: activeView === "dashboard" ? "#7c4a00" : "#64748b", borderRadius: 999, padding: "10px 18px", fontWeight: 800, fontSize: 15, cursor: "pointer", backdropFilter: "blur(18px)" }}>Race Track</button>
                <button type="button" onClick={() => setActiveView("stable")} style={{ border: activeView === "stable" ? "1px solid rgba(255,214,77,0.7)" : "1px solid rgba(255,255,255,0.44)", background: activeView === "stable" ? "linear-gradient(135deg, rgba(255,247,186,0.96) 0%, rgba(255,227,122,0.76) 100%)" : "linear-gradient(135deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.16) 100%)", color: activeView === "stable" ? "#7c4a00" : "#64748b", borderRadius: 999, padding: "10px 18px", fontWeight: 800, fontSize: 15, cursor: "pointer", backdropFilter: "blur(18px)" }}>Duck Garage</button>
                <button type="button" onClick={() => setActiveView("live")} style={{ border: activeView === "live" ? "1px solid rgba(255,214,77,0.7)" : "1px solid rgba(255,255,255,0.44)", background: activeView === "live" ? "linear-gradient(135deg, rgba(255,247,186,0.96) 0%, rgba(255,227,122,0.76) 100%)" : "linear-gradient(135deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.16) 100%)", color: activeView === "live" ? "#7c4a00" : "#64748b", borderRadius: 999, padding: "10px 18px", fontWeight: 800, fontSize: 15, cursor: "pointer", backdropFilter: "blur(18px)" }}>Live Stats</button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button type="button" aria-label="Reroll duck outfits" onClick={rerollAvatarsFromHeader} style={{ width: 42, height: 42, borderRadius: 999, border: "1px solid rgba(255,255,255,0.5)", background: "linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.28) 100%)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#64748b", backdropFilter: "blur(16px)", cursor: "pointer" }}>
                <Sparkles size={16} />
              </button>
              <button type="button" aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"} onClick={() => setIsSidebarOpen((value) => !value)} style={{ width: 42, height: 42, borderRadius: 999, border: "1px solid rgba(255,255,255,0.5)", background: isSidebarOpen ? "linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.28) 100%)" : "linear-gradient(135deg, rgba(255,247,186,0.96) 0%, rgba(255,227,122,0.76) 100%)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: isSidebarOpen ? "#64748b" : "#7c4a00", backdropFilter: "blur(16px)", cursor: "pointer" }}>
                <SlidersHorizontal size={16} />
              </button>
              <button type="button" aria-label="Open quick actions" onClick={() => setIsProfileMenuOpen((value) => !value)} style={{ minWidth: 52, height: 52, borderRadius: 999, border: "none", background: "linear-gradient(135deg, #ffd43b 0%, #ffbf00 100%)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#172033", fontWeight: 900, fontSize: 13, letterSpacing: "0.08em", boxShadow: "0 14px 28px rgba(255,191,0,0.2)", cursor: "pointer" }}>MENU</button>
            </div>

            {isProfileMenuOpen ? (
              <div style={{ position: "absolute", right: 18, top: "calc(100% + 12px)", zIndex: 30, width: 240, padding: 14, borderRadius: 22, border: "1px solid rgba(255,255,255,0.58)", background: "linear-gradient(135deg, rgba(255,255,255,0.94) 0%, rgba(240,249,255,0.86) 100%)", backdropFilter: "blur(24px)", boxShadow: "0 24px 60px rgba(15,23,42,0.16)", display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#94a3b8" }}>Quick actions</div>
                <button type="button" onClick={() => { setActiveView("dashboard"); setIsProfileMenuOpen(false); }} style={{ ...baseButton("outline"), width: "100%", justifyContent: "flex-start", display: "flex" }}>Open race track</button>
                <button type="button" onClick={() => { setActiveView("stable"); setIsProfileMenuOpen(false); }} style={{ ...baseButton("outline"), width: "100%", justifyContent: "flex-start", display: "flex" }}>Open duck garage</button>
                <button type="button" onClick={() => { setIsAudienceMode((value) => !value); setIsProfileMenuOpen(false); }} style={{ ...baseButton("outline"), width: "100%", justifyContent: "flex-start", display: "flex" }}>{isAudienceMode ? "Close audience mode" : "Open audience mode"}</button>
                <button type="button" onClick={() => { startRaceWithCountdown(); setIsProfileMenuOpen(false); }} disabled={!parsedEntries.length || isRacing || countdownValue !== null} style={{ ...baseButton("primary"), width: "100%", background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)", border: "1px solid rgba(15,118,110,0.9)", boxShadow: "0 12px 28px rgba(20,184,166,0.28)" }}>Start race</button>
              </div>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 18, gridTemplateColumns: isSidebarOpen ? "360px minmax(0, 1fr)" : "minmax(0, 1fr)", alignItems: "start" }}>
            {isSidebarOpen ? (
            <aside style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(255,255,255,0.58) 100%)", border: "1px solid rgba(255,255,255,0.72)", borderRadius: 36, padding: 24, display: "grid", gap: 18, boxShadow: "0 30px 80px rgba(15, 23, 42, 0.14)", backdropFilter: "blur(22px)", position: "sticky", top: 10, maxHeight: "calc(100vh - 24px)", overflow: "auto" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#94a3b8" }}>Navigation</div>
              <div style={{ marginTop: 8, fontSize: 30, fontWeight: 900, lineHeight: 0.95, color: "#172033" }}>Liquid Glass Menu</div>
              <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>Refined around the current controls, with the race track kept intact.</div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <SidebarNavButton icon={LayoutDashboard} label="Race Track" description="Main race board" active={activeView === "dashboard"} onClick={() => setActiveView("dashboard")} />
              <SidebarNavButton icon={Shirt} label="Duck Garage" description="Avatar outfits" active={activeView === "stable"} onClick={() => setActiveView("stable")} />
              <SidebarNavButton icon={Flag} label="Live Stats" description="Broadcast panel" active={activeView === "live"} onClick={() => setActiveView("live")} />
            </div>

            <div style={{ background: "linear-gradient(180deg, rgba(241,245,249,0.95), rgba(226,232,240,0.92))", borderRadius: 28, padding: 18, display: "grid", gap: 14, border: "1px solid rgba(226,232,240,0.95)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#334155", textTransform: "uppercase" }}>Entries ({parsedEntries.length})</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={triggerImportFilePicker} style={{ ...baseButton("outline"), padding: 8, borderRadius: 999 }}><Upload size={14} /></button>
                  <button type="button" onClick={exportEntriesCsv} disabled={!parsedEntries.length} style={{ ...baseButton("outline"), padding: 8, borderRadius: 999 }}><Download size={14} /></button>
                </div>
              </div>

              <textarea value={entriesText} onChange={(e) => setEntriesText(e.target.value)} placeholder="One entry per line, or use commas" style={{ ...inputStyle(), minHeight: 118, resize: "vertical", background: "rgba(255,255,255,0.88)" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
                <input value={entryFilter} onChange={(e) => setEntryFilter(e.target.value)} placeholder="Filter active entries..." style={{ ...inputStyle(), background: "rgba(255,255,255,0.88)" }} />
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#334155", fontWeight: 700 }}>
                  <input type="checkbox" checked={dedupeEntries} onChange={(e) => setDedupeEntries(e.target.checked)} /> Dedupe
                </label>
              </div>
              {duplicateCount > 0 ? <div style={{ fontSize: 12, color: "#b45309" }}>{duplicateCount} duplicate entries removed from the race pool.</div> : null}

              <div style={{ display: "grid", gap: 10 }}>
                {parsedEntries.slice(0, 5).map((entry, index) => (
                  <div key={`${entry}-${index}`} style={{ background: "rgba(255,255,255,0.95)", borderRadius: 999, padding: "10px 12px", display: "flex", alignItems: "center", gap: 12, color: "#1e293b" }}>
                    <span style={{ width: 32, height: 32, borderRadius: 999, background: index === 0 ? "#fff3bf" : index === 1 ? "#dbeafe" : "#fee2e2", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>{index + 1}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry}</span>
                  </div>
                ))}
                {!parsedEntries.length ? <div style={{ color: "#64748b", fontSize: 13, padding: "10px 4px" }}>Add names to populate the roster.</div> : null}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
                <input value={numberStart} onChange={(e) => setNumberStart(e.target.value)} placeholder="Start" style={{ ...inputStyle(), background: "#fff" }} />
                <input value={numberEnd} onChange={(e) => setNumberEnd(e.target.value)} placeholder="End" style={{ ...inputStyle(), background: "#fff" }} />
                <input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Prefix" style={{ ...inputStyle(), background: "#fff" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={generateNumbers} style={baseButton("secondary")}><Dice6 size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />Generate</button>
                <button onClick={() => setEntriesText(SAMPLE)} style={baseButton("outline")}>Sample</button>
                <button onClick={() => setEntriesText("")} style={baseButton("outline")}>Clear</button>
                <button onClick={exportEntriesTxt} disabled={!parsedEntries.length} style={baseButton("outline")}>Export TXT</button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <button onClick={startRaceWithCountdown} disabled={!parsedEntries.length || isRacing || countdownValue !== null} style={{ ...baseButton("primary"), padding: "18px 20px", borderRadius: 999, fontSize: 17, background: "linear-gradient(135deg, #876300 0%, #a37800 100%)", border: "1px solid rgba(135,99,0,0.9)", boxShadow: "0 18px 40px rgba(135,99,0,0.3)" }}>
                <Play size={18} style={{ marginRight: 8, verticalAlign: "text-bottom" }} />
                {countdownValue !== null ? "Counting..." : isRacing ? "Racing..." : "Start Race"}
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={instantPick} disabled={!parsedEntries.length || isRacing || countdownValue !== null} style={{ ...baseButton("secondary"), borderRadius: 999, background: "linear-gradient(135deg, #5ad5ef 0%, #44c7e8 100%)", border: "1px solid rgba(68,199,232,0.9)" }}>
                  <Shuffle size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />Pick
                </button>
                <button onClick={resetVisual} style={{ ...baseButton("outline"), borderRadius: 999 }}>
                  <RotateCcw size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />Reset
                </button>
              </div>
            </div>

            <button onClick={() => setIsAudienceMode((v) => !v)} style={{ ...baseButton("outline"), borderRadius: 18, padding: "14px 16px", justifyContent: "flex-start", display: "flex", alignItems: "center" }}>
              {isAudienceMode ? <Minimize size={18} /> : <Expand size={18} />}
              <span style={{ marginLeft: 8, fontWeight: 800 }}>{isAudienceMode ? "Close Audience Mode" : "Audience Mode"}</span>
            </button>

            {audioBlocked ? <div style={{ fontSize: 12, color: "#b45309" }}>Sound is unavailable in this environment, so the race remains silent.</div> : null}
          </aside>
            ) : null}

          <main style={{ minWidth: 0, display: "grid", gap: 18 }}>
            <section style={{ ...glassCard("rgba(32, 171, 198, 0.25)"), padding: 22, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, opacity: 0.13, backgroundImage: "radial-gradient(rgba(6, 78, 97, 0.75) 1.1px, transparent 1.1px)", backgroundSize: "18px 18px" }} />
              <div style={{ position: "relative", display: "grid", gap: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "start", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 58, fontWeight: 900, color: "#fff", lineHeight: 0.95 }}>The Quackway Circuit</div>
                    <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(236,253,255,0.92)" }}>Grand Finals · Pool A</div>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ ...glassCard("rgba(7, 89, 107, 0.45)"), padding: "18px 26px", minWidth: 150 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(207,250,254,0.82)" }}>Round</div>
                      <div style={{ marginTop: 6, fontSize: 44, fontWeight: 900, color: "#ffd43b", lineHeight: 1 }}>{roundNumber}</div>
                    </div>
                    <div style={{ ...glassCard("rgba(7, 89, 107, 0.45)"), padding: "18px 26px", minWidth: 150 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(207,250,254,0.82)" }}>Position</div>
                      <div style={{ marginTop: 6, fontSize: 44, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{leadingRacer ? `${(leadingRacer.place ?? 0) + 1}/${displayRacers.length || 0}` : `0/${displayRacers.length || 0}`}</div>
                    </div>
                  </div>
                </div>

                {(activeView === "dashboard" || activeView === "live") ? (
                  <div style={{ display: "grid", gap: 18, gridTemplateColumns: "minmax(0, 1fr) 360px", alignItems: "start" }}>
                    <div style={{ minWidth: 0, display: "grid", gap: 18 }}>
                      <div style={{ ...glassCard("rgba(7, 89, 107, 0.16)"), padding: 18 }}>
                        {displayRacers.length ? (
                          <RaceArena
                            racers={displayRacers}
                            progress={displayProgress}
                            placements={placements}
                            isRacing={isRacing}
                            showBurst={showBurst}
                            countdownValue={countdownValue}
                            audience={false}
                            avatarSeed={avatarSeed}
                            motionTime={motionTime}
                          />
                        ) : (
                          <div style={{ minHeight: 520, borderRadius: 28, border: "1px dashed rgba(255,255,255,0.45)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ecfeff", fontWeight: 700 }}>Add entries to launch the race board.</div>
                        )}
                      </div>

                      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 520px)" }}>
                        <div style={{ ...glassCard("rgba(7, 89, 107, 0.32)"), padding: 18 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(207,250,254,0.78)" }}>Recent History</div>
                              <div style={{ marginTop: 4, fontSize: 14, color: "rgba(236,253,255,0.88)" }}>Last finish order snapshot.</div>
                            </div>
                            <History size={18} color="rgba(236,253,255,0.9)" />
                          </div>
                          <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                            {lastResults.slice(0, 5).map((item, index) => (
                              <div key={`${item}-${index}`} style={{ display: "grid", gridTemplateColumns: "64px minmax(0,1fr) auto", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 18, background: "rgba(7, 89, 107, 0.34)", color: "#fff" }}>
                                <span style={{ fontSize: 13, fontWeight: 900, color: index === 0 ? "#ffd43b" : "rgba(236,253,255,0.7)" }}>#{index + 1}</span>
                                <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item}</span>
                                <span style={{ fontSize: 12, color: "rgba(236,253,255,0.58)" }}>{index === 0 ? "Lead" : `+${index}`}</span>
                              </div>
                            ))}
                            {!lastResults.length ? <div style={{ padding: "16px 14px", borderRadius: 18, background: "rgba(7, 89, 107, 0.24)", color: "rgba(236,253,255,0.76)" }}>Result history will appear here after the first race.</div> : null}
                          </div>
                        </div>

                        <div style={{ ...glassCard("rgba(7, 89, 107, 0.44)"), padding: 18, alignSelf: "end" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(207,250,254,0.85)" }}>Turbo Ready</div>
                              <div style={{ marginTop: 8, fontSize: 54, lineHeight: 1, fontWeight: 900, color: "#fff" }}>{Math.round((leadingRacer?.progress ?? 0) * 0.42)}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(236,253,255,0.8)" }}>KM/H</div>
                            </div>
                            <button onClick={startRaceWithCountdown} disabled={!parsedEntries.length || isRacing || countdownValue !== null} style={{ width: 110, height: 110, borderRadius: 999, border: "1px solid rgba(255,212,59,0.85)", background: "linear-gradient(135deg, #ffd43b 0%, #ffbf00 100%)", color: "#172033", boxShadow: "0 16px 34px rgba(255,191,0,0.34)", fontWeight: 900, cursor: "pointer" }}>
                              TURBO
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 16 }}>
                      <div style={{ ...glassCard("rgba(7, 89, 107, 0.42)"), padding: 18 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                          <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(236,253,255,0.88)" }}>Live Ranking</div>
                          <span style={{ ...pill("rgba(255,255,255,0.12)", "#fff", "rgba(255,255,255,0.16)"), textTransform: "uppercase" }}>{isRacing ? "Race On" : "Final Lap"}</span>
                        </div>
                        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                          {liveRanking.slice(0, 5).map((item, index) => {
                            const isLeader = index === 0;
                            return (
                              <div key={`${item.name}-${item.index}`} style={{ borderRadius: 24, padding: isLeader ? 16 : 14, background: isLeader ? "rgba(8, 145, 178, 0.72)" : "rgba(8, 145, 178, 0.42)", border: "1px solid rgba(255,255,255,0.18)", display: "flex", gap: 14, alignItems: "center" }}>
                                <div style={{ width: isLeader ? 62 : 40, height: isLeader ? 62 : 40, borderRadius: 999, background: "rgba(255,255,255,0.14)", border: isLeader ? "3px solid #ffd43b" : "1px solid rgba(255,255,255,0.24)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900 }}>
                                  {item.place !== null ? item.place + 1 : index + 1}
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ fontSize: isLeader ? 18 : 15, fontWeight: 900, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                                  <div style={{ marginTop: 4, fontSize: 13, color: "rgba(236,253,255,0.74)" }}>{item.place !== null ? `${placeLabel(item.place)} locked` : `${Math.round(item.progress)}% track progress`}</div>
                                </div>
                              </div>
                            );
                          })}
                          {!liveRanking.length ? <div style={{ color: "rgba(236,253,255,0.8)", fontSize: 14 }}>Ranking activates once entries are loaded.</div> : null}
                        </div>
                      </div>

                      <div style={{ ...glassCard("rgba(7, 89, 107, 0.38)"), padding: 18 }}>
                        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(236,253,255,0.88)" }}>Podium</div>
                        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                          {podiumWinners.length ? (
                            podiumWinners.map((item) => (
                              <div key={`${item.place}-${item.name}`} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 18, background: "rgba(255,255,255,0.12)", color: "#fff" }}>
                                <div style={{ width: 44, height: 44, borderRadius: 16, background: "rgba(255,255,255,0.9)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                  {item.place === 0 ? <Trophy size={22} color="#d69e00" /> : <Medal size={22} color="#64748b" />}
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(236,253,255,0.72)" }}>{placeLabel(item.place)}</div>
                                  <div style={{ fontSize: 18, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div style={{ padding: "14px 12px", borderRadius: 18, background: "rgba(255,255,255,0.1)", color: "rgba(236,253,255,0.76)" }}>No podium yet.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeView === "dashboard" ? (
                  <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
                    <div style={{ ...card(), padding: 18, display: "grid", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#0f172a" }}><SlidersHorizontal size={18} /><span style={{ fontSize: 18, fontWeight: 900 }}>Race Controls</span></div>
                      <div style={{ display: "grid", gap: 12 }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontWeight: 700, color: "#0f172a" }}>Race duration</span>
                            <span style={{ fontSize: 14, color: "#334155" }}>{duration} sec</span>
                          </div>
                          <Range min={3} max={30} step={1} value={duration} onChange={setDuration} />
                        </div>
                        <div>
                          <label style={{ fontWeight: 700, color: "#0f172a" }}>Podium size</label>
                          <input type="number" min={1} max={activeEntryCount} value={podiumCountInput} onChange={(e) => setPodiumCountInput(e.target.value)} style={{ ...inputStyle(), marginTop: 8 }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                          <div><div style={{ fontWeight: 700, color: "#0f172a" }}>Shuffle entries</div><div style={{ fontSize: 12, color: "#64748b" }}>Random order every race</div></div>
                          <Toggle checked={shuffleBeforeRace} onChange={setShuffleBeforeRace} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                          <div><div style={{ fontWeight: 700, color: "#0f172a" }}>Compact overlay</div><div style={{ fontSize: 12, color: "#64748b" }}>For stream layouts</div></div>
                          <Toggle checked={isCompactOverlay} onChange={setIsCompactOverlay} />
                        </div>
                      </div>
                    </div>

                    <div style={{ ...card(), padding: 18, display: "grid", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#0f172a" }}><Volume2 size={18} /><span style={{ fontSize: 18, fontWeight: 900 }}>Sound + Broadcast</span></div>
                      <div style={{ display: "grid", gap: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                          <div><div style={{ fontWeight: 700, color: "#0f172a" }}>Sound effects</div><div style={{ fontSize: 12, color: "#64748b" }}>Start, race, finish cues</div></div>
                          <Toggle checked={soundEnabled && !audioBlocked} onChange={setSoundEnabled} disabled={audioBlocked} />
                        </div>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontWeight: 700, color: "#0f172a" }}>Master volume</span>
                            <span style={{ fontSize: 12, color: "#64748b" }}>{soundVolume}%</span>
                          </div>
                          <Range min={0} max={200} step={5} value={soundVolume} onChange={setSoundVolume} />
                        </div>
                        <div>
                          <label style={{ fontWeight: 700, color: "#0f172a" }}>Sound preset</label>
                          <select value={soundPreset} onChange={(e) => setSoundPreset(e.target.value)} style={{ ...inputStyle(), marginTop: 8 }}>
                            <option value="sport">Sport</option>
                            <option value="cinematic">Cinematic</option>
                            <option value="minimal">Minimal</option>
                          </select>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
                          <div><div style={{ fontSize: 12, color: "#475569" }}>Countdown {countdownChannelVolume}%</div><Range min={0} max={200} step={5} value={countdownChannelVolume} onChange={setCountdownChannelVolume} /></div>
                          <div><div style={{ fontSize: 12, color: "#475569" }}>Start {startChannelVolume}%</div><Range min={0} max={200} step={5} value={startChannelVolume} onChange={setStartChannelVolume} /></div>
                          <div><div style={{ fontSize: 12, color: "#475569" }}>Race {raceChannelVolume}%</div><Range min={0} max={200} step={5} value={raceChannelVolume} onChange={setRaceChannelVolume} /></div>
                          <div><div style={{ fontSize: 12, color: "#475569" }}>Finish {finishChannelVolume}%</div><Range min={0} max={200} step={5} value={finishChannelVolume} onChange={setFinishChannelVolume} /></div>
                        </div>
                      </div>
                    </div>

                    <div style={{ ...card(), padding: 18, display: "grid", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#0f172a" }}><Sparkles size={18} /><span style={{ fontSize: 18, fontWeight: 900 }}>Seed + Results</span></div>
                      <div style={{ display: "grid", gap: 12 }}>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "#334155", fontWeight: 700 }}>
                          <input type="checkbox" checked={fairnessMode} onChange={(e) => setFairnessMode(e.target.checked)} /> Fairness mode
                        </label>
                        <input value={raceSeedInput} onChange={(e) => setRaceSeedInput(e.target.value.replace(/\s+/g, ""))} placeholder="Optional race seed" style={inputStyle()} aria-label="Race seed" />
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" onClick={randomizeSeed} style={baseButton("outline")}>Randomize seed</button>
                          <button type="button" onClick={copyShareLink} style={baseButton("outline")}>Copy share link</button>
                        </div>
                        {copyNotice ? <div style={{ fontSize: 12, color: "#0f766e" }}>{copyNotice}</div> : null}
                        <div style={{ fontSize: 12, color: "#64748b" }}>Round {roundNumber} · Logs {raceLogs.length}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" onClick={exportResultsCsv} disabled={!lastWinners.length} style={baseButton("outline")}>Results CSV</button>
                          <button type="button" onClick={exportHistoryJson} disabled={!lastResults.length} style={baseButton("outline")}>History JSON</button>
                          <button type="button" onClick={exportRaceLogJson} disabled={!raceLogs.length} style={baseButton("outline")}>Race log</button>
                          <button type="button" onClick={clearSavedState} style={baseButton("outline")}>Clear saved data</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeView === "live" ? (
                  <div style={{ ...glassCard("rgba(7, 89, 107, 0.48)"), padding: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
                      <div style={{ width: 110, height: 8, borderRadius: 999, background: "#ffd43b", boxShadow: "0 0 18px rgba(255,212,59,0.45)" }} />
                      <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "#fff" }}>Turbo Ready</div>
                    </div>
                    <button onClick={startRaceWithCountdown} disabled={!parsedEntries.length || isRacing || countdownValue !== null} style={{ width: 98, height: 98, borderRadius: 999, border: "1px solid rgba(255,212,59,0.85)", background: "linear-gradient(135deg, #ffd43b 0%, #ffbf00 100%)", color: "#172033", fontWeight: 900, cursor: "pointer" }}>GO</button>
                    <button onClick={instantPick} disabled={!parsedEntries.length || isRacing || countdownValue !== null} style={{ ...baseButton("light"), minWidth: 120 }}>Instant pick</button>
                    <button onClick={() => setIsAudienceMode((v) => !v)} style={{ ...baseButton("light"), minWidth: 140 }}>{isAudienceMode ? "Close audience" : "Audience mode"}</button>
                    <button onClick={resetVisual} style={{ ...baseButton("light"), minWidth: 120 }}>Reset stage</button>
                    <button onClick={() => setSoundEnabled((v) => !v)} disabled={audioBlocked} style={{ ...baseButton("light"), minWidth: 110 }}>{soundEnabled && !audioBlocked ? "Mute" : "Sound"}</button>
                  </div>
                ) : null}

                {activeView === "stable" ? (
                  <div style={{ display: "grid", gap: 18, gridTemplateColumns: "minmax(0, 1fr) 420px", alignItems: "start" }}>
                    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", maxHeight: "calc(100vh - 250px)", overflowY: "auto", paddingRight: 10, alignContent: "start" }}>
                      {stablePreviewEntries.map((name, index) => {
                        const variant = buildDuckVariant(name, avatarSeed);
                        return (
                          <div key={`${name}-${index}`} style={{ ...card(), padding: 18, display: "grid", gap: 14, justifyItems: "center" }}>
                            <DuckPreviewBadge index={index} variant={variant} motionTime={motionTime} />
                            <div style={{ textAlign: "center" }}>
                              <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{name}</div>
                              <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>Accessory: {variant.accessory} · Pattern: {variant.pattern}</div>
                            </div>
                          </div>
                        );
                      })}
                      {!stablePreviewEntries.length ? <div style={{ ...card(), padding: 24, color: "#64748b" }}>Add entries to preview duck variants.</div> : null}
                    </div>

                    <div style={{ ...card(), padding: 20, display: "grid", gap: 16, alignSelf: "start" }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>Duck Stable</div>
                      <div style={{ fontSize: 14, color: "#475569" }}>The same procedural duck avatar system is still active here. Outfits can reroll each round, but the avatar stays in the existing illustrated style instead of swapping to a flat 2D icon.</div>
                      <div style={{ display: "grid", gap: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                          <div><div style={{ fontWeight: 700, color: "#0f172a" }}>Reroll avatar style each round</div><div style={{ fontSize: 12, color: "#64748b" }}>Keep random outfits enabled.</div></div>
                          <Toggle checked={rerollAvatarsEachRound} onChange={setRerollAvatarsEachRound} />
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" onClick={() => setAvatarSeed((value) => value + 1)} style={baseButton("secondary")}>Random outfits now</button>
                          <button type="button" onClick={instantPick} disabled={!parsedEntries.length || isRacing || countdownValue !== null} style={baseButton("outline")}>Test instant pick</button>
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>Preview count: {stablePreviewEntries.length} · Avatar seed: {avatarSeed}</div>
                      </div>

                      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14, display: "grid", gap: 12 }}>
                        <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Round elimination rules</div>
                        <PlaceSelectionRow
                          podiumSlots={podiumSlots}
                          eliminationPlaces={eliminationPlaces}
                          onToggle={toggleEliminationPlace}
                          onClear={() => setEliminationPlaces([])}
                          onFirstOnly={() => setEliminationPlaces([0])}
                          onAll={() => setEliminationPlaces(Array.from({ length: podiumSlots }).map((_, index) => index))}
                        />
                        <button type="button" onClick={undoLastElimination} disabled={!lastEliminationUndo} style={baseButton("outline")}>Undo last elimination</button>
                      </div>

                      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14, display: "grid", gap: 10 }}>
                        <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Tournament rounds</div>
                        <button onClick={startRaceWithCountdown} disabled={!parsedEntries.length || isRacing || countdownValue !== null} style={baseButton("secondary")}>Run next round</button>
                        {roundHistory.length ? (
                          <div style={{ display: "grid", gap: 8, maxHeight: 240, overflow: "auto", paddingRight: 4 }}>
                            {roundHistory.slice().reverse().map((round) => (
                              <div key={`round-${round.round}-${round.winners.join("|")}`} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 12px" }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Round {round.round}</div>
                                <div style={{ fontSize: 13, color: "#0f172a", marginTop: 4 }}>Winners: {round.winners.join(", ") || "-"}</div>
                                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Eliminated: {round.eliminated.join(", ") || "None"}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ border: "1px dashed #cbd5e1", borderRadius: 14, padding: 14, color: "#64748b", textAlign: "center" }}>Run races to build bracket history.</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </main>
        </div>
        </div>
      ) : null}

      {isAudienceMode || isOverlayRoute ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: initialConfig.overlayTheme === "chroma" ? "#00ff00" : isCompactOverlay ? "rgba(6, 78, 97, 0.7)" : "rgba(3, 30, 39, 0.92)", padding: isCompactOverlay ? 10 : 16 }}>
          <div style={{ maxWidth: 1840, margin: "0 auto", height: "100%", display: "grid", gap: isCompactOverlay ? 10 : 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div>
                <div style={{ fontSize: isCompactOverlay ? 22 : 32, fontWeight: 900, color: "#fff" }}>{isCompactOverlay ? "Overlay Mode" : "Audience Mode"}</div>
                {!isCompactOverlay ? <div style={{ fontSize: 14, color: "#cbd5e1" }}>Broadcast-first teal race presentation with the same duck avatar system and controls.</div> : null}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={startRaceWithCountdown} disabled={!parsedEntries.length || isRacing || countdownValue !== null} style={baseButton("light")}>
                  <Play size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
                  {countdownValue !== null ? "Counting..." : isRacing ? "Racing..." : "Start"}
                </button>
                {!isOverlayRoute ? <button onClick={() => setIsAudienceMode(false)} style={baseButton("secondary")}><Minimize size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />Close</button> : null}
              </div>
            </div>

            <div style={{ position: "relative", minHeight: 0, flex: 1 }}>
              {displayRacers.length ? (
                <RaceArena
                  racers={displayRacers}
                  progress={displayProgress}
                  placements={placements}
                  isRacing={isRacing}
                  showBurst={showBurst}
                  countdownValue={countdownValue}
                  audience={true}
                  avatarSeed={avatarSeed}
                  motionTime={motionTime}
                />
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 36, background: "rgba(255,255,255,0.12)", color: "#dff9ff" }}>Add entries, then start the race.</div>
              )}

              <div style={{ position: "absolute", right: 16, top: 20, zIndex: 20, width: isCompactOverlay ? 250 : 340, maxWidth: "42vw", display: "grid", gap: 10, pointerEvents: "none" }}>
                {liveRanking.slice(0, 4).map((item, index) => (
                  <div key={`overlay-live-${item.name}-${index}`} style={{ border: "1px solid rgba(255,255,255,0.15)", background: index === 0 ? "rgba(8,145,178,0.78)" : "rgba(8,145,178,0.44)", borderRadius: 22, padding: isCompactOverlay ? "10px 12px" : "12px 16px", boxShadow: "0 10px 30px rgba(15,23,42,0.16)", backdropFilter: "blur(8px)", color: "#fff" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(207,250,254,0.82)" }}>{item.place !== null ? placeLabel(item.place) : `Lane ${index + 1}`}</div>
                    <div style={{ marginTop: 4, fontSize: isCompactOverlay ? 18 : 22, fontWeight: 800, wordBreak: "break-word" }}>{item.name}</div>
                  </div>
                ))}
              </div>

              <div style={{ position: "absolute", right: 16, bottom: 16, zIndex: 20, width: isCompactOverlay ? 230 : 280, maxWidth: "42vw", display: "grid", gap: 8, pointerEvents: "none" }}>
                {podiumWinners.length ? (
                  podiumWinners.map((item) => {
                    const colors = getPlaceColors(item.place);
                    return (
                      <div key={`overlay-${item.place}-${item.name}`} style={{ border: `1px solid ${colors.border}`, background: colors.bg, borderRadius: 22, padding: isCompactOverlay ? "10px 12px" : "12px 16px", boxShadow: "0 10px 30px rgba(15,23,42,0.16)", backdropFilter: "blur(8px)" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#64748b" }}>{placeLabel(item.place)}</div>
                        <div style={{ marginTop: 4, fontSize: isCompactOverlay ? 18 : 22, fontWeight: 800, color: "#0f172a", wordBreak: "break-word" }}>{item.name}</div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.85)", borderRadius: 22, padding: "12px 16px", color: "#475569", boxShadow: "0 10px 30px rgba(15,23,42,0.16)" }}>Podium will appear here.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
