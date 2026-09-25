import { memo } from "react";
import { Check } from "lucide-react";
export const DuckIcon = memo(function DuckIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 54" fill="currentColor" aria-hidden="true">
      <path d="M7 29c7 4 15 4 22 1-3-8-3-15 2-20 4-4 11-4 15 0l3 6 11 4-12 4c0 5-2 8-3 11-4 10-13 14-23 12C11 45 5 39 3 31L0 26z" />
      <circle cx="40" cy="14" r="1.7" fill="#1b221e" />
      <path d="M24 45v6h-8v2h14v-8m5-1v7h9v2H31v-8" />
    </svg>
  );
});
export function Button({ children, icon: Icon, primary, className = "", ...props }) {
  return (
    <button className={`button ${primary ? "primary" : ""} ${className}`} {...props}>
      {Icon && <Icon size={19} aria-hidden="true" />}
      {children}
    </button>
  );
}
export function Toggle({ label, checked, onChange, description, disabled = false }) {
  return (
    <label className="toggle-row">
      <span>
        {label}
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        disabled={disabled}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}
export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Heading({ icon: Icon, title, children }) {
  return (
    <div className="page-heading">
      {Icon && <Icon size={34} />}
      <div>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
    </div>
  );
}
export function Selected() {
  return (
    <span className="selected-mark">
      <Check size={15} />
    </span>
  );
}
