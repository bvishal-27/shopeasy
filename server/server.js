import "dotenv/config"; // must stay first: loads .env before anything else
import "./config/validateEnv.js"; // exits early if a variable is missing
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import app from "./app.js";

await connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Render sends SIGTERM on every deploy: finish current requests, then exit
const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
  shutdown("unhandledRejection");
});