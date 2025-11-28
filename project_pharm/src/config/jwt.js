const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  // التأكد من وجود JWT_SECRET
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

const verifyToken = (token) => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("JWT Verification Error:", error.message);
    return null;
  }
};

module.exports = { generateToken, verifyToken };
