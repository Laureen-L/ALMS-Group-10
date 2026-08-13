// BarChart — simple, dependency-free CSS bars.
// data: [{ month, count }] (keys configurable). Used on admin dashboard + reports.
export default function BarChart({ data = [], xKey = "month", yKey = "count", height = 180 }) {
  const max = Math.max(1, ...data.map((d) => Number(d[yKey]) || 0));
  if (data.length === 0) return <div className="state">No data yet.</div>;
  return (
    // Each column can only shrink to the width of its own label, so on a phone
    // twelve months won't fit however hard flex tries. Scroll the chart inside
    // its card instead of letting it push the whole page sideways.
    <div className="chart-scroll">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height, minWidth: data.length * 34 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%" }}>
            <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
              <div title={String(d[yKey])} style={{
                width: "100%", background: "var(--green-500)", borderRadius: "6px 6px 0 0",
                height: `${((Number(d[yKey]) || 0) / max) * 100}%`, minHeight: 2,
              }} />
            </div>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{d[xKey]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}