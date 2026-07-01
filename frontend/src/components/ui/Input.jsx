// Input — labelled text field with optional error message.
export default function Input({ label, error, filled, id, className = "", ...rest }) {
  return (
    <label className="field" htmlFor={id}>
      {label && <span className="field__label">{label}</span>}
      <input
        id={id}
        className={["input", filled && "input--filled", className].filter(Boolean).join(" ")}
        {...rest}
      />
      {error && <span className="field__error">{error}</span>}
    </label>
  );
}
