const rateLimit = require('express-rate-limit');

const buildLimiter = ({ windowMs, max, message, skipSuccessfulRequests = false }) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message,
        requestId: req.requestId,
      },
    });
  },
});

const globalLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many requests. Please slow down and try again shortly.',
});

const authLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  skipSuccessfulRequests: false,
  message: 'Too many login attempts. Please wait before trying again.',
});

const paymentLimiter = buildLimiter({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: 'Too many payment requests. Please wait a moment and retry.',
});

module.exports = {
  globalLimiter,
  authLimiter,
  paymentLimiter,
};
