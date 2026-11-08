// Runs when no route matches the request
export const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Central error handler: every error in the app ends up here
export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Invalid MongoDB ObjectId (e.g. /api/products/123)
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    message = "Resource not found";
  }

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  // Duplicate key (e.g. email already registered)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  }

  // Multer errors (file too large, too many files)
  if (err.name === "MulterError") {
    statusCode = 400;
    message = err.message;
  }

  // Our file filter error
  if (err.message === "Only image files are allowed") {
    statusCode = 400;
  }

  // Broken or oversized JSON body
  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON in request body";
  }
  if (err.type === "entity.too.large") {
    statusCode = 413;
    message = "Request body is too large";
  }

  // Unexpected errors: log them, and don't leak details to users in production
  if (statusCode === 500) {
    console.error(err);
    if (process.env.NODE_ENV === "production") message = "Internal server error";
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};