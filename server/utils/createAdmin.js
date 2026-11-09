import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = "Admin" } = process.env;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
console.log("Connected to database:", mongoose.connection.name);

const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });

if (existing) {
  existing.role = "admin";
  await existing.save();
  console.log("Existing user promoted to admin:", ADMIN_EMAIL);
} else {
  await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: "admin",
  });
  console.log("Admin created:", ADMIN_EMAIL);
}

await mongoose.disconnect();