// AlertBanner — full-width notice with an optional action (e.g. overdue loans).
import { AlertTriangle } from "lucide-react";

export default function AlertBanner({ tone = "danger", message, action }) {
  return (
    <div className={`alert alert--${tone}`} role="alert">
      <span className="alert__msg"><AlertTriangle size={20} />{message}</span>
      {action}
    </div>
  );
}
