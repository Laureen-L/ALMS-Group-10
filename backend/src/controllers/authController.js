const supabase = require('../config/supabaseClient');
const { scopedClient } = require('../config/supabaseClient');
const { resolveIdentity } = require('../middleware/authMiddleware');

// Roles a user is allowed to pick for themselves at sign-up.
// 'admin' is deliberately excluded — it can only be granted by an existing admin.
const SELF_SERVICE_ROLES = ['student', 'librarian'];

// public.users.password_hash is NOT NULL, but credentials actually live in
// Supabase Auth. This sentinel satisfies the constraint without implying that
// a real hash is stored here.
const AUTH_MANAGED_PASSWORD = 'managed_by_supabase_auth';

// 1. POST /api/auth/register
const register = async (req, res) => {
  const { email, password, full_name, name, role } = req.body;
  const fullName = full_name || name;

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Email, password and full name are required.' });
  }

  if (role === 'admin') {
    return res.status(403).json({ error: 'Cannot self-register as admin' });
  }

  const requestedRole = role || 'student';
  if (!SELF_SERVICE_ROLES.includes(requestedRole)) {
    return res.status(400).json({ error: `Role must be one of: ${SELF_SERVICE_ROLES.join(', ')}` });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Carry identity in the auth record itself. public.users may be
      // unreadable under RLS, and this is the only copy of the role that is
      // always available — see resolveIdentity() in authMiddleware.
      options: { data: { full_name: fullName, role: requestedRole } },
    });

    if (error) {
      // Supabase reports a missing SMTP setup as a send failure, which reads
      // like a bug in this app. Point at the real cause instead.
      if (/confirmation email|sending.*email/i.test(error.message)) {
        return res.status(503).json({
          error: 'Sign-up is unavailable: the project cannot send confirmation emails. '
               + 'An administrator must disable email confirmation or configure SMTP in Supabase.',
        });
      }
      return res.status(400).json({ error: error.message });
    }
    if (!data.user) {
      return res.status(400).json({ error: 'Sign-up did not return a user. Please try again.' });
    }

    // Mirror the auth user into public.users so the member list and reports
    // find them. id must match the auth uid — everything joins on it.
    //
    // Use the new user's own session when there is one: that request runs as
    // the `authenticated` role, which RLS policies usually permit, whereas the
    // shared anon client is typically blocked.
    const writer = data.session ? scopedClient(data.session.access_token) : supabase;
    const { error: profileError } = await writer.from('users').insert({
      id: data.user.id,
      full_name: fullName,
      email,
      password_hash: AUTH_MANAGED_PASSWORD,
      role: requestedRole,
      is_active: true,
    });

    // A failed mirror is degraded, not fatal: the account exists and the role
    // lives in user_metadata, so the person can still sign in and use the app.
    // They just won't appear in the member list until the row is created.
    if (profileError) {
      console.warn('register: could not mirror into public.users —', profileError.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Registered successfully',
      profileMirrored: !profileError,
      user: {
        id: data.user.id,
        email,
        full_name: fullName,
        role: requestedRole,
      },
    });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Internal server error.', details: err.message });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      console.error('Supabase reset password error:', {
        name: error.name,
        message: error.message,
        status: error.status,
      });

      if (error.name === 'AuthRetryableFetchError') {
        return res.status(503).json({
          error: 'Unable to reach authentication service. Please try again shortly.',
        });
      }

      const status = error.status && error.status >= 400 && error.status < 600 ? error.status : 400;
      return res.status(status).json({ error: error.message || 'Authentication error.' });
    }

    return res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });

  } catch (err) {
    console.error('❌ Forgot Password Error Details:', err);
    return res.status(500).json({
      error: 'Internal server error.',
      details: err.message || 'Unknown error occurred',
    });
  }
};

