// Shared — Settings. Lives in every sidebar.
import { useState } from "react";
import Card from "../../components/ui/Card.jsx";
import Toggle from "../../components/ui/Toggle.jsx";
import Button from "../../components/ui/Button.jsx";
import Select from "../../components/ui/Select.jsx";

export default function SettingsPage() {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [dueReminders, setDueReminders] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [activityAlerts, setActivityAlerts] = useState(true);

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <p className="page-sub">
        Manage your account preferences, notifications, and security options.
      </p>

      <div className="stack" style={{ maxWidth: 760 }}>
        <Card title="Notification Preferences">
          <div className="stack" style={{ gap: 16 }}>
            <Toggle
              checked={emailNotifs}
              onChange={setEmailNotifs}
              label="Email notifications"
            />

            <Toggle
              checked={dueReminders}
              onChange={setDueReminders}
              label="Due-date reminders"
            />

            <Toggle
              checked={weeklySummary}
              onChange={setWeeklySummary}
              label="Weekly borrowing summary"
            />
          </div>
        </Card>

        <Card title="Account & Security">
          <div className="stack" style={{ gap: 16 }}>
            <Toggle
              checked={twoFactor}
              onChange={setTwoFactor}
              label="Two-factor authentication"
            />

            <Toggle
              checked={activityAlerts}
              onChange={setActivityAlerts}
              label="Login and account activity alerts"
            />
          </div>
        </Card>

        <Card title="Library Preferences">
          <div className="stack" style={{ gap: 14 }}>
            <div>
              <h4 style={{ margin: 0, color: "var(--ink)" }}>
                Default library section
              </h4>
              <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                Your preferred section will be used to personalize book
                recommendations.
              </p>
            </div>

            <Select
             id="library-section"
             label="Preferred Library Section"
             options={[
              "General Library",
              "Science and Technology",
              "Engineering",
              "Business",
              "Arts and Social Sciences",
             ]}
           />
          </div>
        </Card>

        <div className="row" style={{ justifyContent: "flex-end" }}>
          <Button variant="outline">Cancel</Button>
          <Button variant="gold">Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
