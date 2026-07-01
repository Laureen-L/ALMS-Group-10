// Select — labelled dropdown. options: [{ value, label }] | string[].
export default function Select({ label, options = [], id, className = "", ...rest }) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <label className="field" htmlFor={id}>
      {label && <span className="field__label">{label}</span>}
      <select id={id} className={["select", className].filter(Boolean).join(" ")} {...rest}>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
