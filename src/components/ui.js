// Shared presentational style helpers (pure functions returning style objects).
export function getPlaceColors(place) {
  if (place === 0) return { border: "#fde68a", bg: "#fffbeb", chipBg: "#fef3c7", chipText: "#92400e" };
  if (place === 1) return { border: "#d1d5db", bg: "#f9fafb", chipBg: "#e5e7eb", chipText: "#374151" };
  if (place === 2) return { border: "#fdba74", bg: "#fff7ed", chipBg: "#fed7aa", chipText: "#9a3412" };
  return { border: "#bae6fd", bg: "#f0f9ff", chipBg: "#e0f2fe", chipText: "#0c4a6e" };
}

export function baseButton(kind = "primary") {
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

export function pill(bg = "#fff", color = "#334155", border = "#e2e8f0") {
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

export function card() {
  return {
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e5edff",
    borderRadius: 18,
    boxShadow: "0 18px 44px rgba(15,23,42,0.08)",
    backdropFilter: "blur(10px)",
  };
}

export function glassCard(tint = "rgba(8, 145, 178, 0.18)") {
  return {
    background: tint,
    border: "1px solid rgba(255,255,255,0.22)",
    borderRadius: 28,
    boxShadow: "0 24px 60px rgba(2, 32, 43, 0.22)",
    backdropFilter: "blur(12px)",
  };
}

export function inputStyle() {
  return {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #cfe0ff",
    padding: "10px 12px",
    background: "#f8fbff",
    color: "#0f172a",
  };
}
