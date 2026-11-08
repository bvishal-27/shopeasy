import { describe, it, expect } from "vitest";
import { api, createUser, createProduct, bearer } from "./helpers.js";

describe("GET /api/products", () => {
  it("paginates the results", async () => {
    const { user: admin } = await createUser({ role: "admin" });
    await Promise.all(
      [1, 2, 3].map((i) => createProduct(admin._id, { name: `Product ${i}` }))
    );

    const res = await api().get("/api/products?limit=2&page=1");

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.pages).toBe(2);
    expect(res.body.products).toHaveLength(2);
  });

  it("filters by category and minimum price", async () => {
    const { user: admin } = await createUser({ role: "admin" });
    await createProduct(admin._id, { name: "Cheap phone", price: 500 });
    await createProduct(admin._id, { name: "Jacket", category: "Fashion", price: 1500 });
    await createProduct(admin._id, { name: "Laptop", price: 3000 });

    const res = await api().get("/api/products?category=electronics&minPrice=1000");

    expect(res.body.total).toBe(1);
    expect(res.body.products[0].name).toBe("Laptop");
  });

  it("searches by keyword", async () => {
    const { user: admin } = await createUser({ role: "admin" });
    await createProduct(admin._id, { name: "Wireless Headphones" });
    await createProduct(admin._id, { name: "Running Shoes", category: "Fashion" });

    const res = await api().get("/api/products?keyword=headphones");

    expect(res.body.total).toBe(1);
    expect(res.body.products[0].name).toBe("Wireless Headphones");
  });

  it("does not crash on a regex-style category", async () => {
    const res = await api().get("/api/products").query({ category: "(a+)+$" });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });

  it("returns 404 for an invalid product id", async () => {
    const res = await api().get("/api/products/123");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/products", () => {
  it("needs a token", async () => {
    const res = await api().post("/api/products");
    expect(res.status).toBe(401);
  });

  it("is forbidden for normal users", async () => {
    const { token } = await createUser();
    const res = await api().post("/api/products").set(bearer(token));
    expect(res.status).toBe(403);
  });

  it("asks an admin for at least one image", async () => {
    const { token } = await createUser({ role: "admin" });
    const res = await api()
      .post("/api/products")
      .set(bearer(token))
      .field("name", "No image product");

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/image/i);
  });
});

describe("POST /api/products/:id/reviews", () => {
  it("adds a review, then updates it instead of duplicating", async () => {
    const { user: admin } = await createUser({ role: "admin" });
    const product = await createProduct(admin._id);
    const { token } = await createUser();
    const url = `/api/products/${product._id}/reviews`;

    const first = await api()
      .post(url)
      .set(bearer(token))
      .send({ rating: 4, comment: "Nice" });
    expect(first.status).toBe(201);

    const second = await api()
      .post(url)
      .set(bearer(token))
      .send({ rating: 2, comment: "Changed my mind" });
    expect(second.status).toBe(200);

    const res = await api().get(`/api/products/${product._id}`);
    expect(res.body.product.numReviews).toBe(1);
    expect(res.body.product.rating).toBe(2);
  });

  it("rejects an invalid rating", async () => {
    const { user: admin } = await createUser({ role: "admin" });
    const product = await createProduct(admin._id);
    const { token } = await createUser();

    const res = await api()
      .post(`/api/products/${product._id}/reviews`)
      .set(bearer(token))
      .send({ rating: 9, comment: "Too high" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/rating/i);
  });

  it("needs a logged-in user", async () => {
    const { user: admin } = await createUser({ role: "admin" });
    const product = await createProduct(admin._id);

    const res = await api()
      .post(`/api/products/${product._id}/reviews`)
      .send({ rating: 4, comment: "Nice" });

    expect(res.status).toBe(401);
  });
});