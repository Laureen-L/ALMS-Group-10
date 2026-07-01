// Toggle — controlled switch. Usage: <Toggle checked={on} onChange={setOn} label="Email Notifications" />
export default function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="toggle"
      onClick={() => onChange(!checked)}
    >
      <span className={["toggle__track", checked && "toggle__track--on"].filter(Boolean).join(" ")}>
        <span className="toggle__thumb" />
      </span>
      {label && <span>{label}</span>}
    </button>
  );
}
