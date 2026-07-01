// DataTable — the one table used across dashboards, records, and catalog.
//
// columns: [{ key, header, render?(row) }]
// rows:    array of objects
// states:  loading / error / empty all handled here so screens don't repeat them.
//
// Example:
//   <DataTable
//     columns={[
//       { key: "title", header: "Book Title" },
//       { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
//     ]}
//     rows={borrowings}
//     loading={loading}
//     emptyMessage="No borrowings yet."
//   />
export default function DataTable({
  columns = [], rows = [], loading = false, error = null,
  emptyMessage = "Nothing to show yet.", rowKey = "id", onRowClick,
}) {
  if (loading) {
    return <div className="state"><div className="state__spinner" />Loading…</div>;
  }
  if (error) {
    return <div className="state">Couldn’t load this data. {error.message || ""}</div>;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>{columns.map((c) => <th key={c.key}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="table__empty" colSpan={columns.length}>{emptyMessage}</td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={row[rowKey] ?? i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={onRowClick ? { cursor: "pointer" } : undefined}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    onClick={
                      onRowClick
                        ? (e) => {
                            if (e.target.closest("button, a, input, select, label")) {
                              e.stopPropagation();
                            }
                          }
                        : undefined
                    }
                  >
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
