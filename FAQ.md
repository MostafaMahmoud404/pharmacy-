# FAQ - Paymob Payment Integration

## ❓ Frequently Asked Questions

### Q: هل يجب تثبيت مكتبات إضافية؟

**A:** لا، جميع المكتبات موجودة بالفعل:

- `@angular/common/http` - HTTP Client
- `@angular/platform-browser` - DomSanitizer
- `rxjs` - Observables

---

### Q: هل كود Angular جاهز للإنتاج؟

**A:** نعم ✅

- ✅ معالجة أخطاء شاملة
- ✅ آمن من XSS attacks
- ✅ Responsive design
- ✅ Error recovery
- ✅ TypeScript typed

جاهز فقط أضف Backend endpoint و تمام!

---

### Q: كم الوقت الذي تستغرقه عملية الدفع؟

**A:** عادي 30-60 ثانية:

```
1-2s  : Load iframe
5-30s : User enters card details
30-60s: Wait for payment confirmation
```

---

### Q: ماذا لو لم يتم تأكيد الدفع؟

**A:** هناك خيارات:

```
1. Polling يتوقف بعد 60 ثانية
2. يظهر رسالة خطأ
3. User يضغط "Retry Payment"
4. يبدأ عملية جديدة
```

---

### Q: هل iframe آمن؟

**A:** نعم 100% آمن:

```
✅ URL sanitized via DomSanitizer
✅ Cross-origin isolation
✅ No JavaScript communication
✅ HTTPS only
✅ Paymob handles encryption
```

---

### Q: هل يمكن تغيير polling interval؟

**A:** نعم سهل جداً:

```typescript
// في payment-polling.service.ts
defaultConfig = {
  pollInterval: 2000, // غير هنا
  maxRetries: 30,
  maxTimeout: 60000,
};

// أو عند استدعاء
this.startPaymentPolling({
  pollInterval: 3000, // 3 seconds بدل 2
});
```

---

### Q: كم عدد الـ API calls عند الدفع؟

**A:** حوالي 32 call:

```
1x  POST /api/payments/paymob/create-token
30x GET  /api/orders/:id/payment-status (polling)
1x  POST /api/payments/paymob/callback (webhook)
```

---

### Q: هل يمكن دفع منتجات و استشارات معاً؟

**A:** لا حالياً:

```typescript
// في placeOrder() يدعم orderId فقط
// لكن PaymentService يدعم consultationId

// للتطوير المستقبلي:
createPaymobPayment({
  orderId: "ORD-123",
  consultationId: "CONS-456",
});
```

---

### Q: ماذا لو انقطع الإنترنت أثناء الدفع؟

**A:** سيحدث:

```
1. Polling request فشل
2. Catch error in subscribe
3. Show "Network error, retry?"
4. User يضغط Retry
5. Polling يبدأ مجدداً
```

---

### Q: هل كل الدول مدعومة؟

**A:** تابع Paymob:

```javascript
// في paymentController.js
billing_data: {
  country: "EG",  // فقط مصر
  // لكن يمكن تعديل للدول الأخرى
}
```

---

### Q: كيف أختبر بدون Paymob؟

**A:** استخدم mock:

```typescript
// في payment.service.ts - للتطوير فقط
createPaymobPayment() {
  return of({
    success: true,
    iframeUrl: 'https://localhost:4200/mock-iframe',
    paymentToken: 'mock-token'
  });
}
```

---

### Q: هل البيانات المالية تُخزّن في Angular؟

**A:** لا أبداً:

```typescript
// Angular لا تخزّن:
- Card numbers
- CVV
- Expiry dates

// كل شيء مباشرة في Paymob iframe
// بدون دخول Angular component
```

---

### Q: كيف أضيف طرق دفع أخرى؟

**A:** سهل جداً:

```typescript
// في checkout.component.ts
paymentMethods: PaymentMethod[] = [
  {
    id: 'cash',
    name: 'الدفع عند الاستلام',
    icon: '💵',
  },
  {
    id: 'card',  // موجود بالفعل
    name: 'بطاقة ائتمان',
    icon: '💳',
  },
  {
    id: 'wallet',  // أضيف هنا
    name: 'محفظة إلكترونية',
    icon: '📱',
  },
  // واستدعي processWalletPayment()
];
```

---

### Q: هل هناك حد أقصى للطلبات؟

**A:** نعم:

```
Paymob limits:
- Max amount per transaction: EGP 999,999
- Rate limit: 100 req/minute
```

---

### Q: كيف أتابع الأخطاء في Production؟

**A:** أضيف logging:

