import rateLimit from "express-rate-limit";

const skipInTests = () => process.env.NODE_ENV === "test";

const make = (options) =>
  rateLimit({
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: skipInTests,
    ...options,
  });

// Whole API: 500 requests per 15 minutes per IP
export const apiLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  message: { success: false, message: "Too many requests, please try again later" },
});

// Login: 10 FAILED attempts per 15 minutes per IP (successful logins don't count)
export const loginLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes",
  },
});

// Register: 10 new accounts per hour per IP (stops mass sign-ups by bots)
export const registerLimiter = make({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: {
    success: false,
    message: "Too many accounts created from this IP. Please try again later",
  },
});