// Services — in-app notifications (base /api/notifications).
//
// The signed-in member's own inbox. There is no :id in these paths: the
// backend scopes every query to the token holder, so the client can't ask
// for someone else's notices.
import { api } from "./apiClient.js";

const USE_MOCK = () => import.meta.env.VITE_USE_MOCK !== "false";

const MOCK_NOTIFICATIONS = [
  {
    id: "n1",
    title: 'Overdue: Introduction to Algorithms',
    body: 'Dear Kwame Nkrumah, your loan of "Introduction to Algorithms" is 3 day(s) overdue. Please return it promptly. — KNUST Library',
    type: "overdue_reminder",
    borrow_id: "b1",
    read_at: null,
    created_at: new Date(Date.now() - 3600e3).toISOString(),
  },
  {
    id: "n2",
    title: "Welcome to ALMS",
    body: "Your library account is ready. Browse the catalogue to borrow your first book.",
    type: "general",
    borrow_id: null,
    read_at: new Date(Date.now() - 86400e3).toISOString(),
    created_at: new Date(Date.now() - 172800e3).toISOString(),
  },
];

// GET /notifications -> { notifications, unreadCount }
export async function getNotifications() {
  if (USE_MOCK()) {
    return {
      notifications: MOCK_NOTIFICATIONS,
      unreadCount: MOCK_NOTIFICATIONS.filter((n) => !n.read_at).length,
    };
  }
  const data = await api.get("/notifications");
  return {
    notifications: Array.isArray(data?.notifications) ? data.notifications : [],
    unreadCount: data?.unreadCount || 0,
  };
}

// PUT /notifications/:id/read
export async function markNotificationRead(id) {
  if (USE_MOCK()) return { success: true };
  return api.put(`/notifications/${id}/read`);
}

// PUT /notifications/read-all
export async function markAllNotificationsRead() {
  if (USE_MOCK()) return { success: true, updated: 1 };
  return api.put("/notifications/read-all");
}