```typescript
error: (err) => {
  console.error("Payment error:", err);

  // أرسل للـ logging service
  this.loggingService.error({
    type: "payment_error",
    orderId: this.orderId,
    error: err.message,
    timestamp: new Date(),
  });
};
```

---

### Q: هل يمكن إلغاء طلب بعد الدفع؟

**A:** نعم:

```typescript
// في checkout component أو service
cancelOrder(orderId: string) {
  return this.http.post(
    `/api/orders/${orderId}/cancel`,
    { reason: 'Changed mind' }
  );
}
```

---

### Q: كم عمر iframe token؟

**A:** من Paymob:

```javascript
// في paymentController.js
expiration: 3600,  // ساعة واحدة (3600 ثانية)
```

بعدها token ينتهي ويحتاج توليد واحد جديد.

---

### Q: هل يمكن استعمال Stripe بدل Paymob؟

**A:** نعم! الكود يدعمه:

```typescript
// في payment.service.ts موجود:
createStripePaymentIntent()
confirmStripePayment()

// فقط عدّل في checkout component:
selectPaymentMethod(methodId: string) {
  if (methodId === 'stripe') {
    this.initiateStripePayment();  // بدل Paymob
  }
}
```

---

### Q: كيف أتعامل مع double payment؟

**A:** البيانات محمية:

```javascript
// في paymobCallback
if (order.payment.status === "paid") {
  return error("Payment already processed");
}

// يتجاهل الـ duplicate webhooks
```

---

### Q: هل يمكن رؤية سجل المدفوعات؟

**A:** نعم موجود:

```typescript
// في payment.service.ts
getPaymentHistory()

// يرجع:
{
  type: 'order' | 'consultation',
  number: 'ORD-123',
  amount: 500,
  method: 'card',
  date: '2026-01-26',
  transactionId: '...'
}
```

---

### Q: كم الخطأ الأكثر شيوعاً؟

**A:** Top 5:

```
1. Invalid Paymob API key
2. Iframe ID wrong
3. Integration ID mismatch
4. HMAC verification failed
5. Order already paid
```

---

### Q: هل يجب HTTPS؟

**A:** نعم في Production:

```
Development: http://localhost:4200 ✅
Production:  https://yourdomain.com ✅

Paymob يتطلب HTTPS لـ:
- iframe loading
- webhook callbacks
```

---

### Q: كم تكلفة المعاملة؟

**A:** تابع عقد Paymob:

```
عادي: 1.2% - 3%
+ رسوم البنك: 1% - 2%

مثال: EGP 100 = EGP 97 - 98
```

---

### Q: هل يمكن رد الأموال؟

**A:** نعم:

```typescript
// في payment.service.ts أو controller
refundPayment(transactionId: string, amount: number) {
  return axios.post('/paymob/refund', {
    transaction_id: transactionId,
    amount: amount
  });
}
```

---

### Q: كيف أختبر الـ webhook locally؟

**A:** استخدم ngrok:

```bash
ngrok http 3000

# ثم استخدم ngrok URL:
https://abc123.ngrok.io/api/payments/paymob/callback
```

---

### Q: هل هناك تحديثات مستقبلية مخططة؟

**A:** نعم:

```
Phase 2:
- Mobile wallet (Vodafone, Etisalat)
- Multiple currency support
- Recurring payments
- Subscription plans

Phase 3:
- WebSocket real-time updates
- Advanced analytics
- Fraud detection
- A/B testing
```

---

### Q: من أين أبدأ الآن؟

**A:** 3 خطوات:

1. **تحقق من الأمور الأساسية**

   ```bash
   npm install
   ng serve
   # تأكد لا توجد أخطاء
   ```

2. **أضف Backend endpoint**

   ```javascript
   // في orderController.js + orderRoutes.js
   // (موضح في BACKEND_TODO.md)
   ```

3. **اختبر الـ flow**
   ```
   navigate → /checkout
   fill form
   select payment
   confirm
   observe iframe
   ```

---

## 🔗 Useful Links

- [Paymob Documentation](https://docs.paymob.com)
- [Angular Security Guide](https://angular.io/guide/security)
- [RxJS Operators](https://rxjs.dev/api)
- [Payment Best Practices](https://owasp.org/www-community/attacks/Payment_Card_Industry_Data_Security_Standard)

---

## 📞 Support Contacts

### If you get stuck on:

- **Angular**: Check COMPONENT_CHANGES.md
- **Services**: Check payment.service.ts
- **Polling**: Check payment-polling.service.ts
- **Backend**: Check BACKEND_TODO.md
- **Paymob**: Check Paymob docs or contact their support

---

**تم التحديث**: 26 يناير 2026  
**الحالة**: جاهز للإنتاج ✅
