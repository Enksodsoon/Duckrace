import { placeLabel } from "../lib/raceUtils.js";
import { baseButton } from "./ui.js";

export default function PlaceSelectionRow({ podiumSlots, eliminationPlaces, onToggle, onClear, onFirstOnly, onAll }) {
  const selectedLabel = eliminationPlaces.length
    ? eliminationPlaces.map((place) => placeLabel(place)).join(", ")
    : "No finishing places selected";

  return (
    <div aria-label="Elimination place selection controls" style={{ display: "grid", gap: 12 }}>
      <div style={{ fontSize: 12, color: "#64748b" }}>Elimination places selected: {selectedLabel}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Array.from({ length: podiumSlots }).map((_, index) => {
          const active = eliminationPlaces.includes(index);
          return (
            <button
              key={index}
              type="button"
              aria-pressed={active}
              aria-label={`Eliminate ${placeLabel(index)} place`}
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
        <button type="button" onClick={onClear} style={baseButton("outline")}>No elimination</button>
        <button type="button" onClick={onFirstOnly} style={baseButton("outline")}>Eliminate 1st only</button>
        <button type="button" onClick={onAll} style={baseButton("outline")}>Eliminate all podium places</button>
      </div>
    </div>
  );
}
