const supabase = require('../config/supabaseClient');



// 2. POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ success: false, message: error.message });
    }

    // Fetch details from the public.users table
    const { data: profile, error: profileError } = await supabase
      .from('users') 
      .select('full_name, role') 
      .eq('id', data.user.id)
      .single();

    return res.status(200).json({
      success: true,
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: profile?.full_name || "User",
        role: profile?.role || "student"
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};

// 3. GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: "No token provided." });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, message: "Invalid or expired token." });
    }

    // Fetch matching profile details from public.users table
    const { data: profile } = await supabase
      .from('users') 
      .select('full_name, role')
      .eq('id', user.id)
      .single();

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || "User",
        role: profile?.role || "student"
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};

module.exports = {
  login,
  getProfile
};