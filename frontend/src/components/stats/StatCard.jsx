// StatCard — the metric card on nearly every dashboard.
// tone: neutral | active | warning | critical (sets the top accent + icon color).
// icon: a lucide-react icon component (optional).
// onClick: makes the whole card a button and shows a "click to view" hint.
export default function StatCard({ tone = "neutral", eyebrow, value, label, icon: Icon, onClick, hint }) {
  const clickable = typeof onClick === "function";

  const body = (
    <>
      <div className="stat__head">
        {Icon ? <span className="stat__icon"><Icon size={20} /></span> : <span />}
        {eyebrow && <span className="stat__eyebrow">{eyebrow}</span>}
      </div>
      <div className="stat__value">{value}</div>
      <div className="stat__label">{label}</div>
      {clickable && <div className="stat__hint">{hint || "Click to view details"}</div>}
    </>
  );

  if (clickable) {
    return (
      <div
        className={`stat stat--${tone} stat-card--clickable`}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); } }}
      >
        {body}
      </div>
    );
  }

  return <div className={`stat stat--${tone}`}>{body}</div>;
}
