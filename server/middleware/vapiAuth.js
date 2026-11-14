/**
 * Vapi Webhook Authentication Middleware
 * Validates the x-vapi-secret header against VAPI_WEBHOOK_SECRET.
 */
function verifyVapiWebhook(req, res, next) {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  const incomingSecret = req.headers['x-vapi-secret'];

  // If secret is configured, strictly enforce matching
  if (secret) {
    if (!incomingSecret || incomingSecret !== secret) {
      return res.status(401).json({
        error: 'Unauthorized: Invalid or missing Vapi webhook secret',
        code: 'VAPI_AUTH_FAILED'
      });
    }
    return next();
  }

  // In production, fail closed if VAPI_WEBHOOK_SECRET is missing
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({
      error: 'Server configuration error: VAPI_WEBHOOK_SECRET is not configured',
      code: 'VAPI_SECRET_UNSET'
    });
  }

  // Development fallback: warn once if secret is unset
  console.warn('⚠️ [VapiAuth]: VAPI_WEBHOOK_SECRET not set. Allowing request in development mode.');
  next();
}

module.exports = { verifyVapiWebhook };
