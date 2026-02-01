# Backend Implementation - CRITICAL UPDATES

## ⚠️ MAJOR FIX: Order Creation Flow

### 🔴 PROBLEM (Fixed in Frontend)

Frontend was creating fake orderIds:

```typescript
// ❌ WRONG - Frontend should NOT create orderId
const mockOrderId = "ORD-" + Math.random().toString(36).substr(2, 9);
```

### ✅ SOLUTION (Now Implemented)

**New Flow:**

1. Frontend calls: `POST /api/orders` with order data
2. Backend creates order and returns `orderId`
3. Frontend uses backend-generated `orderId` for payment

**Frontend now sends:**

```typescript
{
  items: [...],
  deliveryAddress: {...},
  paymentMethod: 'cash|card',
  shippingMethod: 'standard|express|pickup'
}
```

**Backend returns:**

```json
{
  "success": true,
  "orderId": "507f1f77bcf86cd799439011",
  "data": {...}
}
```

---

## ✅ Backend Endpoints REQUIRED

### 1. Create Order Endpoint

**File**: `src/routes/orderRoutes.js`

**Controller**: Already exists in `src/controllers/orderController.js` ✅

**Function**: `createOrder()`

**Verify it returns**:

```javascript
{
  success: true,
  orderId: order._id.toString(),
  data: { order }
}
```

### 2. Get Payment Status Endpoint

**File**: `src/routes/orderRoutes.js`

**Add this controller**:

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
    paymentStatus: order.payment.status,
    method: order.payment.method,
    transactionId: order.payment.transactionId || null,
    paidAt: order.payment.paidAt || null,
  });
});
```

````

**Add to exports**:

```javascript
module.exports = {
  // ... existing exports
  getPaymentStatus,
};
````

**Add route**:

```javascript
// In orderRoutes.js, after existing routes
router.get("/:id/payment-status", protect, validateObjectId("id"), getPaymentStatus);
```

---

### 2. Ensure Payment Status Updates in Paymob Callback

The callback handler already exists in `src/controllers/paymentController.js` but verify it updates `payment.status = "paid"`:

```javascript
// In paymobCallback function - ALREADY EXISTS
if (obj.success === true) {
  // ... update order
  order.payment.method = "card";
  order.payment.status = "paid"; // ✅ This is important
  order.payment.transactionId = obj.id.toString();
  order.payment.paidAt = new Date();
  order.status = "confirmed";
  await order.save();
}
```

---

### 3. Import the new controller

**File**: `src/routes/orderRoutes.js`

```javascript
const {
  // ... existing imports
  getPaymentStatus, // ADD THIS
} = require("../controllers/orderController");
```

---

## 🧪 Testing the Endpoint

### Test 1: Check payment status (pending)

```bash
curl -X GET \
  "http://localhost:3000/api/orders/ORDER_ID/payment-status" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
{
  "success": true,
  "message": "حالة الدفع",
  "data": {
    "orderId": "...",
    "paymentStatus": "pending",
    "method": "card",
    "transactionId": null
  }
}
```

### Test 2: After payment completes

```bash
curl -X GET \
  "http://localhost:3000/api/orders/ORDER_ID/payment-status" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
{
  "success": true,
  "message": "حالة الدفع",
  "data": {
    "orderId": "...",
    "paymentStatus": "paid",
    "method": "card",
    "transactionId": "paymob-trans-123"
  }
}
```

---

## 📋 Implementation Checklist

- [ ] Add `getPaymentStatus` controller to orderController.js
- [ ] Add route to orderRoutes.js
- [ ] Test with Postman/curl
- [ ] Verify authorization checks
- [ ] Verify payment status updates on Paymob callback
- [ ] Test with real Paymob integration

---

## 🔗 Related Files Already Configured

✅ `src/controllers/paymentController.js` - Paymob callback handler exists
✅ `src/routes/paymentRoutes.js` - POST endpoints already exist
✅ `src/models/Order.js` - Payment schema already has status field
✅ `src/middleware/auth.js` - Authentication already configured

---

## 📊 Expected Flow

```
1. Angular calls: POST /api/payments/paymob/create-token
   ↓
2. Backend returns: { iframeUrl, paymentToken }
   ↓
3. Angular displays iframe
   ↓
4. User pays in iframe
   ↓
5. Paymob sends webhook to: POST /api/payments/paymob/callback
   ↓
6. Backend updates order: payment.status = "paid"
   ↓
7. Angular polls: GET /api/orders/:id/payment-status
   ↓
8. Backend returns: { paymentStatus: "paid" }
   ↓
9. Angular stops polling and shows success
```

---

## 🚀 Performance Notes

- Polling happens every 2 seconds
- Maximum polling duration: 60 seconds
- If payment not confirmed in 60 seconds, show retry option
- Each polling request is lightweight (just returns status)

---

## ⚠️ Important Notes

1. **Async Callback**: Paymob callback is async, so initial poll might show "pending" - this is normal
2. **HMAC Verification**: Already implemented in paymobCallback
3. **Status Values**: Must be exactly 'pending', 'paid', or 'failed'
4. **Authorization**: Endpoint should only return status to order owner or admin

---

## 💡 Optimization Ideas (Future)

- Add Server-Sent Events (SSE) for real-time updates
- Implement WebSocket for instant payment confirmation
- Add retry mechanism for failed payments
- Add payment timeout recovery

---

That's it! Once you add the endpoint above, everything should work perfectly. 🎉
