// IT — System Health. Service status, live-ish metrics, and recent incidents.
import { useState, useEffect } from "react";
import { Activity, AlertCircle, Database, HardDrive } from "lucide-react";
import StatCard from "../../components/stats/StatCard.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import { getSystemHealth, getSystemMetrics } from "../../services/systemService.js";

const statusTone = { operational: "green", degraded: "gold", down: "red" };

export default function SystemHealthPage() {
  const [health, setHealth] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const [h, m] = await Promise.all([getSystemHealth(), getSystemMetrics()]);
        if (!cancelled) { setHealth(h); setMetrics(m); }
      } catch (e) { if (!cancelled) setError(e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const dbPct = metrics ? Math.round((metrics.dbConnections / metrics.dbConnectionsMax) * 100) : 0;
  const storagePct = metrics ? Math.round((metrics.storageUsedGb / metrics.storageTotalGb) * 100) : 0;

  return (
    <div>
      <h1 className="page-title">System Health</h1>
      <p className="page-sub">Core service status and platform metrics.</p>

      <div className="grid-stats">
        <StatCard tone="active"   icon={Activity}  eyebrow="Traffic"  value={metrics ? metrics.requestsPerMin.toLocaleString() : "—"} label="Requests / min" />
        <StatCard tone={metrics && metrics.errorRate < 1 ? "active" : "critical"} icon={AlertCircle} eyebrow="Reliability" value={metrics ? `${metrics.errorRate}%` : "—"} label="Error Rate" />
        <StatCard tone="neutral"  icon={Database}  eyebrow="Database" value={metrics ? `${dbPct}%` : "—"} label={metrics ? `${metrics.dbConnections}/${metrics.dbConnectionsMax} connections` : "Connections"} />
        <StatCard tone="neutral"  icon={HardDrive} eyebrow="Storage"  value={metrics ? `${storagePct}%` : "—"} label={metrics ? `${metrics.storageUsedGb} / ${metrics.storageTotalGb} GB` : "Used"} />
      </div>

      <div style={{ margin: "22px 0" }}>
        <Card title="Service Status">
          <DataTable
            loading={loading} error={error}
            columns={[
              { key: "name", header: "Service" },
              { key: "status", header: "Status", render: (r) => <Badge tone={statusTone[r.status] || "neutral"}>{r.status}</Badge> },
              { key: "uptime", header: "Uptime (30d)" },
              { key: "latency", header: "Latency" },
            ]}
            rows={health}
            rowKey="name"
            emptyMessage="No services reporting."
          />
        </Card>
      </div>

      <Card title="Recent Incidents">
        {metrics?.lastBackup && (
          <p className="page-sub" style={{ marginTop: 0 }}>Last database backup: <strong>{metrics.lastBackup}</strong></p>
        )}
        <DataTable
          columns={[
            { key: "when", header: "Date" },
            { key: "service", header: "Service" },
            { key: "note", header: "Note" },
          ]}
          rows={metrics?.incidents || []}
          emptyMessage="No incidents in the last 30 days."
        />
      </Card>
    </div>
  );
}
