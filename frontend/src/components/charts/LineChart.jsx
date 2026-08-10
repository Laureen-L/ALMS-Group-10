// LineChart — borrowing trends over time. Dependency-free inline SVG, same
// approach as BarChart. data: [{ month, count }] (keys configurable).
// Right padding leaves room for the last x-axis label, which is centred on the
// final point and would otherwise overflow the viewBox.
const PAD = { top: 12, right: 34, bottom: 26, left: 34 };

export default function LineChart({
  data = [], xKey = "month", yKey = "count", height = 250, width = 720,
}) {
  if (data.length === 0) return <div className="state">No data yet.</div>;

  const values = data.map((d) => Number(d[yKey]) || 0);
  const max = Math.max(1, ...values);
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;

  // A single point has no span to divide across, so pin it mid-chart.
  const xAt = (i) => (data.length === 1 ? PAD.left + plotW / 2 : PAD.left + (i / (data.length - 1)) * plotW);
  const yAt = (v) => PAD.top + plotH - (v / max) * plotH;

  const points = values.map((v, i) => [xAt(i), yAt(v)]);
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  // Close the path down to the baseline for the soft fill under the line.
  const area = `${line} L${points[points.length - 1][0]},${PAD.top + plotH} L${points[0][0]},${PAD.top + plotH} Z`;

  // Four horizontal gridlines, labelled with their value.
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));

  // Keep x-axis labels readable when there are many months.
  const labelEvery = Math.ceil(data.length / 12);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height }}
      role="img"
      aria-label={`Line chart of ${yKey} by ${xKey}`}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left} x2={width - PAD.right}
            y1={yAt(t)} y2={yAt(t)}
            stroke="var(--border-soft)" strokeWidth="1"
          />
          <text x={PAD.left - 6} y={yAt(t) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">
            {t}
          </text>
        </g>
      ))}

      <path d={area} fill="var(--green-100)" opacity="0.7" />
      <path d={line} fill="none" stroke="var(--green-700)" strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />

      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="var(--green-700)">
          <title>{`${data[i][xKey]}: ${values[i]}`}</title>
        </circle>
      ))}

      {data.map((d, i) =>
        i % labelEvery === 0 ? (
          <text key={i} x={xAt(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">
            {d[xKey]}
          </text>
        ) : null
      )}
    </svg>
  );
}
