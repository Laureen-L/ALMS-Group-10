// NotificationBell — topbar bell, unread count, and a dropdown of recent
// notices. Every role has one; a librarian borrows books too.
//
// Nothing here is allowed to break the topbar. If the notifications endpoint
// is unreachable — the migration hasn't been run yet, say — the bell renders
// with no badge and an explanatory line inside the panel, rather than throwing
// and taking the whole header down with it.
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../services/notificationService.js";
import { timeAgo } from "../../utils/formatDate.js";

// The dropdown is a preview, not the archive — the full list has its own page.
const PREVIEW_COUNT = 6;

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [failed, setFailed] = useState(false);
  const wrapRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { notifications, unreadCount } = await getNotifications();
      setItems(notifications);
      setUnread(unreadCount);
      setFailed(false);
    } catch {
      // Deliberately quiet: a missing inbox is not worth a toast on every
      // page load, and the panel says so when the user opens it.
      setFailed(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh on open so the list is current without polling in the background.
  useEffect(() => { if (open) load(); }, [open, load]);

  // Click-away and Escape, the same way the nav drawer closes.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function onOpenNotice(notice) {
    setOpen(false);

    if (!notice.read_at) {
      // Update locally first: the read state is cosmetic, and waiting on the
      // round trip makes the click feel unresponsive.
      setItems((prev) =>
        prev.map((n) => (n.id === notice.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnread((n) => Math.max(0, n - 1));
      try { await markNotificationRead(notice.id); } catch { load(); }
    }

    navigate("/notifications");
  }

  async function onMarkAll() {
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    setUnread(0);
    try { await markAllNotificationsRead(); } catch { load(); }
  }

  const preview = items.slice(0, PREVIEW_COUNT);

  return (
    <div className="notif" ref={wrapRef}>
      <button
        className="notif__button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unread > 0 && <span className="notif__count">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="notif__panel" role="dialog" aria-label="Notifications">
          <div className="notif__head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button className="notif__markall" onClick={onMarkAll}>
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className="notif__list">
            {failed && <p className="notif__empty">Notifications are unavailable right now.</p>}
            {!failed && preview.length === 0 && (
              <p className="notif__empty">You’re all caught up.</p>
            )}
            {preview.map((n) => (
              <button
                key={n.id}
                className={["notif__item", !n.read_at && "notif__item--unread"]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onOpenNotice(n)}
              >
                <span className="notif__item-title">{n.title}</span>
                <span className="notif__item-body">{n.body}</span>
                <span className="notif__item-time">{timeAgo(n.created_at)}</span>
              </button>
            ))}
          </div>

          <button
            className="notif__viewall"
            onClick={() => { setOpen(false); navigate("/notifications"); }}
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