// 2. POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  // NB: never log req.body here — it contains the plaintext password.

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ success: false, message: error.message });
    }

    // Same resolution the middleware uses: public.users first, then the auth
    // record's metadata when that table isn't readable under RLS. Without the
    // fallback every sign-in would report "student".
    const identity = await resolveIdentity(data.user);

    if (!identity.is_active) {
      return res.status(403).json({
        success: false,
        message: "This account has been deactivated. Contact a librarian.",
      });
    }

    return res.status(200).json({
      success: true,
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: identity.full_name || data.user.email,
        role: identity.role,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};

// 3. GET /api/auth/profile/:id
// requireAuth has already resolved req.user (including role) by this point.
const getProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // A member may only read their own profile; staff may read anyone's.
    const isStaff = req.user.role === 'admin' || req.user.role === 'librarian';
    if (id !== req.user.id && !isStaff) {
      return res.status(403).json({ success: false, message: "You can only view your own profile." });
    }

    const { data: profile, error } = await supabase
      .from('users')
      .select('id, full_name, email, phone, role, is_active, created_at')
      .eq('id', id)
      .single();

    if (profile) return res.status(200).json({ success: true, user: profile });

    // public.users may be unreadable under RLS. For your own profile we can
    // still answer from the verified token rather than a bare 404.
    if (id === req.user.id) {
      return res.status(200).json({
        success: true,
        user: {
          id: req.user.id,
          full_name: req.user.full_name || req.user.email,
          email: req.user.email,
          phone: null,
          role: req.user.role,
          is_active: true,
        },
      });
    }

    return res.status(404).json({ success: false, message: "Profile not found" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};

// 4. PUT /api/auth/profile/:id
const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, name, phone } = req.body;
    const fullName = full_name ?? name;

    // Members edit only their own profile; admins may edit anyone's.
    if (id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "You can only edit your own profile." });
    }

    // Only touch the fields the caller actually sent.
    const patch = {};
    if (fullName !== undefined) patch.full_name = fullName;
    if (phone !== undefined) patch.phone = phone;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ success: false, message: "Nothing to update." });
    }

    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', id)
      .select('id, full_name, email, phone, role, is_active')
      .single();

    if (error) return res.status(400).json({ success: false, message: error.message });

    return res.status(200).json({ success: true, user: data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};

// 5. POST /api/auth/reset-password
// Completes the flow started by forgot-password. The emailed link carries a
// recovery access token; that token authorises the password change, so we use
// it as the caller's credentials rather than requiring a login.
const resetPassword = async (req, res) => {
  const { accessToken, token, newPassword, password } = req.body;
  const recoveryToken = accessToken || token;
  const nextPassword = newPassword || password;

  if (!recoveryToken || !nextPassword) {
    return res.status(400).json({ error: 'A reset token and a new password are required.' });
  }
  if (nextPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(recoveryToken);
    if (userError || !user) {
      return res.status(401).json({ error: 'This reset link is invalid or has expired. Request a new one.' });
    }

    const { error } = await scopedClient(recoveryToken).auth.updateUser({ password: nextPassword });
    if (error) return res.status(400).json({ error: error.message });

    return res.status(200).json({ success: true, message: 'Password updated. You can now sign in.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ error: 'Could not reset the password.' });
  }
};

// 6. PUT /api/auth/password
// Change your own password while signed in. Verifies the current password
// first, so a walked-up-to unlocked session can't be hijacked silently.
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are both required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'The new password must be different from the current one.' });
  }

  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: currentPassword,
    });
    if (signInError) {
      return res.status(401).json({ error: 'Your current password is incorrect.' });
    }

    const bearer = req.headers.authorization.split(' ')[1];
    const { error } = await scopedClient(bearer).auth.updateUser({ password: newPassword });
    if (error) return res.status(400).json({ error: error.message });

    return res.status(200).json({ success: true, message: 'Password changed.' });
  } catch (err) {
    console.error('changePassword error:', err);
    return res.status(500).json({ error: 'Could not change the password.' });
  }
};

// 7. GET /api/auth/members/lookup?email=
// Used by the circulation desk to confirm a member before checking a book out.
// Staff only — this turns an email into a member's identity.
const lookupMember = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'An email query parameter is required' });
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, is_active')
      .eq('email', email)
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Member not found' });

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  lookupMember,
  resetPassword,
  changePassword,
  forgotPassword
};