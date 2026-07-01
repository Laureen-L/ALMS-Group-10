// CSV download and printable report helpers for admin screens.

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function downloadCsv(filename, headers, rows) {
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function printReport(title, tableHtml) {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;

  win.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>${title}</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 24px; color: #1f2933; }
      h1 { font-size: 20px; margin: 0 0 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border: 1px solid #e9e6dd; padding: 8px 10px; text-align: left; }
      th { background: #f7f5ee; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    ${tableHtml}
  </body>
</html>`);
  win.document.close();
  win.focus();
  win.print();
}

export function rowsToTableHtml(headers, rows) {
  const head = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>`;
  const body = `<tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell ?? ""}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;
  return `<table>${head}${body}</table>`;
}
