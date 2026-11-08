import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    setupFiles: ["./tests/setup.js"],
    fileParallelism: false,
    hookTimeout: 120000,
    testTimeout: 30000,
    // dummy values so the app can load without your real .env
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "test_secret_for_vitest_only",
      JWT_EXPIRES_IN: "1d",
      RAZORPAY_KEY_ID: "rzp_test_dummy",
      RAZORPAY_KEY_SECRET: "dummy_secret",
    },
  },
});