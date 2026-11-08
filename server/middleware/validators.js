import { body, validationResult } from "express-validator";

// Runs after the rules: turns the first error of each field into a normal 400
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  res.status(400);
  next(
    new Error(
      errors
        .array({ onlyFirstError: true })
        .map((e) => e.msg)
        .join(", ")
    )
  );
};

export const registerRules = [
  body("name")
    .isString().withMessage("Name is required").bail()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage("Name must be 2 to 50 characters"),
  body("email")
    .isString().withMessage("Email is required").bail()
    .trim()
    .toLowerCase()
    .isEmail().withMessage("Please provide a valid email"),
  // bcrypt only uses the first 72 bytes, so longer passwords are pointless
  body("password")
    .isString().withMessage("Password is required").bail()
    .isLength({ min: 6, max: 72 }).withMessage("Password must be 6 to 72 characters"),
];

export const loginRules = [
  body("email")
    .isString().withMessage("Email is required").bail()
    .trim()
    .toLowerCase()
    .isEmail().withMessage("Please provide a valid email"),
  body("password")
    .isString().withMessage("Password is required").bail()
    .notEmpty().withMessage("Password is required"),
];

export const reviewRules = [
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be a whole number from 1 to 5"),
  body("comment")
    .isString().withMessage("Comment is required").bail()
    .trim()
    .isLength({ min: 1, max: 500 }).withMessage("Comment must be 1 to 500 characters"),
];