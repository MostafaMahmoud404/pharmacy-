# Backend Payment Status Endpoint

## Endpoint Required: GET /api/orders/:id/payment-status

يجب إضافة هذا الـ endpoint إلى backend علشان Angular تقدر تعمل polling للتحقق من حالة الدفع.

### الموقع:

```
src/routes/orderRoutes.js
```

### الكود:

```javascript
// @desc    Get payment status
// @route   GET /api/orders/:id/payment-status
// @access  Private
const getPaymentStatus = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorResponse("الطلب غير موجود", 404));
  }

  // Check authorization
  const isCustomer = order.customer.toString() === req.user._id.toString();
  const isPharmacist = req.user.role === "pharmacist";
  const isAdmin = req.user.role === "admin";

  if (!isCustomer && !isPharmacist && !isAdmin) {
    return next(new ErrorResponse("غير مصرح لك بالوصول لهذا الطلب", 403));
  }

  successResponse(res, 200, "حالة الدفع", {
    orderId: order._id,
    paymentStatus: order.payment.status, // 'pending' | 'paid' | 'failed'
    method: order.payment.method,
    transactionId: order.payment.transactionId || null,
    paidAt: order.payment.paidAt || null,
  });
});
```

### ثم أضف الـ route:

```javascript
// في orderRoutes.js بعد الـ routes الأخرى
router.get("/:id/payment-status", validateObjectId("id"), getPaymentStatus);
```

---

## Flow الكامل:

### 1. User يضغط Pay

```typescript
// checkout.component.ts
this.placeOrder();
```

### 2. Angular ترسل POST request

```typescript
POST / api / payments / paymob / create - token;
{
  orderId: "order-123";
}
```

### 3. Backend يرجع iframe URL

```json
{
  "success": true,
  "orderId": "order-123",
  "iframeUrl": "https://accept.paymob.com/...",
  "paymentToken": "token-xxx"
}
```

### 4. Angular تعرض iframe

```html
<iframe [src]="iframeUrl"></iframe>
```

### 5. Angular تعمل polling كل 2 ثانية

```typescript
GET / api / orders / order - 123 / payment - status;
```

### 6. Response from polling:

```json
{
  "orderId": "order-123",
  "paymentStatus": "paid",
  "method": "card",
  "transactionId": "paymob-trans-xxx"
}
```

### 7. لما paymentStatus === "paid"

- Polling يوقف
- iframe يختفي
- Success message يظهر
- يعيد redirect للـ user dashboard

---

## Testing:

بعد ما تعمل الـ endpoint، جرب:

```bash
# بعد ما تضغط pay وتستخدم iframe
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/orders/ORDER_ID/payment-status"

# النتيجة:
{
  "success": true,
  "message": "حالة الدفع",
  "data": {
    "orderId": "...",
    "paymentStatus": "paid",
    "method": "card",
    "transactionId": "..."
  }
}
```

---

## التنبيهات المهمة:

1. **الـ Authorization**: تأكد الـ endpoint محمي بـ `protect` middleware
2. **الـ Status Values**: يجب أن تكون `pending`, `paid`, أو `failed`
3. **الـ Polling**: Angular تفحص كل 2 ثانية لمدة دقيقة واحدة أقصى
4. **Cross-Domain**: مافيش communication بين iframe و Angular (آمن أكثر)

---

## الملفات اللي تحتاج تعدلها في Angular:

✅ `src/app/components/checkout/checkout.component.ts` - DONE
✅ `src/app/components/checkout/checkout.component.html` - DONE
✅ `src/app/components/checkout/checkout.component.scss` - DONE
✅ `src/app/services/payment.service.ts` - DONE
✅ `src/app/services/payment-polling.service.ts` - DONE

❌ Backend endpoint - NEEDS TO BE ADDED
