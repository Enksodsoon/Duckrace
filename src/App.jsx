
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

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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
    { bodyA: "#ffffff", bodyB: "#e2e8f0", wing: "#cbd5e1", accent: "#3b82f6", accentSoft: "#bfdbfe", bill: "#f59e0b" },
    { bodyA: "#fff1f2", bodyB: "#fecdd3", wing: "#fda4af", accent: "#e11d48", accentSoft: "#fecdd3", bill: "#fb923c" },
    { bodyA: "#ecfeff", bodyB: "#ccfbf1", wing: "#99f6e4", accent: "#14b8a6", accentSoft: "#99f6e4", bill: "#f97316" },
    { bodyA: "#f5f3ff", bodyB: "#e9d5ff", wing: "#d8b4fe", accent: "#9333ea", accentSoft: "#ddd6fe", bill: "#fb923c" },
    { bodyA: "#fefce8", bodyB: "#fef3c7", wing: "#fde68a", accent: "#ca8a04", accentSoft: "#fef08a", bill: "#f97316" },
    { bodyA: "#eff6ff", bodyB: "#dbeafe", wing: "#93c5fd", accent: "#2563eb", accentSoft: "#bfdbfe", bill: "#fb923c" },
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
    primary: { background: "#0f172a", color: "#fff", border: "1px solid #0f172a" },
    secondary: { background: "#e2e8f0", color: "#0f172a", border: "1px solid #cbd5e1" },
    outline: { background: "#fff", color: "#0f172a", border: "1px solid #cbd5e1" },
    light: { background: "#fff", color: "#0f172a", border: "1px solid #fff" },
  };
  return {
    ...styles[kind],
    borderRadius: 16,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
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
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 700,
  };
}

function card() {
  return {
    background: "rgba(255,255,255,0.88)",
    border: "1px solid #e2e8f0",
    borderRadius: 28,
    boxShadow: "0 20px 60px rgba(15,23,42,0.06)",
    backdropFilter: "blur(8px)",
  };
}

