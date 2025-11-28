// ضع هذا الملف في: src/utils/test-jwt.js
// للتشغيل: node src/utils/test-jwt.js

require("dotenv").config();
const jwt = require("jsonwebtoken");

console.log("=".repeat(50));
console.log("JWT Configuration Test");
console.log("=".repeat(50));

// 1. التحقق من JWT_SECRET
console.log("\n1. Checking JWT_SECRET:");
if (process.env.JWT_SECRET) {
  console.log("✅ JWT_SECRET exists");
  console.log("   Length:", process.env.JWT_SECRET.length);
  console.log(
    "   First 10 chars:",
    process.env.JWT_SECRET.substring(0, 10) + "..."
  );
} else {
  console.log("❌ JWT_SECRET is NOT defined!");
  console.log("   Please add JWT_SECRET to your .env file");
  process.exit(1);
}

// 2. توليد Token تجريبي
console.log("\n2. Generating test token:");
const testUserId = "507f1f77bcf86cd799439011";
try {
  const token = jwt.sign({ id: testUserId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  console.log("✅ Token generated successfully");
  console.log("   Token:", token.substring(0, 30) + "...");

  // 3. التحقق من الـ Token
  console.log("\n3. Verifying token:");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log("✅ Token verified successfully");
  console.log("   Decoded user ID:", decoded.id);
  console.log("   Expires at:", new Date(decoded.exp * 1000).toISOString());

  // 4. اختبار Token خاطئ
  console.log("\n4. Testing invalid token:");
  try {
    jwt.verify("invalid.token.here", process.env.JWT_SECRET);
    console.log("❌ Should have thrown an error");
  } catch (err) {
    console.log("✅ Invalid token rejected correctly");
    console.log("   Error:", err.message);
  }

  // 5. اختبار Secret خاطئ
  console.log("\n5. Testing wrong secret:");
  try {
    jwt.verify(token, "wrong_secret_key");
    console.log("❌ Should have thrown an error");
  } catch (err) {
    console.log("✅ Wrong secret rejected correctly");
    console.log("   Error:", err.message);
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ All JWT tests passed!");
  console.log("=".repeat(50));

  console.log("\n📋 Use this token for testing in Postman:");
  console.log(token);
} catch (error) {
  console.log("❌ Error:", error.message);
  process.exit(1);
}
