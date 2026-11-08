import express from "express";
import { registerUser, loginUser, getMe } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { loginLimiter, registerLimiter } from "../middleware/rateLimiters.js";
import { registerRules, loginRules, validate } from "../middleware/validators.js";

const router = express.Router();

router.post("/register", registerLimiter, registerRules, validate, registerUser);
router.post("/login", loginLimiter, loginRules, validate, loginUser);
router.get("/me", protect, getMe);

export default router;