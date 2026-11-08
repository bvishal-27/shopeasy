// MongoDB operators like $gt or $ne start with "$". A normal user never sends keys like that.
// A payload such as { "email": { "$gt": "" } } is an injection attempt, so we reject it.
const hasBadKey = (value) => {
  if (Array.isArray(value)) return value.some(hasBadKey);

  if (value && typeof value === "object") {
    return Object.keys(value).some(
      (key) => key.startsWith("$") || key.includes(".") || hasBadKey(value[key])
    );
  }

  return false;
};

export default function sanitizeInput(req, res, next) {
  if (hasBadKey(req.body) || hasBadKey(req.query)) {
    res.status(400);
    return next(new Error("Invalid characters in request"));
  }
  next();
}