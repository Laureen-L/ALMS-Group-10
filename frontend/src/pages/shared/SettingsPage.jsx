// Shared — Settings. Lives in every sidebar. Minimal starting layout.
import { useState } from "react";
import Card from "../../components/ui/Card.jsx";
import Toggle from "../../components/ui/Toggle.jsx";

export default function SettingsPage() {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [dueReminders, setDueReminders] = useState(true);

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <p className="page-sub">Manage how the library portal works for you.</p>

      <div className="stack" style={{ maxWidth: 560 }}>
        <Card title="Notifications">
          <div className="stack" style={{ gap: 16 }}>
            <Toggle checked={emailNotifs} onChange={setEmailNotifs} label="Email notifications" />
            <Toggle checked={dueReminders} onChange={setDueReminders} label="Due-date reminders" />
          </div>
        </Card>
      </div>
    </div>
  );
}
