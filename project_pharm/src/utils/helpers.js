const crypto = require("crypto");

// توليد رقم عشوائي فريد
const generateUniqueNumber = (prefix = "", length = 6) => {
  const randomNum = Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, "0");
  return `${prefix}${randomNum}`;
};

// توليد كود تفعيل عشوائي
const generateVerificationCode = (length = 6) => {
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, "0");
};

// توليد Token عشوائي آمن
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString("hex");
};

// Hash نص
const hashText = (text) => {
  return crypto.createHash("sha256").update(text).digest("hex");
};

// تنسيق رقم الهاتف
const formatPhoneNumber = (phone) => {
  // إزالة أي مسافات أو رموز
  phone = phone.replace(/[^\d]/g, "");

  // إضافة +20 للأرقام المصرية إذا لزم الأمر
  if (phone.startsWith("0")) {
    phone = "20" + phone.substring(1);
  }

  if (!phone.startsWith("20")) {
    phone = "20" + phone;
  }

  return phone;
};

// التحقق من صحة رقم الهاتف المصري
const isValidEgyptianPhone = (phone) => {
  const phoneRegex = /^(01)[0-2,5]{1}[0-9]{8}$/;
  return phoneRegex.test(phone);
};

// التحقق من صحة البريد الإلكتروني
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// حساب المسافة بين نقطتين (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

// تحويل التاريخ لصيغة عربية
const formatArabicDate = (date) => {
  return new Date(date).toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// تحويل الوقت لصيغة عربية
const formatArabicTime = (date) => {
  return new Date(date).toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// تحويل التاريخ والوقت لصيغة عربية
const formatArabicDateTime = (date) => {
  return `${formatArabicDate(date)} - ${formatArabicTime(date)}`;
};

// حساب العمر من تاريخ الميلاد
const calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

// تحويل الأرقام الإنجليزية للعربية
const convertToArabicNumbers = (str) => {
  const arabicNumbers = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return str.replace(/\d/g, (digit) => arabicNumbers[digit]);
};

// تحويل الأرقام العربية للإنجليزية
const convertToEnglishNumbers = (str) => {
  return str.replace(/[٠-٩]/g, (digit) => {
    return "٠١٢٣٤٥٦٧٨٩".indexOf(digit);
  });
};

// اختصار النص مع إضافة ...
const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

// إزالة HTML tags من النص
const stripHtmlTags = (html) => {
  return html.replace(/<[^>]*>/g, "");
};

// تحويل slug-text إلى نص عادي
const slugToText = (slug) => {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// تحويل نص إلى slug
const textToSlug = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// حساب نسبة مئوية
const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

// حساب الخصم
const calculateDiscount = (originalPrice, discountPrice) => {
  if (originalPrice <= 0) return 0;
  return Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
};

// تنسيق السعر
const formatPrice = (price, currency = "ج.م") => {
  return `${price.toFixed(2)} ${currency}`;
};

// تحويل bytes إلى حجم قابل للقراءة
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

// توليد لون عشوائي
const generateRandomColor = () => {
  return "#" + Math.floor(Math.random() * 16777215).toString(16);
};

// التحقق من أن اليوم هو يوم عمل
const isWorkingDay = (date = new Date()) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 5 && day !== 6; // ليس جمعة ولا سبت
};

// الحصول على ساعات العمل
const getWorkingHours = () => {
  return {
    start: "09:00",
    end: "21:00",
  };
};

// التحقق من أن الوقت ضمن ساعات العمل
const isWorkingHour = (time) => {
  const workingHours = getWorkingHours();
  return time >= workingHours.start && time <= workingHours.end;
};

// إضافة أيام لتاريخ معين
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// إضافة ساعات لتاريخ معين
const addHours = (date, hours) => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

// الحصول على بداية اليوم
const startOfDay = (date = new Date()) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

// الحصول على نهاية اليوم
const endOfDay = (date = new Date()) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

// ترتيب عشوائي لمصفوفة
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// إزالة التكرارات من مصفوفة
const uniqueArray = (array) => {
  return [...new Set(array)];
};

// تجميع مصفوفة حسب خاصية
const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
};

// sleep function
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// retry function
const retry = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(delay);
    }
  }
};

// التحقق من أن الكائن فارغ
const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

// دمج كائنات بعمق
const deepMerge = (target, source) => {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
};

const isObject = (item) => {
  return item && typeof item === "object" && !Array.isArray(item);
};

// تحويل query string إلى object
const parseQueryString = (queryString) => {
  const params = new URLSearchParams(queryString);
  const result = {};

  for (const [key, value] of params) {
    result[key] = value;
  }

  return result;
};

// تحويل object إلى query string
const objectToQueryString = (obj) => {
  return Object.keys(obj)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
    .join("&");
};

module.exports = {
  generateUniqueNumber,
  generateVerificationCode,
  generateSecureToken,
  hashText,
  formatPhoneNumber,
  isValidEgyptianPhone,
  isValidEmail,
  calculateDistance,
  formatArabicDate,
  formatArabicTime,
  formatArabicDateTime,
  calculateAge,
  convertToArabicNumbers,
  convertToEnglishNumbers,
  truncateText,
  stripHtmlTags,
  slugToText,
  textToSlug,
  calculatePercentage,
  calculateDiscount,
  formatPrice,
  formatFileSize,
  generateRandomColor,
  isWorkingDay,
  getWorkingHours,
  isWorkingHour,
  addDays,
  addHours,
  startOfDay,
  endOfDay,
  shuffleArray,
  uniqueArray,
  groupBy,
  sleep,
  retry,
  isEmpty,
  deepMerge,
  parseQueryString,
  objectToQueryString,
};
