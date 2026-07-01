// StatCard — the metric card on nearly every dashboard.
// tone: neutral | active | warning | critical (sets the top accent + icon color).
// icon: a lucide-react icon component (optional).
export default function StatCard({ tone = "neutral", eyebrow, value, label, icon: Icon }) {
  return (
    <div className={`stat stat--${tone}`}>
      <div className="stat__head">
        {Icon ? <span className="stat__icon"><Icon size={20} /></span> : <span />}
        {eyebrow && <span className="stat__eyebrow">{eyebrow}</span>}
      </div>
      <div className="stat__value">{value}</div>
      <div className="stat__label">{label}</div>
    </div>
  );
}
