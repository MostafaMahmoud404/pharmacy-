const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

let io;

// تهيئة Socket.IO
const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    },
    path: "/socket.io",
  });

  // Middleware للتحقق من JWT
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.userName = user.name;

      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  // عند الاتصال
  io.on("connection", (socket) => {
    console.log(`✅ User connected: ${socket.userName} (${socket.userId})`);

    // الانضمام لغرفة المستخدم الخاصة
    socket.join(`user:${socket.userId}`);

    // الانضمام لغرفة الدور
    socket.join(`role:${socket.userRole}`);

    // ========================================
    // CONSULTATION CHAT
    // ========================================

    // الانضمام لاستشارة
    socket.on("join:consultation", async (consultationId) => {
      try {
        const Consultation = require("../models/Consultation");
        const consultation = await Consultation.findById(consultationId)
          .populate("doctor", "user")
          .populate("patient");

        if (!consultation) {
          socket.emit("error", { message: "Consultation not found" });
          return;
        }

        // التحقق من الصلاحيات
        const isDoctorInConsultation =
          consultation.doctor.user.toString() === socket.userId;
        const isPatientInConsultation =
          consultation.patient._id.toString() === socket.userId;

        if (!isDoctorInConsultation && !isPatientInConsultation) {
          socket.emit("error", { message: "Not authorized" });
          return;
        }

        socket.join(`consultation:${consultationId}`);
        console.log(
          `User ${socket.userName} joined consultation ${consultationId}`
        );

        socket.emit("consultation:joined", { consultationId });
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // إرسال رسالة في الاستشارة
    socket.on("consultation:message", async (data) => {
      try {
        const { consultationId, message, attachments } = data;

        const Consultation = require("../models/Consultation");
        const consultation = await Consultation.findById(consultationId);

        if (!consultation) {
          socket.emit("error", { message: "Consultation not found" });
          return;
        }

        // تحديد نوع المرسل
        const Doctor = require("../models/Doctor");
        const doctor = await Doctor.findOne({ user: socket.userId });
        const senderType = doctor ? "doctor" : "patient";

        // حفظ الرسالة في قاعدة البيانات
        const newMessage = await consultation.addMessage(
          socket.userId,
          senderType,
          message,
          attachments
        );

        // إرسال الرسالة لجميع المشاركين في الغرفة
        io.to(`consultation:${consultationId}`).emit(
          "consultation:new-message",
          {
            consultationId,
            message: {
              _id: newMessage._id,
              sender: {
                _id: socket.userId,
                name: socket.userName,
              },
              senderType,
              message: newMessage.message,
              attachments: newMessage.attachments,
              timestamp: newMessage.timestamp,
              isRead: false,
            },
          }
        );

        // إرسال إشعار للطرف الآخر
        const recipientId =
          senderType === "doctor"
            ? consultation.patient.toString()
            : consultation.doctor.user.toString();

        io.to(`user:${recipientId}`).emit("notification", {
          type: "new_message",
          title: "رسالة جديدة",
          body: `رسالة من ${socket.userName}`,
          data: { consultationId },
        });
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // كتابة... (Typing indicator)
    socket.on("consultation:typing", (data) => {
      const { consultationId, isTyping } = data;
      socket.to(`consultation:${consultationId}`).emit("consultation:typing", {
        userId: socket.userId,
        userName: socket.userName,
        isTyping,
      });
    });

    // مغادرة الاستشارة
    socket.on("leave:consultation", (consultationId) => {
      socket.leave(`consultation:${consultationId}`);
      console.log(
        `User ${socket.userName} left consultation ${consultationId}`
      );
    });

    // ========================================
    // ORDER TRACKING
    // ========================================

    // الانضمام لتتبع طلب
    socket.on("join:order", (orderId) => {
      socket.join(`order:${orderId}`);
      console.log(`User ${socket.userName} tracking order ${orderId}`);
    });

    // تحديث موقع التوصيل (للمندوب)
    socket.on("delivery:location-update", async (data) => {
      try {
        const { deliveryId, latitude, longitude, speed } = data;

        const Delivery = require("../models/Delivery");
        const delivery = await Delivery.findById(deliveryId);

        if (!delivery) {
          socket.emit("error", { message: "Delivery not found" });
          return;
        }

        // تحديث الموقع
        await delivery.updateLocation(latitude, longitude, speed);

        // إرسال التحديث للعميل
        io.to(`order:${delivery.order}`).emit("delivery:location-updated", {
          latitude,
          longitude,
          speed,
          eta: delivery.tracking.eta,
          distance: delivery.tracking.distance,
        });
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // ========================================
    // NOTIFICATIONS
    // ========================================

    // إرسال إشعار لمستخدم معين
    socket.on("send:notification", (data) => {
      const { userId, notification } = data;
      io.to(`user:${userId}`).emit("notification", notification);
    });

    // إرسال إشعار لدور معين
    socket.on("send:role-notification", (data) => {
      const { role, notification } = data;
      io.to(`role:${role}`).emit("notification", notification);
    });

    // إرسال إشعار broadcast لكل المتصلين
    socket.on("send:broadcast", (notification) => {
      io.emit("notification", notification);
    });

    // ========================================
    // ADMIN MONITORING
    // ========================================

    // الإحصائيات المباشرة للأدمن
    socket.on("admin:subscribe-stats", () => {
      if (socket.userRole === "admin") {
        socket.join("admin:stats");
        console.log("Admin subscribed to live stats");
      }
    });

    // ========================================
    // DISCONNECTION
    // ========================================

    socket.on("disconnect", () => {
      console.log(
        `❌ User disconnected: ${socket.userName} (${socket.userId})`
      );
    });

    // معالجة الأخطاء
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });

  return io;
};

// الحصول على Socket.IO instance
const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

// إرسال إشعار لمستخدم معين
const sendToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

// إرسال إشعار لدور معين
const sendToRole = (role, event, data) => {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
};

// إرسال broadcast لكل المتصلين
const sendBroadcast = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

// إرسال إشعار لغرفة معينة
const sendToRoom = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, data);
  }
};

// الحصول على عدد المتصلين
const getConnectedUsersCount = async () => {
  if (!io) return 0;
  const sockets = await io.fetchSockets();
  return sockets.length;
};

// الحصول على المستخدمين المتصلين حسب الدور
const getConnectedUsersByRole = async (role) => {
  if (!io) return [];
  const socketsInRoom = await io.in(`role:${role}`).fetchSockets();
  return socketsInRoom.map((socket) => ({
    userId: socket.userId,
    userName: socket.userName,
  }));
};

module.exports = {
  initializeSocket,
  getIO,
  sendToUser,
  sendToRole,
  sendBroadcast,
  sendToRoom,
  getConnectedUsersCount,
  getConnectedUsersByRole,
};
