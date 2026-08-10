const supabase = require('../config/supabaseClient');

const VALID_ROLES = ['student', 'librarian', 'admin'];

/**
 * Work out who a Supabase auth user is, in this system's terms.
 *
 * The public.users row is the source of truth, but it is not always readable:
 * if RLS is enabled on that table, the shared anon client gets an empty result
 * (PostgREST returns no rows rather than an error). Falling back to the auth
 * record's user_metadata keeps roles working in that configuration, because
 * register() writes full_name and role there too.
 *
 * Returns { full_name, role, is_active, source } — `source` says where the
 * role came from, which is worth knowing when debugging a permissions problem.
 */
const resolveIdentity = async (authUser) => {
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, role, is_active')
    .eq('id', authUser.id)
    .maybeSingle();

  if (profile) {
    return {
      full_name: profile.full_name,
      role: profile.role,
      is_active: profile.is_active !== false,
      source: 'users',
    };
  }

  const meta = authUser.user_metadata || {};
  return {
    full_name: meta.full_name || null,
    // Only trust a role the app itself wrote. Anything else defaults to the
    // least-privileged role rather than silently granting access.
    role: VALID_ROLES.includes(meta.role) ? meta.role : 'student',
    is_active: true,
    source: 'user_metadata',
  };
};

// 1. Authentication Middleware (Verifies who the user is)
const requireAuth = async (req, res, next) => {
    try {
        // Grab the token from the "Authorization: Bearer <token>" header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized: Missing or invalid token' });
        }

        const token = authHeader.split(' ')[1];

        // Verify the token securely with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ message: 'Unauthorized: Token is invalid or expired' });
        }

        const identity = await resolveIdentity(user);

        if (!identity.is_active) {
            return res.status(403).json({ message: 'Forbidden: This account has been deactivated' });
        }

        // Attach the authenticated user object to the request so the controller can use it
        req.user = { ...user, ...identity };
        next(); // Move on to the next function
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Role-Based Access Control Middleware (Verifies what the user can do)
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.role;

        if (!userRole || !allowedRoles.includes(userRole)) {
            return res.status(403).json({
                message: 'Forbidden: You do not have permission to perform this action'
            });
        }

        next(); // Move on to the controller
    };
};

module.exports = { requireAuth, requireRole, resolveIdentity };
