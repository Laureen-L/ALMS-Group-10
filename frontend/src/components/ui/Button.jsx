// Button — variants: gold (primary action) | green | outline | ghost | danger.
// Usage: <Button variant="gold" onClick={...}>Borrow Book</Button>
//        <Button loading={saving}>Save</Button>   // spins and disables itself
export default function Button({
  variant = "gold", size, block, type = "button", className = "",
  loading = false, disabled, children, ...rest
}) {
  const classes = [
    "btn", `btn--${variant}`,
    size === "sm" && "btn--sm",
    block && "btn--block",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button
      type={type}
      className={classes}
      // A loading button must not be clickable twice.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
