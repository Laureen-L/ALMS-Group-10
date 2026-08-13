// DonutChart — collection breakdown by genre. Dependency-free inline SVG.
// data: [{ genre, count }] (keys configurable).
//
// Slices are drawn as stroked circle segments rather than arc paths: one
// circle per slice, using stroke-dasharray to show only that slice's share
// and stroke-dashoffset to rotate it into place. Avoids hand-rolled arc maths.
const SIZE = 220;
const RADIUS = 80;
const THICKNESS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Reuses the palette the reports screen already uses for its charts.
const COLORS = [
  "var(--green-900)", "var(--green-600)", "var(--green-500)",
  "var(--gold-600)", "var(--gold-500)", "var(--amber-600)",
];

export default function DonutChart({
  data = [], labelKey = "genre", valueKey = "count", height = 260,
}) {
  const slices = data.filter((d) => (Number(d[valueKey]) || 0) > 0);
  if (slices.length === 0) return <div className="state">No data yet.</div>;

  const total = slices.reduce((sum, d) => sum + Number(d[valueKey]), 0);

  let offsetSoFar = 0;
  const rendered = slices.map((d, i) => {
    const value = Number(d[valueKey]);
    const share = value / total;
    const slice = {
      label: d[labelKey],
      value,
      share,
      color: COLORS[i % COLORS.length],
      dash: share * CIRCUMFERENCE,
      offset: -offsetSoFar * CIRCUMFERENCE,
    };
    offsetSoFar += share;
    return slice;
  });

  return (
    <div className="donut">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ width: SIZE, height, flexShrink: 0 }}
        role="img"
        aria-label={`Donut chart of ${valueKey} by ${labelKey}`}
      >
        {/* -90° so the first slice starts at 12 o'clock, not 3 o'clock. */}
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {rendered.map((s) => (
            <circle
              key={s.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={s.color}
              strokeWidth={THICKNESS}
              strokeDasharray={`${s.dash} ${CIRCUMFERENCE - s.dash}`}
              strokeDashoffset={s.offset}
            >
              <title>{`${s.label}: ${s.value} (${Math.round(s.share * 100)}%)`}</title>
            </circle>
          ))}
        </g>

        <text x={SIZE / 2} y={SIZE / 2 - 4} textAnchor="middle"
          fontSize="26" fontWeight="700" fill="var(--green-900)">
          {total}
        </text>
        <text x={SIZE / 2} y={SIZE / 2 + 16} textAnchor="middle"
          fontSize="11" fill="var(--muted)">
          books
        </text>
      </svg>

      <ul className="donut__legend">
        {rendered.map((s) => (
          <li key={s.label}>
            <span className="donut__swatch" style={{ background: s.color }} />
            <span className="donut__label">{s.label}</span>
            <span className="donut__value">{s.value} ({Math.round(s.share * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
