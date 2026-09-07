export function Toggle({ checked, onChange, disabled = false }) {
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

export function Range({ min, max, step, value, onChange, label }) {
  return (
    <input
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: "100%" }}
    />
  );
}
