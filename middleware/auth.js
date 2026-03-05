

// Authentication middleware - preserves exact same logic as original project

const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        // Check if user is blocked (same as original)
        const User = require('../models/User');

        User.findById(req.session.userId)
            .then(user => {
                if (!user) {
                    req.session.destroy();
                    return res.status(401).json({ error: 'Authentication failed' });
                }
                if (user.is_blocked) {
                    req.session.destroy();
                    return res.status(403).json({ error: 'Your account has been blocked. Please contact admin.' });
                }
                req.user = user; // Attach user to request
                next();
            })
            .catch(err => {
                req.session.destroy();
                return res.status(401).json({ error: 'Authentication failed' });
            });
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
};

// Check admin role
const requireAdmin = (req, res, next) => {
    if (req.session.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

// Check specific role
const requireRole = (role) => {
    return (req, res, next) => {
        if (req.session.role === role) {
            next();
        } else {
            res.status(403).json({ error: 'Insufficient permissions' });
        }
    };
};

module.exports = {
    requireAuth,
    requireAdmin,
    requireRole
};
