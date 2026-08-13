// Services — member administration (role changes, activation) and favorites.
import { api } from "./apiClient.js";

const USE_MOCK = () => import.meta.env.VITE_USE_MOCK !== "false";

/* ---------- Member administration (admin only) ---------- */

// PUT /admin/members/:id/role
export async function updateMemberRole(memberId, role) {
  if (USE_MOCK()) return { success: true, user: { id: memberId, role } };
  return api.put(`/admin/members/${memberId}/role`, { role });
}

// PUT /admin/members/:id/deactivate
export async function deactivateMember(memberId) {
  if (USE_MOCK()) return { success: true, user: { id: memberId, is_active: false } };
  return api.put(`/admin/members/${memberId}/deactivate`);
}

// PUT /admin/members/:id/reactivate
export async function reactivateMember(memberId) {
  if (USE_MOCK()) return { success: true, user: { id: memberId, is_active: true } };
  return api.put(`/admin/members/${memberId}/reactivate`);
}

// GET /auth/members/lookup?email= (staff only)
export async function lookupMember(email) {
  if (USE_MOCK()) {
    if (!email) throw new Error("An email is required");
    return { id: 1, full_name: "Kwame Nkrumah", email, role: "student", is_active: true };
  }
  return api.get(`/auth/members/lookup?email=${encodeURIComponent(email)}`);
}

/* ---------- Favorites ---------- */
// Backed by the `favorites` table — needs migration 20260808130000_favorites.

// Mock favorites persist in localStorage, keyed per user, so the ☆ toggle
// survives a page reload the way the real endpoint would.
const MOCK_FAV_KEY = (userId) => `alms_mock_favorites_${userId}`;

function readMockFavorites(userId) {
  try { return JSON.parse(localStorage.getItem(MOCK_FAV_KEY(userId))) || []; }
  catch { return []; }
}

function writeMockFavorites(userId, books) {
  localStorage.setItem(MOCK_FAV_KEY(userId), JSON.stringify(books));
}

// GET /students/:id/favorites -> the saved books themselves
export async function getFavorites(userId) {
  if (USE_MOCK()) return readMockFavorites(userId);
  const data = await api.get(`/students/${userId}/favorites`);
  return (Array.isArray(data) ? data : []).map(mapFavoriteBook);
}

// POST /students/:id/favorites
export async function addFavorite(userId, book) {
  if (USE_MOCK()) {
    const favs = readMockFavorites(userId);
    if (!favs.some((b) => String(b.id) === String(book.id))) {
      writeMockFavorites(userId, [...favs, book]);
    }
    return { success: true };
  }
  return api.post(`/students/${userId}/favorites`, { book_id: book.id });
}

// DELETE /students/:id/favorites
export async function removeFavorite(userId, book) {
  if (USE_MOCK()) {
    const favs = readMockFavorites(userId).filter((b) => String(b.id) !== String(book.id));
    writeMockFavorites(userId, favs);
    return { success: true };
  }
  return api.del(`/students/${userId}/favorites`, { book_id: book.id });
}

function mapFavoriteBook(b) {
  const availableQuantity = b.available_quantity ?? 0;
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    genre: b.genre,
    isbn: b.isbn || null,
    availableQuantity,
    available: availableQuantity > 0,
  };
}
