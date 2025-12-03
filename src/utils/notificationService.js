const { sendEmail } = require("./emailService");

// ========================================
// SMS NOTIFICATIONS
// ========================================

// إرسال SMS عبر Twilio
const sendSMSTwilio = async (phone, message) => {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.log("Twilio not configured");
    return false;
  }

  try {
    const twilio = require("twilio");
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    console.log(`SMS sent to ${phone}`);
    return true;
  } catch (error) {
    console.error("Twilio SMS error:", error);
    return false;
  }
};

// إرسال SMS عبر Nexmo/Vonage
const sendSMSNexmo = async (phone, message) => {
  if (!process.env.NEXMO_API_KEY) {
    console.log("Nexmo not configured");
    return false;
  }

  try {
    const { Vonage } = require("@vonage/server-sdk");
    const vonage = new Vonage({
      apiKey: process.env.NEXMO_API_KEY,
      apiSecret: process.env.NEXMO_API_SECRET,
    });

    await vonage.sms.send({
      to: phone,
      from: process.env.NEXMO_FROM_NUMBER,
      text: message,
    });

    console.log(`SMS sent to ${phone}`);
    return true;
  } catch (error) {
    console.error("Nexmo SMS error:", error);
    return false;
  }
};

// وظيفة عامة لإرسال SMS
const sendSMS = async (phone, message) => {
  if (
    !process.env.ENABLE_SMS_NOTIFICATIONS ||
    process.env.ENABLE_SMS_NOTIFICATIONS === "false"
  ) {
    console.log("SMS notifications disabled");
    return false;
  }

  // تنسيق رقم الهاتف
  if (!phone.startsWith("+")) {
    phone = "+" + phone;
  }

  // محاولة Twilio أولاً
  if (process.env.TWILIO_ACCOUNT_SID) {
    return await sendSMSTwilio(phone, message);
  }

  // محاولة Nexmo
  if (process.env.NEXMO_API_KEY) {
    return await sendSMSNexmo(phone, message);
  }

  console.log("No SMS provider configured");
  return false;
};

// ========================================
// PUSH NOTIFICATIONS
// ========================================

// إرسال Push Notification عبر Firebase
const sendPushNotification = async (userId, title, body, data = {}) => {
  if (
    !process.env.ENABLE_PUSH_NOTIFICATIONS ||
    process.env.ENABLE_PUSH_NOTIFICATIONS === "false"
  ) {
    console.log("Push notifications disabled");
    return false;
  }

  if (!process.env.FIREBASE_SERVER_KEY) {
    console.log("Firebase not configured");
    return false;
  }

  try {
    // يحتاج User Token من الـ Model
    const User = require("../models/User");
    const user = await User.findById(userId).select("fcmToken");

    if (!user || !user.fcmToken) {
      console.log("User FCM token not found");
      return false;
    }

    const admin = require("firebase-admin");

    const message = {
      notification: {
        title,
        body,
      },
      data,
      token: user.fcmToken,
    };

    await admin.messaging().send(message);
    console.log(`Push notification sent to user ${userId}`);
    return true;
  } catch (error) {
    console.error("Push notification error:", error);
    return false;
  }
};

// ========================================
// NOTIFICATION TEMPLATES
// ========================================

// إشعار طلب جديد للصيدلية
const notifyNewOrder = async (order) => {
  const message = `طلب جديد #${order.orderNumber} - الإجمالي: ${order.pricing.total} ج.م`;

  // إرسال إيميل للصيدلية
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS === "true") {
    await sendEmail({
      to: process.env.PHARMACY_EMAIL || "pharmacy@example.com",
      subject: "طلب جديد",
      html: `<h2>طلب جديد</h2><p>${message}</p>`,
    });
  }

  // إرسال SMS للصيدلية
  if (process.env.PHARMACY_PHONE) {
    await sendSMS(process.env.PHARMACY_PHONE, message);
  }
};

// إشعار تأكيد الطلب للعميل
const notifyOrderConfirmed = async (order, customer) => {
  const message = `تم تأكيد طلبك #${order.orderNumber}. سيتم تجهيزه وتوصيله قريباً.`;

  if (process.env.ENABLE_EMAIL_NOTIFICATIONS === "true") {
    await sendEmail({
      to: customer.email,
      subject: "تأكيد الطلب",
      html: `<h2>تم تأكيد طلبك</h2><p>${message}</p>`,
    });
  }

  await sendSMS(customer.phone, message);
  await sendPushNotification(customer._id, "تأكيد الطلب", message);
};

