// Button — variants: gold (primary action) | green | outline | ghost | danger.
// Usage: <Button variant="gold" onClick={...}>Borrow Book</Button>
export default function Button({
  variant = "gold", size, block, type = "button", className = "", children, ...rest
}) {
  const classes = [
    "btn", `btn--${variant}`,
    size === "sm" && "btn--sm",
    block && "btn--block",
    className,
  ].filter(Boolean).join(" ");
  return <button type={type} className={classes} {...rest}>{children}</button>;
}
