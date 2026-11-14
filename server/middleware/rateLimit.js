const rateLimit = require('express-rate-limit');

// Strict rate limit for patient intake registration: 10 requests per 15 minutes per IP
const intakeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many intake registration attempts from this IP. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Rate limit for interactive AI chat messages: 60 requests per minute per IP
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many chat messages sent in a short time. Please slow down and try again.',
    code: 'CHAT_RATE_LIMIT_EXCEEDED'
  }
});

// General API protection rate limit: 300 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP. Please try again later.',
    code: 'GLOBAL_RATE_LIMIT_EXCEEDED'
  }
});

module.exports = {
  intakeLimiter,
  chatLimiter,
  generalLimiter
};
