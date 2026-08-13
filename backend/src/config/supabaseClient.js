require('dotenv/config');

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY


if(!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables.');
}

// Starting on the anon key is a silent failure, not a loud one: RLS makes
// public.users read back as zero rows with no error, so every role lookup
// falls through to 'student' and the member list comes back empty. Say so at
// boot rather than letting it look like a permissions bug days later.
if (!supabaseServiceRoleKey) {
  console.warn(
    '⚠️  SUPABASE_SERVICE_ROLE_KEY is not set — falling back to the anon key.\n' +
    '    RLS will hide public.users: every caller resolves as "student" and the\n' +
    '    member list will be empty. See database/SCHEMA.md > Row Level Security.'
  );
}

const AUTH_OPTIONS = {
  persistSession: false, // Disable session persistence for server-side usage
  autoRefreshToken: false, // Disable automatic token refresh for server-side usage
};

/**
 * The shared client every controller uses for database reads and writes.
 *
 * Runs on the **service role** key, which bypasses RLS. That is the right
 * posture for a server-side API that does its own authorization in
 * requireAuth / requireRole: on the anon key, RLS on public.users hides the
 * table entirely and roles silently collapse to 'student'.
 *
 * This key must never reach the browser. Do not copy it into any VITE_*
 * variable — those are compiled into the frontend bundle and shipped to every
 * visitor. Anything acting on behalf of a caller uses scopedClient() instead.
 *
 * NEVER call sign-in on this client. `persistSession: false` only stops the
 * session being written to disk — it is still kept in memory, and once a
 * session exists supabase-js sends that user's JWT on every PostgREST request
 * instead of the client's own key. On a shared server-side client that means
 * the last person to sign in silently becomes the identity for everyone else's
 * queries until someone else signs in. Use authClient() for sign-in and
 * sign-up. With the service role key in play the same slip also downgrades
 * every query from full access to that user's, so it fails in both directions.
 */
const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || supabaseAnonKey,
  { auth: { ...AUTH_OPTIONS } }
);

/**
 * A throwaway client for a single sign-in or sign-up.
 *
 * Because it is discarded when the request ends, the session it acquires never
 * leaks into anyone else's queries. One per operation — never cache these.
 */
const authClient = () =>
  createClient(supabaseUrl, supabaseAnonKey, { auth: { ...AUTH_OPTIONS } });

/**
 * A client that acts *as a specific user*, by sending their access token on
 * every database request — so RLS applies to them as themselves, rather than
 * being bypassed as it is on the shared service-role client.
 *
 * Nothing uses this at the moment. Registration did, back when the shared
 * client was on the anon key and could not insert into public.users; it now
 * writes through the service role instead. Kept because it is the only correct
 * way to run a query under the caller's own identity, which is what you want
 * for anything a user should only be able to do to their own rows.
 *
 * Database calls only. `.auth.updateUser()` on one of these fails with
 * AuthSessionMissingError, because a bearer header is not a session — use
 * updatePassword() below for that.
 *
 * Build a fresh one per request: these carry caller credentials and must never
 * be shared between users.
 */
const scopedClient = (accessToken) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: { ...AUTH_OPTIONS },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

/**
 * Set a user's password using their access token as the authorisation.
 *
 * Calls the GoTrue endpoint directly. The supabase-js equivalent,
 * `auth.updateUser({ password })`, requires a *session* on the client, which
 * a server holding only a bearer token does not have — it rejects with
 * AuthSessionMissingError before sending anything.
 *
 * The token may be either a live session token (password change) or the
 * recovery token from a reset email (password reset); GoTrue accepts both.
 *
 * Returns { error } — null on success, otherwise a message safe to surface.
 */
const updatePassword = async (accessToken, newPassword) => {
  let response;
  try {
    response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: newPassword }),
    });
  } catch (err) {
    return { error: { message: 'Could not reach the authentication service.', status: 503 } };
  }

  if (response.ok) return { error: null };

  const body = await response.json().catch(() => ({}));
  return {
    error: {
      message: body.msg || body.message || body.error_description || 'Could not update the password.',
      status: response.status,
    },
  };
};

module.exports = supabase;
module.exports.authClient = authClient;
module.exports.scopedClient = scopedClient;
module.exports.updatePassword = updatePassword;
