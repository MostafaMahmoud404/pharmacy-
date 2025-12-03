const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// توليد PDF للروشتة الطبية
const generatePrescriptionPDF = async (prescription) => {
  return new Promise(async (resolve, reject) => {
    try {
      // التأكد من وجود المجلد
      const uploadsDir = path.join(__dirname, "../../uploads/prescriptions");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `prescription-${prescription.prescriptionNumber}.pdf`;
      const filePath = path.join(uploadsDir, fileName);

      // إنشاء PDF Document
      const doc = new PDFDocument({
        margin: 50,
        size: "A4",
      });

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // إضافة خط عربي (اختياري - يحتاج تثبيت الخط)
      // doc.font('path/to/arabic-font.ttf');

      // Header - شعار وعنوان
      doc
        .fontSize(24)
        .fillColor("#2196F3")
        .text("🏥 روشتة طبية", { align: "center" })
        .moveDown(0.5);

      doc
        .fontSize(10)
        .fillColor("#666")
        .text("منصة الصيدلية الإلكترونية", { align: "center" })
        .moveDown(1);

      // خط فاصل
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke("#2196F3").moveDown();

      // معلومات الروشتة الأساسية
      doc
        .fontSize(12)
        .fillColor("#000")
        .text(`رقم الروشتة: ${prescription.prescriptionNumber}`, {
          align: "right",
        })
        .text(
          `التاريخ: ${new Date(prescription.createdAt).toLocaleDateString(
            "ar-EG",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
            }
          )}`,
          { align: "right" }
        )
        .moveDown();

      // معلومات الطبيب
      doc
        .fontSize(14)
        .fillColor("#2196F3")
        .text("معلومات الطبيب:", { underline: true })
        .moveDown(0.3);

      doc
        .fontSize(11)
        .fillColor("#000")
        .text(`الاسم: د. ${prescription.doctor.user.name}`)
        .text(`التخصص: ${prescription.doctor.specialtyArabic}`)
        .text(`رقم الترخيص: ${prescription.doctor.licenseNumber}`)
        .text(`الهاتف: ${prescription.doctor.user.phone || "غير متوفر"}`)
        .moveDown();

      // معلومات المريض
      doc
        .fontSize(14)
        .fillColor("#2196F3")
        .text("معلومات المريض:", { underline: true })
        .moveDown(0.3);

      doc
        .fontSize(11)
        .fillColor("#000")
        .text(`الاسم: ${prescription.patient.name}`)
        .text(`رقم الهاتف: ${prescription.patient.phone}`)
        .moveDown();

      // التشخيص
      doc
        .fontSize(14)
        .fillColor("#2196F3")
        .text("التشخيص:", { underline: true })
        .moveDown(0.3);

      doc
        .fontSize(11)
        .fillColor("#000")
        .text(prescription.diagnosis, {
          width: 500,
          align: "right",
        })
        .moveDown();

      // الأعراض (إن وجدت)
      if (prescription.symptoms && prescription.symptoms.length > 0) {
        doc
          .fontSize(14)
          .fillColor("#2196F3")
          .text("الأعراض:", { underline: true })
          .moveDown(0.3);

        doc.fontSize(11).fillColor("#000");
        prescription.symptoms.forEach((symptom) => {
          doc.text(`• ${symptom}`, { indent: 20 });
        });
        doc.moveDown();
      }

      // الأدوية الموصوفة
      doc
        .fontSize(14)
        .fillColor("#2196F3")
        .text("الأدوية الموصوفة:", { underline: true })
        .moveDown(0.5);

      prescription.medications.forEach((med, index) => {
        const yPosition = doc.y;

        // إذا اقترب من نهاية الصفحة، أضف صفحة جديدة
        if (yPosition > 700) {
          doc.addPage();
        }

        // رقم الدواء
        doc
          .fontSize(12)
          .fillColor("#2196F3")
          .text(
            `${index + 1}. ${med.customName || med.product?.name || "دواء"}`,
            {
              continued: false,
            }
          )
          .moveDown(0.3);

        // تفاصيل الدواء
        doc
          .fontSize(10)
          .fillColor("#333")
          .text(`   الجرعة: ${med.dosage}`, { indent: 30 })
          .text(`   التكرار: ${med.frequency}`, { indent: 30 })
          .text(`   المدة: ${med.duration}`, { indent: 30 });

        if (med.instructions) {
          doc.text(`   التعليمات: ${med.instructions}`, { indent: 30 });
        }

        if (med.beforeAfterMeal && med.beforeAfterMeal !== "not-specified") {
          const mealText = {
            before: "قبل الأكل",
            after: "بعد الأكل",
            with: "مع الأكل",
          };
          doc.text(`   التوقيت: ${mealText[med.beforeAfterMeal]}`, {
            indent: 30,
          });
        }

        doc.moveDown(0.8);
      });

      // الملاحظات
      if (prescription.notes) {
        doc
          .fontSize(14)
          .fillColor("#2196F3")
          .text("ملاحظات:", { underline: true })
          .moveDown(0.3);

        doc
          .fontSize(11)
          .fillColor("#000")
          .text(prescription.notes, {
            width: 500,
            align: "right",
          })
          .moveDown();
      }

      // التحذيرات
      if (prescription.warnings && prescription.warnings.length > 0) {
        doc
          .fontSize(14)
          .fillColor("#f44336")
          .text("⚠️ تحذيرات هامة:", { underline: true })
          .moveDown(0.3);

        doc.fontSize(10).fillColor("#d32f2f");
        prescription.warnings.forEach((warning) => {
          doc.text(`• ${warning}`, { indent: 20 });
        });
        doc.moveDown();
      }

      // متابعة
      if (prescription.followUpDate) {
        doc
          .fontSize(12)
          .fillColor("#FF9800")
          .text(
            `📅 موعد المتابعة: ${new Date(
              prescription.followUpDate
            ).toLocaleDateString("ar-EG")}`
          )
          .moveDown();

        if (prescription.followUpNotes) {
          doc
            .fontSize(10)
            .fillColor("#666")
            .text(`ملاحظات المتابعة: ${prescription.followUpNotes}`)
            .moveDown();
        }
      }

      // Footer
      const bottomY = 750;
      doc
        .fontSize(9)
        .fillColor("#999")
        .text("هذه الروشتة صالحة لمدة 30 يوماً من تاريخ الإصدار", 50, bottomY, {
          align: "center",
        });

      doc
        .fontSize(8)
        .text(
          `تاريخ انتهاء الصلاحية: ${new Date(
            prescription.expiryDate
          ).toLocaleDateString("ar-EG")}`,
          50,
          bottomY + 15,
          { align: "center" }
        );

      // خط فاصل في الأسفل
      doc
        .moveTo(50, bottomY - 10)
        .lineTo(550, bottomY - 10)
        .stroke("#ccc");

      // إنهاء الملف
      doc.end();

      stream.on("finish", () => {
        resolve(filePath);
      });

      stream.on("error", (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// توليد PDF لتقرير طبي
const generateMedicalReportPDF = async (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      const uploadsDir = path.join(__dirname, "../../uploads/reports");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `report-${Date.now()}.pdf`;
      const filePath = path.join(uploadsDir, fileName);

      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      doc
        .fontSize(20)
        .fillColor("#2196F3")
        .text("تقرير طبي", { align: "center" })
        .moveDown();

      // محتوى التقرير
      doc.fontSize(12).fillColor("#000").text(reportData.content, {
        width: 500,
        align: "right",
      });

      doc.end();

      stream.on("finish", () => {
        resolve(filePath);
      });

      stream.on("error", (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// توليد PDF لفاتورة
const generateInvoicePDF = async (order) => {
  return new Promise((resolve, reject) => {
    try {
      const uploadsDir = path.join(__dirname, "../../uploads/invoices");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `invoice-${order.orderNumber}.pdf`;
      const filePath = path.join(uploadsDir, fileName);

      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      doc
        .fontSize(24)
        .fillColor("#4CAF50")
        .text("🧾 فاتورة", { align: "center" })
        .moveDown();

      // رقم الفاتورة والتاريخ
      doc
        .fontSize(12)
        .fillColor("#000")
        .text(`رقم الطلب: ${order.orderNumber}`, { align: "right" })
        .text(
          `التاريخ: ${new Date(order.createdAt).toLocaleDateString("ar-EG")}`,
          { align: "right" }
        )
        .moveDown();

      // معلومات العميل
      doc
        .fontSize(14)
        .fillColor("#4CAF50")
        .text("معلومات العميل:", { underline: true })
        .moveDown(0.3);

      doc
        .fontSize(11)
        .fillColor("#000")
        .text(`الاسم: ${order.customer.name}`)
        .text(`الهاتف: ${order.customer.phone}`)
        .moveDown();

      // جدول المنتجات
      doc
        .fontSize(14)
        .fillColor("#4CAF50")
        .text("المنتجات:", { underline: true })
        .moveDown(0.5);

      // Headers
      const tableTop = doc.y;
      doc
        .fontSize(11)
        .fillColor("#000")
        .text("المنتج", 50, tableTop)
        .text("الكمية", 300, tableTop)
        .text("السعر", 400, tableTop)
        .text("الإجمالي", 480, tableTop);

      doc.moveDown(0.5);

      // Items
      order.items.forEach((item, i) => {
        const y = doc.y;
        doc
          .fontSize(10)
          .text(item.name, 50, y, { width: 200 })
          .text(item.quantity.toString(), 300, y)
          .text(`${item.price} ج.م`, 400, y)
          .text(`${item.subtotal} ج.م`, 480, y);
        doc.moveDown(0.5);
      });

      doc.moveDown();

      // الإجماليات
      const totalsY = doc.y;
      doc
        .fontSize(11)
        .text("المجموع الفرعي:", 350, totalsY)
        .text(`${order.pricing.subtotal.toFixed(2)} ج.م`, 480, totalsY, {
          align: "right",
        });

      doc
        .text("رسوم التوصيل:", 350, totalsY + 20)
        .text(
          `${order.pricing.deliveryFee.toFixed(2)} ج.م`,
          480,
          totalsY + 20,
          { align: "right" }
        );

      doc
        .text("الضريبة (14%):", 350, totalsY + 40)
        .text(`${order.pricing.tax.toFixed(2)} ج.م`, 480, totalsY + 40, {
          align: "right",
        });

      doc
        .fontSize(14)
        .fillColor("#4CAF50")
        .text("الإجمالي الكلي:", 350, totalsY + 70)
        .text(`${order.pricing.total.toFixed(2)} ج.م`, 480, totalsY + 70, {
          align: "right",
        });

      // Footer
      doc
        .fontSize(10)
        .fillColor("#999")
        .text("شكراً لتعاملكم معنا", 50, 750, { align: "center" });

      doc.end();

      stream.on("finish", () => {
        resolve(filePath);
      });

      stream.on("error", (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generatePrescriptionPDF,
  generateMedicalReportPDF,
  generateInvoicePDF,
};
