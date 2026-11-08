import request from "supertest";
import app from "../app.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import generateToken from "../utils/generateToken.js";

export const api = () => request(app);

let counter = 0;

// Creates a user directly in the database and returns { user, token }
export const createUser = async (overrides = {}) => {
  counter += 1;
  const user = await User.create({
    name: "Test User",
    email: `user${counter}@test.com`,
    password: "123456",
    ...overrides,
  });
  return { user, token: generateToken(user._id) };
};

export const createProduct = (createdBy, overrides = {}) =>
  Product.create({
    name: "Test Product",
    description: "A product used in tests",
    price: 500,
    category: "Electronics",
    brand: "Acme",
    stock: 10,
    images: [{ url: "https://example.com/a.jpg", public_id: "test/a" }],
    createdBy,
    ...overrides,
  });

export const bearer = (token) => ({ Authorization: `Bearer ${token}` });