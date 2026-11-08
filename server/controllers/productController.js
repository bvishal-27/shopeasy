import Product from "../models/Product.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/uploadToCloudinary.js";
// Escapes characters that have a special meaning in a regular expression
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// @desc    Get products (search, filter, sort, paginate)
// @route   GET /api/products?keyword=&category=&minPrice=&maxPrice=&sort=&page=&limit=
// @access  Public
export const getProducts = asyncHandler(async (req, res) => {
  const { keyword, category, brand, minPrice, maxPrice, sort, page, limit } = req.query;

  const query = {};

    if (keyword) {
    query.$text = { $search: String(keyword) };
  }
  if (category) {
    query.category = { $regex: `^${escapeRegex(category)}$`, $options: "i" };
  }
  if (brand) {
    query.brand = { $regex: `^${escapeRegex(brand)}$`, $options: "i" };
  }
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // Sorting options
  const sortOptions = {
    "price-asc": { price: 1 },
    "price-desc": { price: -1 },
    newest: { createdAt: -1 },
    rating: { rating: -1 },
  };
  const sortBy = sortOptions[sort] || { createdAt: -1 };

  // Pagination
  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 12, 1), 50);
  const skip = (pageNum - 1) * limitNum;

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .select("-reviews") // keep the list response small
    .sort(sortBy)
    .skip(skip)
    .limit(limitNum);

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    products,
  });
});

// @desc    Get distinct categories (for filter dropdowns)
// @route   GET /api/products/categories
// @access  Public
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.distinct("category");
  res.status(200).json({ success: true, categories });
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.status(200).json({ success: true, product });
});

// @desc    Create product (with images)
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, category, brand, stock } = req.body;

  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error("Please upload at least one product image");
  }

  const images = await Promise.all(
    req.files.map((file) => uploadToCloudinary(file.buffer))
  );

  const product = await Product.create({
    name,
    description,
    price,
    category,
    brand,
    stock,
    images,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, product });
});

// @desc    Update product (optionally add new images)
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const { name, description, price, category, brand, stock } = req.body;

  if (name !== undefined) product.name = name;
  if (description !== undefined) product.description = description;
  if (price !== undefined) product.price = price;
  if (category !== undefined) product.category = category;
  if (brand !== undefined) product.brand = brand;
  if (stock !== undefined) product.stock = stock;

  // If new images were uploaded, add them to the existing ones
  if (req.files && req.files.length > 0) {
    const newImages = await Promise.all(
      req.files.map((file) => uploadToCloudinary(file.buffer))
    );
    product.images.push(...newImages);
  }

  const updated = await product.save();
  res.status(200).json({ success: true, product: updated });
});

// @desc    Delete a single image from a product
// @route   DELETE /api/products/:id/images
// @access  Private/Admin
// body: { "public_id": "shopease/products/abc123" }
export const deleteProductImage = asyncHandler(async (req, res) => {
  const { public_id } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  if (product.images.length <= 1) {
    res.status(400);
    throw new Error("A product must keep at least one image");
  }

  const exists = product.images.some((img) => img.public_id === public_id);
  if (!exists) {
    res.status(404);
    throw new Error("Image not found on this product");
  }

  await deleteFromCloudinary(public_id);
  product.images = product.images.filter((img) => img.public_id !== public_id);
  await product.save();

  res.status(200).json({ success: true, product });
});

// @desc    Delete product (and its images)
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  await Promise.all(product.images.map((img) => deleteFromCloudinary(img.public_id)));
  await product.deleteOne();

  res.status(200).json({ success: true, message: "Product deleted" });
});

// @desc    Create or update a review
// @route   POST /api/products/:id/reviews
// @access  Private
export const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  if (!rating || !comment) {
    res.status(400);
    throw new Error("Please provide rating and comment");
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const existing = product.reviews.find(
    (r) => r.user.toString() === req.user._id.toString()
  );

  if (existing) {
    // user already reviewed: update their review
    existing.rating = Number(rating);
    existing.comment = comment;
  } else {
    product.reviews.push({
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment,
    });
  }

  product.numReviews = product.reviews.length;
  product.rating =
    product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length;

  await product.save();

  res.status(existing ? 200 : 201).json({
    success: true,
    message: existing ? "Review updated" : "Review added",
  });
});