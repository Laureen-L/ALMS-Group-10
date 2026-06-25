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

module.exports = supabase;