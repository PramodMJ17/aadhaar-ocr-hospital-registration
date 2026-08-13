const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pesu-imsr-aadhaar-ocr-secret-key-12345';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Token missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired sign-in session.' });
    }
    req.user = user;
    next();
  });
}

function authorizeRole(allowedRoles = []) {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(403).json({ error: 'Access denied. Role not found in session.' });
    }

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({ error: 'Access denied. Unauthorized role for this action.' });
  };
}

module.exports = {
  authenticateToken,
  authorizeRole,
  JWT_SECRET,
};
