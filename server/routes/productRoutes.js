import express from "express";
import {
  getProducts,
  getCategories,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProductImage,
  createProductReview,
} from "../controllers/productController.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import { reviewRules, validate } from "../middleware/validators.js";

const router = express.Router();

router
  .route("/")
  .get(getProducts)
  .post(protect, admin, upload.array("images", 5), createProduct);

// Must be defined BEFORE "/:id", otherwise "categories" is treated as an id
router.get("/categories", getCategories);

router
  .route("/:id")
  .get(getProductById)
  .put(protect, admin, upload.array("images", 5), updateProduct)
  .delete(protect, admin, deleteProduct);

router.delete("/:id/images", protect, admin, deleteProductImage);
router.post("/:id/reviews", protect, reviewRules, validate, createProductReview);

export default router;