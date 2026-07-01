// Librarian — Overdue Management. Overdue loans with per-row + bulk reminders.
// MOCK data; wire to borrowService.getOverdue() / sendReminder() later.
import { AlertTriangle, Send } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import AlertBanner from "../../components/ui/AlertBanner.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import DataTable from "../../components/tables/DataTable.jsx";
import StatusBadge from "../../components/tables/StatusBadge.jsx";

const OVERDUE = [
  { id: 1, member: "Kwame Mensah", email: "k.mensah@knust.edu.gh", title: "Intro to Quantum Computing", due: "Oct 20, 2023", daysLate: 8 },
  { id: 2, member: "Yaw Boateng", email: "y.boateng@knust.edu.gh", title: "Organic Chemistry Vol II", due: "Oct 18, 2023", daysLate: 10 },
  { id: 3, member: "Efua Addo", email: "e.addo@knust.edu.gh", title: "Discrete Mathematics", due: "Oct 15, 2023", daysLate: 13 },
];

export default function OverdueManagementPage() {
  function sendReminder(row) {
    // TODO: borrowService.sendReminder(row.id)
    console.log("reminder", row.id);
  }
  function sendAll() {
    // TODO: borrowService.sendAllReminders()
    console.log("reminder all");
  }

  return (
    <div>
      <h1 className="page-title">Overdue Management</h1>
      <p className="page-sub">Loans past their due date.</p>

      <div className="grid-stats" style={{ marginBottom: 22 }}>
        <StatCard tone="critical" icon={AlertTriangle} eyebrow="Action" value={String(OVERDUE.length)} label="Overdue Loans" />
        <StatCard tone="warning"  icon={AlertTriangle} eyebrow="Avg" value="10" label="Avg Days Late" />
      </div>

      <div style={{ marginBottom: 22 }}>
        <AlertBanner
          tone="danger"
          message={`${OVERDUE.length} loans need a reminder.`}
          action={<Button variant="outline" style={{ background: "#fff" }} onClick={sendAll}><Send size={16} /> Send All Reminders</Button>}
        />
      </div>

      <Card title="Overdue Loans">
        <DataTable
          columns={[
            { key: "member", header: "Member" },
            { key: "email", header: "Email" },
            { key: "title", header: "Book Title" },
            { key: "due", header: "Due Date" },
            { key: "daysLate", header: "Status", render: () => <StatusBadge status="overdue" /> },
            { key: "actions", header: "Action", render: (r) => (
              <button className="act-edit" onClick={() => sendReminder(r)}><Send size={14} /> Remind</button>
            ) },
          ]}
          rows={OVERDUE}
          emptyMessage="Nothing overdue — nice."
        />
      </Card>
    </div>
  );
}