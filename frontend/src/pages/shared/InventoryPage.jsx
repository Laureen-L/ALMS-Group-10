// Shared (librarian + admin) — low stock and the reorder list.
//
// Nothing in the app answered "what has run out?". A librarian found out when
// a member asked for a book and there were none on the shelf.
//
// The two states this separates are the whole point: a title with 0 available
// but 4 copies out on loan is popular and needs more copies; a title with 0
// available and 0 on loan has been lost or never stocked. Same number, opposite
// fix, and a single "available: 0" column can't tell them apart.
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PackageX, TrendingUp, Boxes } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Badge from "../../components/ui/Badge.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import { getLowStock } from "../../services/bookService.js";
import { usePortal } from "../../hooks/usePortal.js";

export default function InventoryPage() {
  const navigate = useNavigate();
  const { base } = usePortal();

  const [books, setBooks] = useState([]);
  const [threshold, setThreshold] = useState("");
  const [applied, setApplied] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // Empty means "use the threshold set in library policy".
      const res = await getLowStock(threshold === "" ? undefined : Number(threshold));
      setBooks(res.books);
      setApplied(res.threshold);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  useEffect(() => { load(); }, [load]);

  const rows = books.filter((b) =>
    !query
    || b.title.toLowerCase().includes(query.toLowerCase())
    || (b.author || "").toLowerCase().includes(query.toLowerCase()));

  const outOfStock = books.filter((b) => b.outOfStock);
  // Everything out on loan rather than missing — buy more of these.
  const allOnLoan = outOfStock.filter((b) => b.onLoan > 0);

  return (
    <div>
      <h1 className="page-title">Inventory</h1>
      <p className="page-sub">
        Titles at or below {applied ?? "the policy"} available cop{applied === 1 ? "y" : "ies"} — the reorder list.
      </p>

      <div className="grid-stats" style={{ marginBottom: 22 }}>
        <StatCard tone="warning" icon={Boxes} eyebrow="Watch" value={String(books.length)} label="Low Stock Titles" />
        <StatCard tone="critical" icon={PackageX} eyebrow="Empty" value={String(outOfStock.length)} label="Nothing Available" />
        <StatCard tone="active" icon={TrendingUp} eyebrow="Demand" value={String(allOnLoan.length)} label="Sold Out — Buy More" />
      </div>

      <Card>
        <div className="toolbar">
          <div className="toolbar__search">
            <Input
              placeholder="Search by title or author…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="toolbar__filter">
            <Select
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              options={[
                { value: "", label: "Policy threshold" },
                { value: "0", label: "None available" },
                { value: "1", label: "1 or fewer" },
                { value: "2", label: "2 or fewer" },
                { value: "5", label: "5 or fewer" },
              ]}
            />
          </div>
        </div>

        <DataTable
          loading={loading} error={error}
          columns={[
            { key: "title", header: "Title" },
            { key: "author", header: "Author" },
            { key: "genre", header: "Genre", render: (b) => b.genre || "—" },
            { key: "availableQuantity", header: "Available", render: (b) => (
              <span style={{ fontWeight: 600, color: b.outOfStock ? "var(--red-600)" : undefined }}>
                {b.availableQuantity}
              </span>
            ) },
            { key: "qty", header: "Owned", render: (b) => b.qty ?? "—" },
            { key: "onLoan", header: "On Loan", render: (b) => b.onLoan ?? 0 },
            { key: "verdict", header: "Verdict", render: (b) => {
              if (!b.outOfStock) return <Badge tone="amber">Running low</Badge>;
              return b.onLoan > 0
                ? <Badge tone="green">Popular — buy more</Badge>
                : <Badge tone="red">None owned</Badge>;
            } },
          ]}
          rows={rows}
          onRowClick={(b) => navigate(`${base}/catalog/${b.id}`)}
          emptyMessage="Everything is well stocked."
        />
      </Card>
    </div>
  );
}
