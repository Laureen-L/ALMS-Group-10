// Library policy (admin) and per-user preferences (everyone).
//
// Policy used to be two constants in the backend's borrowController, so
// changing the loan period meant a code change. It now lives in
// system_settings and is read here.
import { api } from "./apiClient.js";

const USE_MOCK = () => import.meta.env.VITE_USE_MOCK !== "false";

// Mirrors the backend's DEFAULTS, which are in turn the numbers the code used
// before policy was configurable.
export const POLICY_DEFAULTS = {
  loan_period_days: 14,
  max_active_borrows: 5,
  max_renewals: 2,
  renewal_period_days: 7,
  fine_per_day: 0.5,
  fine_grace_days: 0,
  due_soon_days: 3,
  low_stock_threshold: 2,
};

// The Settings screen renders straight from this, so the label and helper text
// live beside the field rather than being hard-coded into the JSX.
export const POLICY_FIELDS = [
  {
    key: "loan_period_days",
    label: "Loan period",
    unit: "days",
    help: "How long a new loan runs before it is due.",
    min: 1,
    max: 365,
  },
  {
    key: "max_active_borrows",
    label: "Borrow limit",
    unit: "books",
    help: "How many books one member may hold at once.",
    min: 1,
    max: 100,
  },
  {
    key: "max_renewals",
    label: "Renewals allowed",
    unit: "times",
    help: "How many times a member may extend one loan. 0 disables renewals.",
    min: 0,
    max: 20,
  },
  {
    key: "renewal_period_days",
    label: "Renewal period",
    unit: "days",
    help: "How much longer a renewal grants, added to the existing due date.",
    min: 1,
    max: 365,
  },
  {
    key: "fine_per_day",
    label: "Fine per day",
    unit: "GHS",
    help: "Charged for each day a return is late. 0 turns fines off entirely.",
    min: 0,
    max: 10000,
    step: 0.05,
    decimal: true,
  },
  {
    key: "fine_grace_days",
    label: "Grace period",
    unit: "days",
    help: "Days past the due date before a fine starts accruing.",
    min: 0,
    max: 365,
  },
  {
    key: "due_soon_days",
    label: "Due-soon window",
    unit: "days",
    help: "How far ahead the desk's “due soon” queue looks.",
    min: 1,
    max: 60,
  },
  {
    key: "low_stock_threshold",
    label: "Low-stock threshold",
    unit: "copies",
    help: "A title at or below this many available copies shows on the reorder list.",
    min: 0,
    max: 1000,
  },
];

/* ---------- Library policy ---------- */

// GET /admin/settings — staff may read; only admins may write.
export async function getPolicy() {
  if (USE_MOCK()) return { ...POLICY_DEFAULTS, persisted: true };

  const data = await api.get("/admin/settings");
  return {
    ...POLICY_DEFAULTS,
    ...data,
    fine_per_day: Number(data.fine_per_day ?? POLICY_DEFAULTS.fine_per_day),
    // false means the backend is serving built-in defaults because the
    // governance migration hasn't been run. The screen says so rather than
    // accepting edits that will not save.
    persisted: data.persisted !== false,
  };
}

// PUT /admin/settings — admin only. Send only what changed.
export async function updatePolicy(patch) {
  if (USE_MOCK()) return { success: true, settings: { ...POLICY_DEFAULTS, ...patch } };

  const res = await api.put("/admin/settings", patch);
  return res.settings;
}

/* ---------- Per-user preferences ---------- */
//
// Stored on users.preferences (JSONB). The Settings screen's toggles were
// React state and nothing else before this — they reset on navigation.

export const PREFERENCE_DEFAULTS = {
  emailNotifications: true,
  dueReminders: true,
  weeklySummary: false,
  activityAlerts: true,
  preferredSection: "General Library",
};

const MOCK_PREFS_KEY = (userId) => `alms_mock_prefs_${userId}`;

// PUT /auth/profile/:id with { preferences } — merged server-side, so a
// partial patch never clears a toggle this screen doesn't know about.
export async function savePreferences(userId, preferences) {
  if (USE_MOCK()) {
    const merged = { ...readMockPreferences(userId), ...preferences };
    localStorage.setItem(MOCK_PREFS_KEY(userId), JSON.stringify(merged));
    return merged;
  }

  const res = await api.put(`/auth/profile/${userId}`, { preferences });
  return { ...PREFERENCE_DEFAULTS, ...(res.user?.preferences || preferences) };
}

// Read from the profile endpoint, which already returns the column.
export async function getPreferences(userId) {
  if (USE_MOCK()) return { ...PREFERENCE_DEFAULTS, ...readMockPreferences(userId) };

  const res = await api.get(`/auth/profile/${userId}`);
  return { ...PREFERENCE_DEFAULTS, ...(res.user?.preferences || {}) };
}

function readMockPreferences(userId) {
  try { return JSON.parse(localStorage.getItem(MOCK_PREFS_KEY(userId))) || {}; }
  catch { return {}; }
}
