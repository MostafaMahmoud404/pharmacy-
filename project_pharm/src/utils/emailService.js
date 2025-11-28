const nodemailer = require("nodemailer");

// إنشاء Transporter
const createTransporter = () => {
  // التحقق من الإعدادات
  if (
    !process.env.EMAIL_HOST ||
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_PASS
  ) {
    console.warn(
      "⚠️ Email configuration is incomplete. Email features will not work."
    );
    return null;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_PORT === "465", // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // للتعامل مع self-signed certificates
      tls: {
        rejectUnauthorized: false,
      },
    });

    console.log("✅ Email transporter created successfully");
    return transporter;
  } catch (error) {
    console.error("❌ Error creating email transporter:", error.message);
    return null;
  }
};

// إرسال إيميل عام
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    // إذا لم يتم إعداد الإيميل، نطبع رسالة فقط
    if (!transporter) {
      console.log("📧 Email would be sent to:", options.to);
      console.log("📧 Subject:", options.subject);
      console.log("⚠️ Email service not configured. Check .env file.");

      // في Development، نعتبر الإيميل "تم إرساله"
      if (process.env.NODE_ENV === "development") {
        return { messageId: "dev-mode-no-email" };
      }

      throw new Error("Email service not configured");
    }

    const mailOptions = {
      from: `"${process.env.FROM_NAME || "منصة الصيدلية"}" <${
        process.env.EMAIL_USER
      }>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    console.log("📧 To:", options.to);

    return info;
  } catch (error) {
    console.error("❌ Email error:", error.message);

    // في Development، نطبع الخطأ لكن ما نوقف التطبيق
    if (process.env.NODE_ENV === "development") {
      console.log("⚠️ Email failed in dev mode, continuing...");
      console.log("📧 Email that would be sent:");
      console.log("   To:", options.to);
      console.log("   Subject:", options.subject);
      return { messageId: "dev-mode-failed" };
    }

    throw error;
  }
};

// إرسال إيميل التفعيل
const sendVerificationEmail = async (email, token, userName) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { background-color: #4CAF50; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .button { display: inline-block; padding: 15px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { background-color: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏥 مرحباً بك في منصة الصيدلية</h1>
        </div>
        <div class="content">
          <h2>مرحباً ${userName}،</h2>
          <p>شكراً لتسجيلك معنا! يرجى تفعيل حسابك بالنقر على الزر أدناه:</p>
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">تفعيل الحساب</a>
          </div>
          <p>أو يمكنك نسخ الرابط التالي في المتصفح:</p>
          <p style="background-color: #f8f8f8; padding: 10px; border-radius: 5px; word-break: break-all;">
            ${verificationUrl}
          </p>
          <p><strong>ملاحظة:</strong> هذا الرابط صالح لمدة 24 ساعة فقط.</p>
        </div>
        <div class="footer">
          <p>إذا لم تقم بإنشاء هذا الحساب، يرجى تجاهل هذا البريد.</p>
          <p>&copy; 2024 منصة الصيدلية - جميع الحقوق محفوظة</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: "تفعيل حسابك - منصة الصيدلية",
    html,
  });
};

// إرسال إيميل إعادة تعيين كلمة المرور
const sendResetPasswordEmail = async (email, token, userName) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { background-color: #2196F3; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .button { display: inline-block; padding: 15px 30px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { background-color: #fff3cd; border-right: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .footer { background-color: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 إعادة تعيين كلمة المرور</h1>
        </div>
        <div class="content">
          <h2>مرحباً ${userName}،</h2>
          <p>تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك.</p>
          <p>يرجى النقر على الزر أدناه لإعادة تعيين كلمة المرور:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">إعادة تعيين كلمة المرور</a>
          </div>
          <p>أو يمكنك نسخ الرابط التالي في المتصفح:</p>
          <p style="background-color: #f8f8f8; padding: 10px; border-radius: 5px; word-break: break-all;">
            ${resetUrl}
          </p>
          <div class="warning">
            <strong>⚠️ تنبيه أمني:</strong>
            <ul>
              <li>هذا الرابط صالح لمدة 30 دقيقة فقط</li>
              <li>إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد</li>
              <li>لا تشارك هذا الرابط مع أي شخص</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          <p>&copy; 2024 منصة الصيدلية - جميع الحقوق محفوظة</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: "إعادة تعيين كلمة المرور - منصة الصيدلية",
    html,
  });
};

// إرسال إيميل تأكيد الطلب
const sendOrderConfirmationEmail = async (
  email,
  userName,
  orderNumber,
  orderDetails
) => {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { background-color: #4CAF50; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .order-details { background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .footer { background-color: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ تم تأكيد طلبك</h1>
        </div>
        <div class="content">
          <h2>مرحباً ${userName}،</h2>
          <p>شكراً لطلبك! تم تأكيد طلبك بنجاح.</p>
          <div class="order-details">
            <h3>تفاصيل الطلب:</h3>
            <p><strong>رقم الطلب:</strong> ${orderNumber}</p>
            <p><strong>الإجمالي:</strong> ${orderDetails.total} جنيه</p>
            <p><strong>طريقة الدفع:</strong> ${orderDetails.paymentMethod}</p>
          </div>
          <p>سنقوم بتجهيز طلبك وتوصيله في أقرب وقت ممكن.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 منصة الصيدلية - جميع الحقوق محفوظة</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `تأكيد الطلب #${orderNumber} - منصة الصيدلية`,
    html,
  });
};

// إرسال إيميل تأكيد الاستشارة
const sendConsultationConfirmationEmail = async (
  email,
  userName,
  consultationDetails
) => {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { background-color: #2196F3; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .consultation-details { background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .footer { background-color: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📅 تأكيد موعد الاستشارة</h1>
        </div>
        <div class="content">
          <h2>مرحباً ${userName}،</h2>
          <p>تم تأكيد موعد استشارتك بنجاح!</p>
          <div class="consultation-details">
            <h3>تفاصيل الاستشارة:</h3>
            <p><strong>رقم الاستشارة:</strong> ${consultationDetails.number}</p>
            <p><strong>الطبيب:</strong> ${consultationDetails.doctorName}</p>
            <p><strong>الموعد:</strong> ${consultationDetails.date}</p>
            <p><strong>النوع:</strong> ${consultationDetails.type}</p>
          </div>
          <p>يرجى الاستعداد للاستشارة في الموعد المحدد.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 منصة الصيدلية - جميع الحقوق محفوظة</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `تأكيد الاستشارة #${consultationDetails.number} - منصة الصيدلية`,
    html,
  });
};

// إرسال إيميل تنبيه الاستشارة القادمة
const sendConsultationReminderEmail = async (
  email,
  userName,
  consultationDetails
) => {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { background-color: #FF9800; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .reminder { background-color: #fff3cd; border-right: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .footer { background-color: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ تذكير بموعد الاستشارة</h1>
        </div>
        <div class="content">
          <h2>مرحباً ${userName}،</h2>
          <div class="reminder">
            <p><strong>تذكير:</strong> لديك استشارة قادمة خلال ساعة!</p>
            <p><strong>الطبيب:</strong> ${consultationDetails.doctorName}</p>
            <p><strong>الموعد:</strong> ${consultationDetails.date}</p>
          </div>
          <p>يرجى التأكد من جاهزيتك للاستشارة.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 منصة الصيدلية - جميع الحقوق محفوظة</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: "تذكير: موعد استشارتك اقترب - منصة الصيدلية",
    html,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendOrderConfirmationEmail,
  sendConsultationConfirmationEmail,
  sendConsultationReminderEmail,
};
