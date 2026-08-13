// Input — labelled text field with optional error message.
// Forwards its ref to the underlying <input> so callers can drive focus
// (e.g. the circulation desk keeping the ISBN field ready for the scanner).
// Password fields get an eye toggle to reveal / hide what was typed.
import { forwardRef, useState } from "react";

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/>
    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/>
    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/>
    <path d="m2 2 20 20"/>
  </svg>
);

const Input = forwardRef(function Input({ label, error, filled, id, className = "", type, ...rest }, ref) {
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);

  return (
    <label className="field" htmlFor={id}>
      {label && <span className="field__label">{label}</span>}
      <span className={isPassword ? "input-wrapper input-wrapper--pw" : "input-wrapper"}>
        <input
          ref={ref}
          id={id}
          type={isPassword && visible ? "text" : type}
          className={["input", filled && "input--filled", isPassword && "input--has-toggle", className].filter(Boolean).join(" ")}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            className="pw-toggle"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </span>
      {error && <span className="field__error">{error}</span>}
    </label>
  );
});

export default Input;
