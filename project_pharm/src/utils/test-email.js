// Test Email Configuration
// Run: node src/utils/test-email.js

require("dotenv").config();
const nodemailer = require("nodemailer");

console.log("=".repeat(60));
console.log("📧 Email Configuration Test");
console.log("=".repeat(60));

// 1. Check environment variables
console.log("\n1. Checking environment variables:");
console.log("   EMAIL_HOST:", process.env.EMAIL_HOST || "❌ NOT SET");
console.log("   EMAIL_PORT:", process.env.EMAIL_PORT || "❌ NOT SET");
console.log("   EMAIL_USER:", process.env.EMAIL_USER || "❌ NOT SET");
console.log(
  "   EMAIL_PASS:",
  process.env.EMAIL_PASS ? "✅ SET (hidden)" : "❌ NOT SET"
);

if (
  !process.env.EMAIL_HOST ||
  !process.env.EMAIL_USER ||
  !process.env.EMAIL_PASS
) {
  console.log("\n❌ Email configuration incomplete!");
  console.log("\n📝 To configure email, add these to your .env file:");
  console.log(`
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Or use Mailtrap for development:
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your_mailtrap_user
EMAIL_PASS=your_mailtrap_pass
  `);

  console.log("\n💡 For development without email:");
  console.log("   Set NODE_ENV=development and leave EMAIL settings empty");
  console.log("   The API will return reset tokens in responses instead");

  process.exit(1);
}

// 2. Create transporter
console.log("\n2. Creating email transporter...");
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_PORT === "465",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// 3. Verify connection
console.log("3. Verifying SMTP connection...");
transporter.verify(function (error, success) {
  if (error) {
    console.log("❌ Connection failed:", error.message);
    console.log("\n🔍 Common issues:");
    console.log("   - Wrong EMAIL_HOST or EMAIL_PORT");
    console.log("   - Invalid EMAIL_USER or EMAIL_PASS");
    console.log(
      "   - For Gmail: Make sure you use App Password, not account password"
    );
    console.log("   - Firewall blocking connection");
    process.exit(1);
  } else {
    console.log("✅ SMTP connection successful!");

    // 4. Send test email
    console.log("\n4. Sending test email...");

    const mailOptions = {
      from: `"${process.env.FROM_NAME || "Pharmacy Test"}" <${
        process.env.EMAIL_USER
      }>`,
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: "Test Email - Pharmacy Backend",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #4CAF50;">✅ Email Configuration Successful!</h2>
          <p>This is a test email from your Pharmacy Backend application.</p>
          <p><strong>Configuration:</strong></p>
          <ul>
            <li>Host: ${process.env.EMAIL_HOST}</li>
            <li>Port: ${process.env.EMAIL_PORT}</li>
            <li>User: ${process.env.EMAIL_USER}</li>
          </ul>
          <p>If you received this email, your email configuration is working correctly!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            Sent at: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("❌ Failed to send test email:", error.message);
        process.exit(1);
      }

      console.log("✅ Test email sent successfully!");
      console.log("   Message ID:", info.messageId);
      console.log(
        "   Preview URL:",
        nodemailer.getTestMessageUrl(info) || "N/A"
      );

      console.log("\n" + "=".repeat(60));
      console.log("✅ All email tests passed!");
      console.log("=".repeat(60));

      console.log("\n📧 Check your inbox:", process.env.EMAIL_USER);
      if (process.env.EMAIL_HOST.includes("mailtrap")) {
        console.log("   Or check Mailtrap inbox: https://mailtrap.io/inboxes");
      }

      process.exit(0);
    });
  }
});
