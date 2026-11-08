import { describe, it, expect } from "vitest";
import { api, createUser, bearer } from "./helpers.js";

const validUser = { name: "Vishal", email: "vishal@test.com", password: "123456" };

describe("POST /api/auth/register", () => {
  it("creates a user and returns a token", async () => {
    const res = await api().post("/api/auth/register").send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user.token).toBeTruthy();
    expect(res.body.user.password).toBeUndefined();
  });

  it("ignores a role sent by the client", async () => {
    const res = await api()
      .post("/api/auth/register")
      .send({ ...validUser, role: "admin" });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("user");
  });

  it("rejects a duplicate email", async () => {
    await api().post("/api/auth/register").send(validUser);
    const res = await api().post("/api/auth/register").send(validUser);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("rejects a short password", async () => {
    const res = await api()
      .post("/api/auth/register")
      .send({ ...validUser, password: "123" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/password/i);
  });

  it("rejects an invalid email", async () => {
    const res = await api()
      .post("/api/auth/register")
      .send({ ...validUser, email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with the correct password", async () => {
    await createUser({ email: "login@test.com", password: "secret123" });

    const res = await api()
      .post("/api/auth/login")
      .send({ email: "login@test.com", password: "secret123" });

    expect(res.status).toBe(200);
    expect(res.body.user.token).toBeTruthy();
  });

  it("rejects a wrong password with a generic message", async () => {
    await createUser({ email: "login@test.com", password: "secret123" });

    const res = await api()
      .post("/api/auth/login")
      .send({ email: "login@test.com", password: "wrongpass" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("blocks a NoSQL injection payload", async () => {
    await createUser({ email: "login@test.com", password: "secret123" });

    const res = await api()
      .post("/api/auth/login")
      .send({ email: { $gt: "" }, password: { $gt: "" } });

    expect(res.status).toBe(400);
    expect(res.body.user).toBeUndefined();
  });

  it("returns 400 for broken JSON", async () => {
    const res = await api()
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": ');

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid json/i);
  });
});

describe("protected routes", () => {
  it("GET /api/auth/me needs a token", async () => {
    const res = await api().get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("GET /api/auth/me returns the logged-in user", async () => {
    const { user, token } = await createUser();
    const res = await api().get("/api/auth/me").set(bearer(token));

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
  });

  it("GET /api/users is forbidden for normal users", async () => {
    const { token } = await createUser();
    const res = await api().get("/api/users").set(bearer(token));
    expect(res.status).toBe(403);
  });

  it("GET /api/users works for admins", async () => {
    const { token } = await createUser({ role: "admin" });
    const res = await api().get("/api/users").set(bearer(token));

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
  });
});