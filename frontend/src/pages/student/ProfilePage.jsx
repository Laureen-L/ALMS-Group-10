// SCREEN 6 — Student Profile.
// Header card, stat cards, personal info form, security, preferences.
// MOCK data seeded from the signed-in user; wire to userService.getProfile() later.
import { useState } from "react";
import { BookOpen, Copy, CalendarClock, AlertCircle, KeyRound, Pencil } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Avatar from "../../components/ui/Avatar.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Toggle from "../../components/ui/Toggle.jsx";
import StatCard from "../../components/stats/StatCard.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function ProfilePage() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || "Kwame Nkrumah",
    email: user?.email || "k.nkrumah@knust.edu.gh",
    phone: "+233 24 567 8901",
    studentId: "20845612",
    department: "Computer Science",
  });
  const [emailNotifs, setEmailNotifs] = useState(true);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function onSave() {
    // TODO: userService.updateProfile(form)
    console.log("save", form);
  }

  return (
    <div>
      {/* Header */}
      <div className="profile-head" />
      <div className="profile-card">
        <div className="profile-id-row">
          <div className="profile-avatar"><Avatar name={form.name} size={96} /></div>
          <div style={{ flex: 1 }}>
            <div className="profile-name">{form.name} <Badge tone="green">Student</Badge></div>
            <div className="profile-email">{form.email}</div>
            <div className="page-sub" style={{ margin: "4px 0 0" }}>Member since Jan 2023</div>
          </div>
          <Button variant="gold" onClick={onSave}><Pencil size={16} /> Update Profile</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-stats" style={{ marginBottom: 22 }}>
        <StatCard tone="active"   icon={BookOpen}      eyebrow="Active"   value="2"  label="Current Borrows" />
        <StatCard tone="neutral"  icon={Copy}          eyebrow="Total"    value="14" label="Total Borrows" />
        <StatCard tone="warning"  icon={CalendarClock} eyebrow="Due Soon" value="1"  label="Within 48 hours" />
        <StatCard tone="critical" icon={AlertCircle}   eyebrow="Overdue"  value="0"  label="No penalties" />
      </div>

      {/* Info + side column */}
      <div className="detail-grid" style={{ gridTemplateColumns: "1fr 340px" }}>
        <Card title="Personal Information">
          <div className="form-grid">
            <Input label="Full Name" value={form.name} onChange={set("name")} />
            <Input label="Email Address" type="email" value={form.email} onChange={set("email")} />
            <Input label="Phone Number" value={form.phone} onChange={set("phone")} />
            <Input label="Student ID" value={form.studentId} disabled />
            <Select label="Department" value={form.department} onChange={set("department")}
              options={["Computer Science", "Civil Engineering", "Mechanical Engineering", "Business"]} />
            <Input label="User Role" value="Student" disabled />
          </div>
          <div style={{ marginTop: 18 }}>
            <Button variant="gold" onClick={onSave}>Save Changes</Button>
          </div>
        </Card>

        <div className="stack" style={{ gap: 22 }}>
          <Card title="Security">
            <p className="page-sub" style={{ marginBottom: 14 }}>Last changed 3 months ago. We recommend changing it every 6 months.</p>
            <Button variant="gold" block><KeyRound size={16} /> Change Password</Button>
          </Card>

          <Card title="Preferences">
            <div className="row row--between">
              <span>Email Notifications</span>
              <Toggle checked={emailNotifs} onChange={setEmailNotifs} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}