// Shared (librarian + admin) — bulk catalog import from a CSV file.
//
// Adding titles one form at a time makes seeding a real catalog impractical.
// The file is parsed here and posted as rows; the backend inserts them one at
// a time, so a single bad row reports itself by line number and the rest of
// the file still lands.
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import { importBooks } from "../../services/bookService.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePortal } from "../../hooks/usePortal.js";

// The columns the importer understands. Anything else in the file is ignored
// rather than rejected — exports from other systems carry extra columns, and
// refusing the whole file over a stray "publisher" column helps nobody.
const COLUMNS = ["title", "author", "isbn", "genre", "quantity"];
const REQUIRED = ["title", "author"];
const MAX_ROWS = 500;

/**
 * Minimal RFC-4180 CSV parser: handles quoted fields, escaped quotes ("")
 * and commas or newlines inside quotes.
 *
 * Written out rather than pulled from a package because a book title with a
 * comma in it — "Cooking, Fast and Slow" — is exactly the case a naive
 * split(",") gets wrong, and it is common enough to matter.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }  // escaped quote
        else inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') { inQuotes = true; }
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      // Swallow the \n of a \r\n pair rather than emitting a blank row.
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field); field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);

  return rows;
}

/** Turn parsed rows into book objects, keyed by the header line. */
function toBooks(rows) {
  if (rows.length < 2) {
    return { error: "That file has a header but no rows." };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const missing = REQUIRED.filter((c) => !header.includes(c));

  if (missing.length > 0) {
    return {
      error: `The file needs a ${missing.join(" and ")} column. Found: ${header.join(", ") || "nothing"}.`,
    };
  }

  const books = rows.slice(1).map((cells) => {
    const book = {};
    header.forEach((column, i) => {
      if (!COLUMNS.includes(column)) return;
      const value = (cells[i] || "").trim();
      if (value === "") return;
      book[column] = column === "quantity" ? Number(value) : value;
    });
    return book;
  });

  if (books.length > MAX_ROWS) {
    return { error: `That file has ${books.length} rows. The limit is ${MAX_ROWS} — split it and import in parts.` };
  }

  return { books };
}

export default function ImportBooksPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { base } = usePortal();
  const fileRef = useRef(null);

  const [fileName, setFileName] = useState(null);
  const [preview, setPreview] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);
    setParseError(null);
    setPreview([]);

    const reader = new FileReader();
    reader.onload = () => {
      const { books, error } = toBooks(parseCsv(String(reader.result)));
      if (error) { setParseError(error); return; }
      setPreview(books);
    };
    reader.onerror = () => setParseError("That file could not be read.");
    reader.readAsText(file);
  }

  async function runImport() {
    setBusy(true);
    try {
      const res = await importBooks(preview);
      setResult(res);
      if (res.importedCount > 0) {
        toast.success(`Imported ${res.importedCount} title(s).`);
      }
      if (res.failedCount > 0) {
        toast.info(`${res.failedCount} row(s) were rejected — see the list below.`);
      }
    } catch (e) {
      toast.error(e.message || "The import failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFileName(null); setPreview([]); setParseError(null); setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <button
        className="link-btn"
        onClick={() => navigate(`${base}/catalog`)}
        style={{ marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <ArrowLeft size={16} /> Back to catalog
      </button>

      <h1 className="page-title">Import Books</h1>
      <p className="page-sub">Add many titles at once from a CSV file.</p>

      <Card title="1. Choose a file">
        <p className="page-sub" style={{ marginTop: 0 }}>
          The first row must be a header. <strong>title</strong> and <strong>author</strong> are
          required; <strong>isbn</strong>, <strong>genre</strong> and <strong>quantity</strong> are
          optional. Any other column is ignored.
        </p>

        <pre className="code-sample">
{`title,author,isbn,genre,quantity
Things Fall Apart,Chinua Achebe,9780385474542,Fiction,4
"Cooking, Fast and Slow",Ama Mensah,,Cookery,2`}
        </pre>

        <div className="row" style={{ gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            style={{ display: "none" }}
            id="csv-input"
          />
          <Button variant="green" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Choose CSV
          </Button>
          {fileName && (
            <span className="row page-sub" style={{ gap: 6 }}>
              <FileText size={16} /> {fileName}
            </span>
          )}
          {fileName && <Button variant="ghost" onClick={reset}>Clear</Button>}
        </div>

        {parseError && <p className="circ-message circ-message--err" style={{ marginTop: 14 }}>❌ {parseError}</p>}
      </Card>

      {preview.length > 0 && !result && (
        <div style={{ marginTop: 22 }}>
          <Card
            title={`2. Check ${preview.length} row(s)`}
            action={<Button variant="gold" loading={busy} onClick={runImport}>Import {preview.length} title(s)</Button>}
          >
            <p className="page-sub" style={{ marginTop: 0 }}>
              Nothing has been saved yet. Rows are added one at a time, so a bad row is reported on
              its own and the rest still import.
            </p>
            <DataTable
              columns={[
                { key: "title", header: "Title" },
                { key: "author", header: "Author" },
                { key: "isbn", header: "ISBN", render: (b) => b.isbn || "—" },
                { key: "genre", header: "Genre", render: (b) => b.genre || "—" },
                { key: "quantity", header: "Copies", render: (b) => b.quantity ?? 1 },
              ]}
              rows={preview.slice(0, 25).map((b, i) => ({ ...b, id: i }))}
              emptyMessage="Nothing to import."
            />
            {preview.length > 25 && (
              <p className="page-sub">Showing the first 25 of {preview.length} rows.</p>
            )}
          </Card>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 22 }}>
          <Card title="3. Result">
            <div className="row" style={{ gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <Badge tone="green">
                <CheckCircle2 size={14} style={{ verticalAlign: "-2px" }} /> {result.importedCount} imported
              </Badge>
              {result.failedCount > 0 && (
                <Badge tone="red">
                  <AlertTriangle size={14} style={{ verticalAlign: "-2px" }} /> {result.failedCount} rejected
                </Badge>
              )}
            </div>

            {result.failedCount > 0 && (
              <DataTable
                columns={[
                  { key: "line", header: "Line" },
                  { key: "title", header: "Title" },
                  { key: "reason", header: "Why it was rejected" },
                ]}
                rows={(result.failed || []).map((f) => ({ ...f, id: f.line }))}
                emptyMessage="—"
              />
            )}

            <div className="row" style={{ gap: 8, marginTop: 16 }}>
              <Button variant="green" onClick={() => navigate(`${base}/catalog`)}>View catalog</Button>
              <Button variant="ghost" onClick={reset}>Import another file</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
