// Shared — Notifications. The full inbox behind the topbar bell.
// Reached from the bell's "View all", and lives in every portal via RoleLayout.
import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCheck } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../services/notificationService.js";
import { timeAgo } from "../../utils/formatDate.js";

export default function NotificationsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { notifications } = await getNotifications();
      setItems(notifications);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unread = items.filter((n) => !n.read_at).length;

  async function onRead(notice) {
    if (notice.read_at) return;
    // Optimistic: the read flag is cosmetic and the reload on failure corrects it.
    setItems((prev) =>
      prev.map((n) => (n.id === notice.id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    try {
      await markNotificationRead(notice.id);
    } catch {
      toast.error("Couldn’t mark that as read.");
      load();
    }
  }

  async function onMarkAll() {
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    try {
      await markAllNotificationsRead();
    } catch {
      toast.error("Couldn’t mark everything as read.");
      load();
    }
  }

  if (loading) return <div className="state"><div className="state__spinner" />Loading notifications…</div>;
  if (error) return <div className="state">Couldn’t load notifications. {error.message}</div>;

  return (
    <div>
      <h1 className="page-title">Notifications</h1>
      <p className="page-sub">
        Overdue notices and library announcements. {unread > 0
          ? `You have ${unread} unread.`
          : "Nothing unread."}
      </p>

      <div className="stack" style={{ maxWidth: 760 }}>
        {unread > 0 && (
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Button variant="outline" onClick={onMarkAll}>
              <CheckCheck size={16} /> Mark all read
            </Button>
          </div>
        )}

        {items.length === 0 ? (
          <Card>
            <div className="state" style={{ padding: "32px 0" }}>
              <Bell size={28} color="var(--muted)" />
              <p style={{ margin: "10px 0 0", color: "var(--muted)" }}>
                No notifications yet.
              </p>
            </div>
          </Card>
        ) : (
          items.map((n) => (
            <Card key={n.id}>
              <div
                className={["notif-row", !n.read_at && "notif-row--unread"]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onRead(n)}
                role={n.read_at ? undefined : "button"}
                tabIndex={n.read_at ? undefined : 0}
                onKeyDown={(e) => { if (e.key === "Enter") onRead(n); }}
              >
                <div className="notif-row__head">
                  <strong>{n.title}</strong>
                  {n.type === "overdue_reminder" && <Badge tone="red">Overdue</Badge>}
                  {!n.read_at && <Badge tone="gold">New</Badge>}
                </div>
                <p className="notif-row__body">{n.body}</p>
                <span className="notif-row__time">{timeAgo(n.created_at)}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
