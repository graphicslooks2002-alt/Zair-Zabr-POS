const rateLimit = require("express-rate-limit");

// Throttle auth endpoints to blunt brute-force / credential stuffing.
// NOTE: default store is in-memory (per serverless instance). For multi-instance
// production scale, back this with a shared store (e.g. Upstash Redis).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20, // 20 attempts / window / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." },
});

module.exports = { authLimiter };
