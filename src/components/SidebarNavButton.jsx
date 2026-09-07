export default function SidebarNavButton({ icon: Icon, label, description, active, onClick }) {
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
