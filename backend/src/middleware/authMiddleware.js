const supabase = require('../config/supabaseClient');

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

        // Attach the authenticated user object to the request so the controller can use it
        req.user = user;
        next(); // Move on to the next function
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Role-Based Access Control Middleware (Verifies what the user can do)
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        // This assumes your team stores the user's role in their Supabase user_metadata
        // e.g., { "role": "librarian" }
        const userRole = req.user?.user_metadata?.role;

        if (!userRole || !allowedRoles.includes(userRole)) {
            return res.status(403).json({
                message: 'Forbidden: You do not have permission to perform this action'
            });
        }

        next(); // Move on to the controller
    };
};

module.exports = { requireAuth, requireRole };