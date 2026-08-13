// Input — labelled text field with optional error message.
// Forwards its ref to the underlying <input> so callers can drive focus
// (e.g. the circulation desk keeping the ISBN field ready for the scanner).
import { forwardRef } from "react";

const Input = forwardRef(function Input({ label, error, filled, id, className = "", ...rest }, ref) {
  return (
    <label className="field" htmlFor={id}>
      {label && <span className="field__label">{label}</span>}
      <input
        ref={ref}
        id={id}
        className={["input", filled && "input--filled", className].filter(Boolean).join(" ")}
        {...rest}
      />
      {error && <span className="field__error">{error}</span>}
    </label>
  );
});

export default Input;