// إشعار شحن الطلب
const notifyOrderShipped = async (order, customer) => {
  const message = `طلبك #${order.orderNumber} في الطريق إليك!`;

  if (process.env.ENABLE_EMAIL_NOTIFICATIONS === "true") {
    await sendEmail({
      to: customer.email,
      subject: "الطلب في الطريق",
      html: `<h2>طلبك في الطريق</h2><p>${message}</p>`,
    });
  }

  await sendSMS(customer.phone, message);
  await sendPushNotification(customer._id, "الطلب في الطريق", message);
};

// إشعار توصيل الطلب
const notifyOrderDelivered = async (order, customer) => {
  const message = `تم توصيل طلبك #${order.orderNumber}. نتمنى أن تكون راضياً عن خدمتنا!`;

  if (process.env.ENABLE_EMAIL_NOTIFICATIONS === "true") {
    await sendEmail({
      to: customer.email,
      subject: "تم التوصيل",
      html: `<h2>تم توصيل طلبك</h2><p>${message}</p>`,
    });
  }

  await sendSMS(customer.phone, message);
  await sendPushNotification(customer._id, "تم التوصيل", message);
};

// إشعار استشارة جديدة للدكتور
const notifyNewConsultation = async (consultation, doctor) => {
  const message = `استشارة جديدة #${
    consultation.consultationNumber
  } في ${new Date(consultation.scheduledTime).toLocaleString("ar-EG")}`;

  if (process.env.ENABLE_EMAIL_NOTIFICATIONS === "true") {
    await sendEmail({
      to: doctor.user.email,
      subject: "استشارة جديدة",
      html: `<h2>استشارة جديدة</h2><p>${message}</p>`,
    });
  }

  await sendSMS(doctor.user.phone, message);
  await sendPushNotification(doctor.user._id, "استشارة جديدة", message);
};

// إشعار تذكير بالاستشارة (قبل ساعة)
const notifyConsultationReminder = async (consultation, user) => {
  const message = `تذكير: لديك استشارة خلال ساعة (#${consultation.consultationNumber})`;

  if (process.env.ENABLE_EMAIL_NOTIFICATIONS === "true") {
    await sendEmail({
      to: user.email,
      subject: "تذكير بالاستشارة",
      html: `<h2>تذكير بالاستشارة</h2><p>${message}</p>`,
    });
  }

  await sendSMS(user.phone, message);
  await sendPushNotification(user._id, "تذكير بالاستشارة", message);
};

// إشعار روشتة جديدة
const notifyNewPrescription = async (prescription, patient) => {
  const message = `لديك روشتة طبية جديدة (#${prescription.prescriptionNumber})`;

  if (process.env.ENABLE_EMAIL_NOTIFICATIONS === "true") {
    await sendEmail({
      to: patient.email,
      subject: "روشتة طبية جديدة",
      html: `<h2>روشتة طبية جديدة</h2><p>${message}</p>`,
    });
  }

  await sendSMS(patient.phone, message);
  await sendPushNotification(patient._id, "روشتة جديدة", message);
};

// إشعار منتج منخفض المخزون
const notifyLowStock = async (product) => {
  const message = `تنبيه: ${product.name} - المخزون المتبقي: ${product.stock}`;

  if (process.env.ENABLE_EMAIL_NOTIFICATIONS === "true") {
    await sendEmail({
      to: process.env.PHARMACY_EMAIL || "pharmacy@example.com",
      subject: "تنبيه مخزون منخفض",
      html: `<h2>تنبيه مخزون منخفض</h2><p>${message}</p>`,
    });
  }
};

// إشعار رسالة جديدة في الشات
const notifyNewMessage = async (consultation, recipientId, senderName) => {
  const message = `رسالة جديدة من ${senderName}`;

  await sendPushNotification(recipientId, "رسالة جديدة", message, {
    type: "chat",
    consultationId: consultation._id.toString(),
  });
};

module.exports = {
  sendSMS,
  sendPushNotification,
  notifyNewOrder,
  notifyOrderConfirmed,
  notifyOrderShipped,
  notifyOrderDelivered,
  notifyNewConsultation,
  notifyConsultationReminder,
  notifyNewPrescription,
  notifyLowStock,
  notifyNewMessage,
};
