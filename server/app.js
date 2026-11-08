import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { apiLimiter } from "./middleware/rateLimiters.js";
import sanitizeInput from "./middleware/sanitizeInput.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();
const isProd = process.env.NODE_ENV === "production";

// Behind Render's proxy, trust the first proxy so rate limiting sees each
// visitor's real IP (without this, every user shares one IP and one limit)
if (isProd) app.set("trust proxy", 1);

// Secure HTTP headers
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// CORS: only our own frontend may call the API from a browser
const allowedOrigins = [
  process.env.CLIENT_URL,
  !isProd && "http://localhost:5173",
]
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ""));

app.use(
  cors({
    origin: (origin, callback) => {
      // no Origin header = Postman, curl, server-to-server: allowed
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(null, false); // the browser blocks the response
    },
  })
);

if (process.env.NODE_ENV === "development") app.use(morgan("dev"));
else if (isProd) app.use(morgan("tiny"));

// General rate limit for every API route
app.use("/api", apiLimiter);

// Body parsers with a size limit
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Block NoSQL injection payloads
app.use(sanitizeInput);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ShopEase API is running",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);

// Error handlers (must come AFTER all routes)
app.use(notFound);
app.use(errorHandler);

export default app;