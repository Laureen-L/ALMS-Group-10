// IT — System Overview. At-a-glance health of core services plus account totals.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ShieldCheck, UserCheck, UserX, Activity } from "lucide-react";
import StatCard from "../../components/stats/StatCard.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import { getMembers } from "../../services/adminService.js";
import { getSystemHealth } from "../../services/systemService.js";

const statusTone = { operational: "green", degraded: "gold", down: "red" };

export default function ITDashboardPage() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [health, setHealth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const [m, h] = await Promise.all([getMembers(), getSystemHealth()]);
        if (!cancelled) { setMembers(m); setHealth(h); }
      } catch (e) { if (!cancelled) setError(e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const total = members.length;
  const active = members.filter((m) => m.isActive !== false).length;
  const disabled = total - active;
  const staff = members.filter((m) => m.role !== "student").length;

  return (
    <div>
      <h1 className="page-title">System Overview</h1>
      <p className="page-sub">Service health and account status for the ALMS platform.</p>

      <div className="grid-stats">
        <StatCard tone="neutral"  icon={Users}       eyebrow="Accounts" value={String(total)}    label="Total Users" onClick={() => navigate("/it/users")} />
        <StatCard tone="active"   icon={UserCheck}   eyebrow="Active"   value={String(active)}   label="Active Accounts" />
        <StatCard tone="critical" icon={UserX}       eyebrow="Blocked"  value={String(disabled)} label="Disabled Accounts" />
        <StatCard tone="neutral"  icon={ShieldCheck} eyebrow="Staff"    value={String(staff)}    label="Staff & Admins" />
      </div>

      <div style={{ margin: "22px 0" }}>
        <Card title="Service Health">
          <DataTable
            loading={loading} error={error}
            columns={[
              { key: "name", header: "Service" },
              { key: "status", header: "Status", render: (r) => (
                <Badge tone={statusTone[r.status] || "neutral"}>{r.status}</Badge>
              ) },
              { key: "uptime", header: "Uptime (30d)" },
              { key: "latency", header: "Latency" },
            ]}
            rows={health}
            rowKey="name"
            emptyMessage="No services reporting."
          />
          <p className="page-sub" style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Activity size={15} /> Full metrics on the System Health screen.
          </p>
        </Card>
      </div>
    </div>
  );
}
