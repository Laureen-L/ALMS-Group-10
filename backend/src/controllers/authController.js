const supabase = require('../config/supabaseClient');



const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try { 

    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    // const {data,error} = {data: null, error: null}; // Placeholder for demonstration;

    // 2. Safely check for a Supabase API error
    if (error) {
      return res.status(error.status && error.status >= 400 && error.status < 600 ? error.status : 400)
        .json({ error: error || 'Supabase authentication error.' });
    }

    return res.status(200).json({ 
      message: 'If the email exists, a password reset link has been sent.',
      data: data || {} 
    });
    
  } catch (err) {
    // 3. This will print the REAL error to your terminal running the server
    console.error("❌ Forgot Password Error Details:", err);

    // 4. Send back the actual message string instead of the raw object
    return res.status(500).json({ 
      error: 'Internal server error.',
      details: err.message || 'Unknown error occurred'
    });
  }
};


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
  getProfile,
  forgotPassword
};