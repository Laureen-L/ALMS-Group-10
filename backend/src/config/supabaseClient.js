require('dotenv/config');

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY


if(!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables.');
}

const supabase = createClient(supabaseUrl,supabaseAnonKey,{
  auth: {
    persistSession: false, // Disable session persistence for server-side usage
    autoRefreshToken: false, // Disable automatic token refresh for server-side usage
  },
})

/**
 * A client that acts *as a specific user*, by sending their access token on
 * every request. Needed for operations Supabase ties to the caller's own
 * identity — changing a password, for example — which the shared anon client
 * cannot perform because it has no session.
 *
 * Build a fresh one per request: these carry caller credentials and must never
 * be shared between users.
 */
const scopedClient = (accessToken) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

module.exports = supabase;
module.exports.scopedClient = scopedClient;