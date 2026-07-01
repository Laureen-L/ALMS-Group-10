// Badge — small pill. tone: green | gold | amber | red | neutral.
export default function Badge({ tone = "neutral", children }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
