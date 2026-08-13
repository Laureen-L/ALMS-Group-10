// Base API client. Every service imports `api` / `request` from here.
// Reads the backend URL from .env (VITE_API_BASE_URL) and attaches the JWT.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";
export const TOKEN_KEY = "alms_token";
const USER_KEY = "alms_user";

// Give up rather than leaving a button spinning forever on a dead network.
//
// Two limits, because a sleeping backend and a dead one look identical for the
// first minute. Render's free tier stops the instance after ~15 minutes idle
// and takes up to a minute to boot again, so the first request after a quiet
// spell needs room that every later request does not.
const COLD_TIMEOUT_MS = 60000;
const WARM_TIMEOUT_MS = 20000;

// Flips on the first response of any kind — even a 401. Anything that came
// back proves the server is running, which is all this tracks.
let backendWarm = false;

export function isBackendWarm() {
  return backendWarm;
}

/**
 * Wake the backend without blocking anything.
 *
 * Called once at startup so the instance boots while the user is still reading
 * the page or filling in a form, rather than after they hit submit. Failures
 * are ignored: this is an optimisation, and the real request reports its own
 * errors.
 */
export function warmUpBackend() {
  if (import.meta.env.VITE_USE_MOCK !== "false") return;

  // The health check lives at the server root, outside the /api prefix.
  const origin = BASE_URL.replace(/\/api\/?$/, "");
  fetch(origin, { method: "GET", cache: "no-store" })
    .then(() => { backendWarm = true; })
    .catch(() => { /* the next real request will surface anything that matters */ });
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Anything that needs to know the session ended (AuthContext) subscribes here,
// so the client can stay unaware of React.
const sessionExpiredHandlers = new Set();
export function onSessionExpired(handler) {
  sessionExpiredHandlers.add(handler);
  return () => sessionExpiredHandlers.delete(handler);
}

let alreadyNotified = false;
function notifySessionExpired() {
  // A dashboard fires several requests at once; all of them will 401 together.
  // Only announce it once, or the user gets a pile of identical toasts.
  if (alreadyNotified) return;
  alreadyNotified = true;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionExpiredHandlers.forEach((h) => h());
  setTimeout(() => { alreadyNotified = false; }, 3000);
}

// Raised when the request never reached the server, so callers can tell
// "the backend said no" apart from "the backend isn't there".
export class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = "NetworkError";
    this.isNetworkError = true;
  }
}

// AuthContext already announces an expired session globally. Pages that catch
// a failed action would otherwise announce it a second time, so this error is
// tagged and the toast layer drops it.
export const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please sign in again.";

export class SessionExpiredError extends Error {
  constructor() {
    super(SESSION_EXPIRED_MESSAGE);
    this.name = "SessionExpiredError";
    this.isSessionExpired = true;
  }
}

export async function request(path, { method = "GET", body, headers = {} } = {}) {
  const token = getToken();
  const controller = new AbortController();
  const wasWarm = backendWarm;
  const timer = setTimeout(
    () => controller.abort(),
    wasWarm ? WARM_TIMEOUT_MS : COLD_TIMEOUT_MS
  );

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
  } catch (err) {
    // fetch only rejects when the request never completed. "Failed to fetch"
    // means nothing to a user, so say what actually went wrong.
    // A timeout on a backend we have never heard from is almost always the
    // free tier booting, not a fault. Saying so stops it reading as broken.
    let message;
    if (err.name === "AbortError") {
      message = wasWarm
        ? "The server took too long to respond. Please try again."
        : "The server is waking up — this can take up to a minute on the free plan. Please try again in a moment.";
    } else {
      message = "Can’t reach the server. Check that the backend is running.";
    }
    throw new NetworkError(message);
  } finally {
    clearTimeout(timer);
  }

  // Any response at all means the instance is up; later requests can use the
  // shorter timeout.
  backendWarm = true;

  let data = null;
  try { data = await res.json(); } catch { /* no/invalid JSON body */ }

  if (!res.ok) {
    // 401 means the token is gone or expired — end the session rather than
    // showing a confusing error on a page the user can no longer load.
    if (res.status === 401 && token) {
      notifySessionExpired();
      throw new SessionExpiredError();
    }
    const msg = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: "POST", body }),
  put: (p, body) => request(p, { method: "PUT", body }),
  // DELETE carries a body for endpoints that identify the target in the
  // payload rather than the path (e.g. removing a favorite by book_id).
  del: (p, body) => request(p, { method: "DELETE", body }),
};
