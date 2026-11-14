const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'caresync-dev-secret-key-change-in-production';

/**
 * Generate a signed session token for a patient after successful intake.
 */
function generateSessionToken(patientId, sessionId) {
  return jwt.sign(
    { patientId, sessionId },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Authentication middleware that requires a valid JWT token.
 * Extracts token from Authorization: Bearer <token> or x-session-token header.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const customHeader = req.headers['x-session-token'];
  
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (customHeader) {
    token = String(customHeader).trim();
  } else if (req.query.token) {
    token = String(req.query.token).trim();
  }

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required: missing session token',
      code: 'AUTH_REQUIRED'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.auth = decoded;

    // Route-specific resource authorization
    if (req.params.patientId && req.params.patientId !== decoded.patientId) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to access records for this patient ID',
        code: 'ACCESS_DENIED'
      });
    }

    if (req.params.sessionId && req.params.sessionId !== decoded.sessionId) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to access this chat session',
        code: 'ACCESS_DENIED'
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Authentication failed: invalid or expired session token',
      code: 'TOKEN_INVALID'
    });
  }
}

module.exports = {
  generateSessionToken,
  requireAuth,
  JWT_SECRET
};