function inputStyle() {
  return {
    width: "100%",
    borderRadius: 16,
    border: "1px solid #cbd5e1",
    padding: "10px 12px",
    background: "#fff",
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
  const isPodium = place > -1;

  return (
    <div style={{
      position: "absolute",
      left: 0,
      top: 0,
      transform: `translate(-50%, calc(-50% - ${bob}px)) scale(${scale}) rotate(${tilt * variant.tiltAccent}deg)`,
      transformOrigin: "center center",
    }}>
      <div style={{ position: "absolute", left: 16, top: 40, width: 48, height: 12, borderRadius: 999, background: winner ? "rgba(245,158,11,0.15)" : "rgba(15,23,42,0.1)", transform: `scale(${shadowScale})` }} />
      <div style={{ position: "relative", width: 80, height: 64 }}>
        <div style={{
          position: "absolute",
          left: 12,
          top: 20,
          width: 48,
          height: 36,
          borderRadius: 999,
          border: `1px solid ${winner ? "#fcd34d" : isPodium ? "#cbd5e1" : "#e2e8f0"}`,
          background: `linear-gradient(180deg, ${variant.palette.bodyA} 0%, ${variant.palette.bodyB} 100%)`,
          boxShadow: winner ? "0 8px 24px rgba(245,158,11,0.18)" : "0 8px 20px rgba(15,23,42,0.08)",
        }}>
          <div style={{ position: "absolute", left: 8, right: 8, top: 4, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.7)" }} />
          <DuckPattern variant={variant} />
          <div style={{ position: "absolute", left: 4, top: 12, width: 24, height: 20, borderRadius: 999, border: "1px solid rgba(226,232,240,0.8)", background: variant.palette.wing, transform: `rotate(${wing}deg)` }} />
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
          background: `linear-gradient(180deg, ${variant.palette.bodyA} 0%, ${variant.palette.bodyB} 100%)`,
        }}>
          <div style={{ position: "absolute", left: 16, top: 12, width: 2, height: 2, borderRadius: 999, background: "#0f172a", transform: `scale(${variant.eyeSize})` }} />
          <div style={{ position: "absolute", left: 12, top: 8, width: 8, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.7)" }} />
        </div>
        <div style={{ position: "absolute", left: 68, top: 16, width: 16, height: 12, borderRadius: "3px 999px 999px 3px", background: variant.palette.bill }} />
        <div style={{ position: "absolute", left: 68, top: 23, width: 14, height: 10, opacity: 0.85, borderRadius: "3px 999px 999px 3px", background: variant.palette.bill }} />
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
    <div style={{ position: "relative", width: "100%", overflow: "hidden", borderRadius: 32, border: "1px solid #e2e8f0", background: "rgba(255,255,255,0.9)", boxShadow: "0 20px 60px rgba(15,23,42,0.06)" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top, rgba(255,255,255,0.98), rgba(248,250,252,0.94) 46%, rgba(241,245,249,0.98) 100%)" }} />
      <WinnerBanner name={winnerName} show={Boolean(winnerName && !isRacing && countdownValue === null)} audience={audience} />
      <CountdownOverlay value={countdownValue} audience={audience} />

      <div style={{ position: "relative", ...metrics.heightStyle }}>
        <div style={{ position: "absolute", top: 16, left: audience ? 24 : 20, zIndex: 10 }}><div style={pill()}>Start</div></div>
        <div style={{ position: "absolute", top: 16, right: audience ? 24 : 20, zIndex: 10 }}><div style={pill("#fffbeb", "#b45309", "#fde68a")}>Finish</div></div>

        <div style={{ position: "absolute", top: "16%", bottom: "7%", left: `${metrics.startX}%`, right: `${100 - metrics.finishX}%`, borderRadius: 28, border: "1px solid rgba(203,213,225,0.7)", background: "rgba(248,250,252,0.75)" }} />

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
              <div style={{ position: "absolute", left: 0, right: 0, top: `${yPct}%`, borderTop: `1px solid ${place > -1 ? colors.border : "rgba(226,232,240,0.8)"}` }} />
              <div style={{
                position: "absolute",
                top: `${yPct}%`,
                left: `calc(${metrics.startX}% - 0.75rem)`,
                transform: "translateY(-50%)",
                maxWidth: audience ? "18rem" : "14rem",
                padding: "6px 10px",
                borderRadius: 999,
                border: `1px solid ${place > -1 ? colors.border : "#e2e8f0"}`,
                background: place > -1 ? colors.bg : "rgba(255,255,255,0.85)",
                backdropFilter: "blur(4px)",
                zIndex: 10,
                fontSize: metrics.labelSize,
                fontWeight: 600,
                color: "#334155",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {name}
              </div>

              <div style={{ position: "absolute", top: `${yPct}%`, right: audience ? 20 : 16, transform: "translateY(-50%)", zIndex: 10, color: "#64748b", fontWeight: 700, fontSize: metrics.percentSize }}>
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

              <div style={{ position: "absolute", top: `${yPct}%`, left: `${xPct}%`, zIndex: 20, filter: winner && showBurst ? "drop-shadow(0 0 25px rgba(251,191,36,0.65))" : "none" }}>
                <DuckSprite winner={winner} place={place} active={isRacing} progress={pct} index={index} scale={metrics.duckScale} variant={variant} motionTime={motionTime} />
              </div>

              {winner && showBurst ? (
                <>
                  <div style={{ position: "absolute", top: `${yPct}%`, left: `${metrics.finishX}%`, transform: "translate(-50%,-50%)", zIndex: 10, width: audience ? 128 : 80, height: audience ? 128 : 80, borderRadius: 999, background: "rgba(253,224,71,0.18)", filter: "blur(18px)" }} />
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

        <div style={{ position: "absolute", top: "16%", bottom: "7%", left: `${metrics.finishX}%`, borderRight: "4px dashed rgba(251,191,36,0.9)", zIndex: 10 }} />
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

export default function App() {
  const initialConfig = useMemo(() => {
    const safeWindow = typeof window !== "undefined" ? window : null;
    const params = safeWindow ? new URLSearchParams(safeWindow.location.search) : null;
    const seedParam = params?.get("seed") ?? "";
    const audienceParam = parseBooleanParam(params?.get("audience"), false) || params?.get("view") === "overlay";
    return {
      seedParam,
      audienceParam,
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

  const fileImportRef = useRef(null);

  const animationRef = useRef(null);
  const progressRef = useRef([]);
  const audioContextRef = useRef(null);
  const countdownTimeoutsRef = useRef([]);

  const parsedEntries = useMemo(() => splitEntries(entriesText), [entriesText]);
  const activeEntryCount = Math.max(parsedEntries.length, racers.length, 1);
  const parsedPodiumInput = Number(podiumCountInput);
  const podiumRequested = Number.isFinite(parsedPodiumInput) ? Math.floor(parsedPodiumInput) : 3;
  const podiumSlots = clamp(Math.max(1, podiumRequested || 1), 1, activeEntryCount);
  const displayRacers = racers.length ? racers : parsedEntries;
  const displayProgress = progress.length === displayRacers.length ? progress : displayRacers.map(() => 0);
  const podiumWinners = placements.slice().sort((a, b) => a.place - b.place).map((item) => ({ place: item.place, name: displayRacers[item.raceIndex] }));
  const activeSeed = raceSeedInput.trim();
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
      if (typeof parsed.duration === "number") setDuration(clamp(parsed.duration, 3, 12));
      if (typeof parsed.shuffleBeforeRace === "boolean") setShuffleBeforeRace(parsed.shuffleBeforeRace);
      if (typeof parsed.soundEnabled === "boolean") setSoundEnabled(parsed.soundEnabled);
      if (typeof parsed.soundVolume === "number") setSoundVolume(clamp(parsed.soundVolume, 0, 100));
      if (typeof parsed.rerollAvatarsEachRound === "boolean") setRerollAvatarsEachRound(parsed.rerollAvatarsEachRound);
      if (typeof parsed.podiumCountInput === "string") setPodiumCountInput(parsed.podiumCountInput);
      if (Array.isArray(parsed.eliminationPlaces)) setEliminationPlaces(parsed.eliminationPlaces.filter((n) => Number.isInteger(n) && n >= 0));
      if (Array.isArray(parsed.lastResults)) setLastResults(parsed.lastResults.slice(0, 8).map(String));
      if (typeof parsed.raceSeedInput === "string" && !initialConfig.seedParam) setRaceSeedInput(parsed.raceSeedInput);
      if (typeof parsed.isCompactOverlay === "boolean") setIsCompactOverlay(parsed.isCompactOverlay);
    } catch {
      // Ignore malformed saved data.
    }
  }, [initialConfig.seedParam]);

  useEffect(() => {
    const safeWindow = typeof window !== "undefined" ? window : null;
    if (!safeWindow) return;
    const payload = {
      entriesText,
      numberStart,
      numberEnd,
      prefix,
      duration,
      shuffleBeforeRace,
      soundEnabled,
      soundVolume,
      rerollAvatarsEachRound,
      podiumCountInput,
      eliminationPlaces,
      lastResults,
      raceSeedInput,
      isCompactOverlay,
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
    rerollAvatarsEachRound,
    podiumCountInput,
    eliminationPlaces,
    lastResults,
    raceSeedInput,
    isCompactOverlay,
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
        const volumeScale = clamp(soundVolume / 100, 0, 1);
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
    playToneSequence([
      { freq: 330, at: 0, duration: 0.08, volume: 0.03, type: "triangle" },
      { freq: 440, at: 0.1, duration: 0.08, volume: 0.03, type: "triangle" },
      { freq: 554, at: 0.2, duration: 0.1, volume: 0.035, type: "triangle" },
    ]);
  }

  function playFinishSound() {
    playToneSequence([
      { freq: 523, at: 0, duration: 0.12, volume: 0.04, type: "triangle" },
      { freq: 659, at: 0.08, duration: 0.12, volume: 0.04, type: "triangle" },
      { freq: 784, at: 0.16, duration: 0.18, volume: 0.05, type: "triangle" },
      { freq: 1046, at: 0.3, duration: 0.24, volume: 0.05, type: "sine" },
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

  function storeResults(winners) {
    if (!winners.length) return;
    setLastWinners(winners);
    const summary = winners.map((name, index) => `${placeLabel(index)} ${name}`).join(" • ");
    setLastResults((prev) => [summary, ...prev.filter((item) => item !== summary)].slice(0, 8));
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
    safeWindow.localStorage.removeItem(STORAGE_KEY);
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
    storeResults(winnersByPlace);
    maybeEliminateWinners(winnersByPlace);
    playFinishSound();
  }

  function runRace() {
    const nextAvatarSeed = rerollAvatarsEachRound ? getNextAvatarSeed() : 0;
    const list = parsedEntries;
    if (!list.length) return;
    const rng = makeRaceRng("race");

    clearAnimation();

    const raceList = shuffleBeforeRace ? seededShuffle(list, rng) : [...list];
    const finishOrder = seededShuffle(raceList.map((_, index) => index), rng);
    const podiumOrder = finishOrder.slice(0, Math.min(podiumSlots, raceList.length));
    const durationMs = Math.max(3, duration) * 1000;
    const startAt = performance.now();
    let finalized = false;

    const plans = raceList.map((_, index) => {
      const place = podiumOrder.indexOf(index);
      const target =
        place === 0 ? 100 :
        place === 1 ? 97 :
        place === 2 ? 94 :
        place > -1 ? 92 - Math.min(place - 2, 6) * 1.6 :
        80 + rng() * 8;
      return {
        place,
        target,
        phase: rng() * Math.PI * 2,
        wobbleA: 0.7 + rng() * 0.9,
        wobbleB: 0.8 + rng() * 0.8,
        surgeAt:
          place === 0 ? 0.72 :
          place === 1 ? 0.69 :
          place === 2 ? 0.66 :
          place > -1 ? 0.62 :
          0.42 + rng() * 0.25,
        surgeWidth: 0.11 + rng() * 0.08,
        surgeBoost:
          place === 0 ? 9 + rng() * 4 :
          place === 1 ? 6 + rng() * 3 :
          place === 2 ? 4 + rng() * 2 :
          place > -1 ? 2 + rng() * 2 :
          1.5 + rng() * 3,
      };
    });

    const finalizeRace = () => {
      if (finalized) return;
      finalized = true;
      const placementMap = podiumOrder.map((raceIndex, place) => ({ raceIndex, place }));
      const winnersByPlace = placementMap.map(({ raceIndex }) => raceList[raceIndex]);
      progressRef.current = plans.map((plan) => plan.target);
      setProgress(plans.map((plan) => plan.target));
      setPlacements(placementMap);
      setIsRacing(false);
      setShowBurst(true);
      storeResults(winnersByPlace);
      maybeEliminateWinners(winnersByPlace);
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

    const frame = (now) => {
      setMotionTime(now);
      const t = clamp((now - startAt) / durationMs, 0, 1);

      const nextProgress = plans.map((plan, index) => {
        const main = plan.target * (0.3 * easeOutCubic(t) + 0.7 * easeInOut(t));
        const surgeDistance = Math.abs(t - plan.surgeAt);
        const surgeFactor = Math.max(0, 1 - surgeDistance / plan.surgeWidth);
        const surge = surgeFactor * plan.surgeBoost;
        const wobble =
          (Math.sin(now * 0.006 * plan.wobbleA + plan.phase) +
            Math.sin(now * 0.0038 * plan.wobbleB + plan.phase * 0.6)) *
          (1 - t) * 0.45;
        const computed = clamp(main + surge + wobble, 0, plan.target);
        const previous = progressRef.current[index] ?? 0;
        return Math.min(Math.max(previous, computed), plan.target);
      });

      progressRef.current = nextProgress;
      setProgress(nextProgress);

      const leaderIndex = podiumOrder[0];
      const leaderProgress = leaderIndex !== undefined ? nextProgress[leaderIndex] : 0;
      if (leaderProgress >= 99.4 || t >= 0.992) {
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
    countdownTimeoutsRef.current = [
      setTimeout(() => setCountdownValue(2), 900),
      setTimeout(() => setCountdownValue(1), 1800),
      setTimeout(() => setCountdownValue(null), 2700),
      setTimeout(() => runRace(), 2750),
    ];
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top, rgba(255,255,255,1), rgba(248,250,252,1) 45%, rgba(241,245,249,1) 100%)", padding: 16 }}>
      <input ref={fileImportRef} type="file" accept=".txt,.csv,text/plain,text/csv" onChange={handleImportEntries} style={{ display: "none" }} />
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={pill("#fff", "#475569", "#e2e8f0")}>Shared race track</span>
              <span style={pill("#fff", "#475569", "#e2e8f0")}>Procedural duck avatars</span>
            </div>
            <div style={{ fontSize: 40, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>Duck Race Randomizer</div>
            <div style={{ marginTop: 8, color: "#475569" }}>Lightweight procedurally generated duck avatars with deterministic outfits, colors, and patterns for each group.</div>
            {audioBlocked ? <div style={{ marginTop: 8, fontSize: 12, color: "#b45309" }}>Sound is unavailable in this environment, so the race stays silent.</div> : null}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={pill("#fff", "#334155", "#e2e8f0")}>{parsedEntries.length} entries</span>
            <span style={pill("#fff", "#334155", "#e2e8f0")}>podium {podiumSlots}</span>
          </div>
        </div>

        <div style={{ display: "grid", gap: 24, gridTemplateColumns: "380px minmax(0,1fr)" }}>
          <div style={card()}>
            <div style={{ padding: "22px 22px 0", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Setup</div>
            <div style={{ padding: 22, display: "grid", gap: 20 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontWeight: 700, color: "#0f172a" }}>Names / groups / case numbers</label>
                <textarea value={entriesText} onChange={(e) => setEntriesText(e.target.value)} placeholder="One item per line, or separated by commas" style={{ ...inputStyle(), minHeight: 220, resize: "vertical" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ fontWeight: 700, color: "#0f172a" }}>Start</label>
                  <input value={numberStart} onChange={(e) => setNumberStart(e.target.value)} style={inputStyle()} />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ fontWeight: 700, color: "#0f172a" }}>End</label>
                  <input value={numberEnd} onChange={(e) => setNumberEnd(e.target.value)} style={inputStyle()} />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ fontWeight: 700, color: "#0f172a" }}>Prefix</label>
                  <input value={prefix} onChange={(e) => setPrefix(e.target.value)} style={inputStyle()} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={generateNumbers} style={baseButton("secondary")}><Shuffle size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />Generate</button>
                <button onClick={triggerImportFilePicker} style={baseButton("outline")}>Import CSV/TXT</button>
                <button onClick={exportEntriesCsv} disabled={!parsedEntries.length} style={baseButton("outline")}>Export CSV</button>
                <button onClick={() => setEntriesText(SAMPLE)} style={baseButton("outline")}>Sample</button>
                <button onClick={() => setEntriesText("")} style={baseButton("outline")}>Clear</button>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: 24, padding: 16, display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, color: "#0f172a" }}>Race duration</span>
                    <span style={{ fontSize: 14, color: "#334155" }}>{duration} sec</span>
                  </div>
                  <Range min={3} max={12} step={1} value={duration} onChange={setDuration} />
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ fontWeight: 700, color: "#0f172a" }}>Podium size</label>
                  <input type="number" min={1} max={activeEntryCount} value={podiumCountInput} onChange={(e) => setPodiumCountInput(e.target.value)} style={inputStyle()} />
                  <div style={{ fontSize: 12, color: "#64748b" }}>Choose how many ranked winners to show. Maximum is the number of entries.</div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>Shuffle entries</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Random order for each race</div>
                  </div>
                  <Toggle checked={shuffleBeforeRace} onChange={setShuffleBeforeRace} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>Sound effects</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Start and finish tones</div>
                  </div>
                  <Toggle checked={soundEnabled && !audioBlocked} onChange={setSoundEnabled} disabled={audioBlocked} />
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, color: "#0f172a" }}>Sound volume</span>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{soundVolume}%</span>
                  </div>
                  <Range min={0} max={100} step={5} value={soundVolume} onChange={setSoundVolume} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>Reroll avatar style each round</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Off = same duck style per group name. On = new style every race.</div>
                  </div>
                  <Toggle checked={rerollAvatarsEachRound} onChange={setRerollAvatarsEachRound} />
                </div>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: 24, padding: 16, display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>Seeded reproducibility</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Use the same seed + entries + settings to reproduce identical race outcomes.</div>
                <input
                  value={raceSeedInput}
                  onChange={(e) => setRaceSeedInput(e.target.value.replace(/\s+/g, ""))}
                  placeholder="Optional race seed"
                  style={inputStyle()}
                  aria-label="Race seed"
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={randomizeSeed} style={baseButton("outline")}>Randomize seed</button>
                  <button type="button" onClick={copyShareLink} style={baseButton("outline")}>Copy share link</button>
                </div>
                {copyNotice ? <div style={{ fontSize: 12, color: "#0f766e" }}>{copyNotice}</div> : null}
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: 24, padding: 16, display: "grid", gap: 8 }}>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>Eliminate after each round</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Choose exactly which podium places should be removed before the next round.</div>
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button onClick={startRaceWithCountdown} disabled={!parsedEntries.length || isRacing || countdownValue !== null} style={baseButton("primary")}>
                  <Play size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
                  {countdownValue !== null ? "Counting..." : isRacing ? "Racing..." : "Start race"}
                </button>
                <button onClick={instantPick} disabled={!parsedEntries.length || isRacing || countdownValue !== null} style={baseButton("secondary")}>
                  <Shuffle size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />Instant pick
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button onClick={resetVisual} style={baseButton("outline")}><RotateCcw size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />Reset stage</button>
                <button onClick={() => setIsAudienceMode((v) => !v)} style={baseButton("outline")}>
                  {(isAudienceMode ? <Minimize size={16} /> : <Expand size={16} />)}
                  <span style={{ marginLeft: 6 }}>{isAudienceMode ? "Close audience" : "Audience mode"}</span>
                </button>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>Compact overlay mode</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Smaller presenter controls for stream overlays.</div>
                  </div>
                  <Toggle checked={isCompactOverlay} onChange={setIsCompactOverlay} />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={exportResultsCsv} disabled={!lastWinners.length} style={baseButton("outline")}>Export results CSV</button>
                  <button type="button" onClick={exportHistoryJson} disabled={!lastResults.length} style={baseButton("outline")}>Export history JSON</button>
                  <button type="button" onClick={exportEntriesTxt} disabled={!parsedEntries.length} style={baseButton("outline")}>Export TXT</button>
                  <button type="button" onClick={clearSavedState} style={baseButton("outline")}>Clear saved data</button>
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Hotkeys: <strong>R</strong> start race, <strong>I</strong> instant pick, <strong>M</strong> toggle sound.</div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 24 }}>
            <div style={card()}>
              <div style={{ padding: "20px 22px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Shared race track</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b" }}>
                  {soundEnabled && !audioBlocked ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  <Sparkles size={14} /> custom duck avatars
                </div>
              </div>
              <div style={{ padding: 22 }}>
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
                  <div style={{ border: "1px dashed #cbd5e1", borderRadius: 28, padding: 48, textAlign: "center", color: "#64748b" }}>Add entries, then start the race.</div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div style={card()}>
                <div style={{ padding: "20px 22px 0", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Podium</div>
                <div style={{ padding: 22 }}>
                  {podiumWinners.length ? (
                    <div style={{ display: "grid", gap: 12 }}>
                      {podiumWinners.map((item) => {
                        const colors = getPlaceColors(item.place);
                        return (
                          <div key={`${item.place}-${item.name}`} style={{ border: `1px solid ${colors.border}`, background: colors.bg, borderRadius: 24, padding: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{ background: "#fff", padding: 12, borderRadius: 16, boxShadow: "0 4px 12px rgba(15,23,42,0.06)" }}>
                                {item.place === 0 ? <Trophy size={24} color="#f59e0b" /> : <Medal size={24} color="#64748b" />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, color: "#64748b" }}>{placeLabel(item.place)}</div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                              </div>
                              <span style={pill(colors.chipBg, colors.chipText, colors.border)}>{placeLabel(item.place)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ border: "1px dashed #cbd5e1", borderRadius: 28, padding: 40, textAlign: "center", color: "#64748b" }}>No podium yet.</div>
                  )}
                </div>
              </div>

              <div style={card()}>
                <div style={{ padding: "20px 22px 0", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Recent results</div>
                <div style={{ padding: 22 }}>
                  {lastResults.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {lastResults.map((item, index) => (
                        <div key={`${item}-${index}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: "1px solid #e2e8f0", borderRadius: 16, padding: "10px 12px" }}>
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#334155", fontWeight: 600 }}>{item}</span>
                          <span style={pill("#fff", "#334155", "#e2e8f0")}>#{index + 1}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ border: "1px dashed #cbd5e1", borderRadius: 28, padding: 40, textAlign: "center", color: "#64748b" }}>Result history will appear here.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isAudienceMode ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: isCompactOverlay ? "rgba(2,6,23,0.75)" : "rgba(2,6,23,0.94)", padding: isCompactOverlay ? 10 : 16 }}>
          <div style={{ maxWidth: 1800, margin: "0 auto", height: "100%", display: "grid", gap: isCompactOverlay ? 10 : 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div>
                <div style={{ fontSize: isCompactOverlay ? 22 : 32, fontWeight: 900, color: "#fff" }}>{isCompactOverlay ? "Overlay Mode" : "Audience Mode"}</div>
                {!isCompactOverlay ? <div style={{ fontSize: 14, color: "#cbd5e1" }}>This version uses only plain React + native controls, so it is safer to deploy on Vercel.</div> : null}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={startRaceWithCountdown} disabled={!parsedEntries.length || isRacing || countdownValue !== null} style={baseButton("light")}>
                  <Play size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
                  {countdownValue !== null ? "Counting..." : isRacing ? "Racing..." : "Start"}
                </button>
                <button onClick={() => setIsAudienceMode(false)} style={baseButton("secondary")}><Minimize size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />Close</button>
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
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 36, background: "rgba(255,255,255,0.95)", color: "#64748b" }}>Add entries, then start the race.</div>
              )}

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
