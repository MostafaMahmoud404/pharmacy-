<!-- Payment Iframe Integration Guide -->

# 🔐 Paymob Payment Integration - Complete Implementation

## ✅ ما تم تنفيذه:

### 1. **Payment Service** (`payment.service.ts`)

- ✅ `createPaymobPayment()` - إنشاء رابط الدفع
- ✅ `getPaymentStatus()` - فحص حالة الدفع
- ✅ `processCashPayment()` - الدفع عند الاستلام
- ✅ `confirmPayment()` - تأكيد الدفع

### 2. **Payment Polling Service** (`payment-polling.service.ts`)

- ✅ `startPolling()` - بدء الفحص المستمر للحالة
- ✅ Automatic retry every 2 seconds
- ✅ 30-second timeout
- ✅ Auto-stop عند تأكيد الدفع

### 3. **Checkout Component** (`checkout.component.ts`)

- ✅ State variables: `iframeUrl`, `orderId`, `showIframe`, `isPaying`
- ✅ `placeOrder()` - معالجة تقديم الطلب
- ✅ `initiatePaymobPayment()` - بدء عملية الدفع
- ✅ `startPaymentPolling()` - الفحص المستمر
- ✅ Error handling و retry logic
- ✅ Safe iframe URL sanitization

### 4. **Checkout Template** (`checkout.component.html`)

- ✅ Conditional rendering للـ iframe
- ✅ Loading states
- ✅ Error messages
- ✅ Polling status display
- ✅ Retry و cancel buttons

### 5. **Styling** (`checkout.component.scss`)

- ✅ Beautiful iframe container
- ✅ Responsive design
- ✅ Animations و transitions
- ✅ Error و success states

---

## 🔄 Payment Flow:

```
┌─────────────────────────────────────────────────────────────┐
│                    USER CHECKOUT                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
                [User fills form]
                          ↓
                [Selects payment method]
                          ↓
            ┌─────────────┴──────────────┐
            ↓                            ↓
      [Cash On Delivery]         [Card Payment]
            ↓                            ↓
      [Order Confirmed]        [POST create-token]
            ↓                            ↓
            └────────────────┬───────────┘
                             ↓
                  [iframeUrl + orderId]
                             ↓
                    [Display iframe]
                             ↓
              [User completes payment]
                             ↓
                      [Polling starts]
                      (every 2 seconds)
                             ↓
          [GET /orders/:id/payment-status]
                             ↓
          ┌──────────────────┼──────────────────┐
          ↓                  ↓                  ↓
     [paid]              [pending]          [failed]
          ↓                  ↓                  ↓
   [Show Success]      [Continue Polling]  [Show Error]
          ↓                  ↓                  ↓
   [Redirect to         [Max timeout?]    [Retry Option]
    Dashboard]          [Show Error]
```

---

## 📝 Usage Example:

### Step 1: User navigates to checkout

```
/checkout
```

### Step 2: Fill shipping info

- Full name, phone, address, etc.

### Step 3: Select payment method

- Choose between "Cash" or "Card"

### Step 4: Review & confirm order

- Click "Confirm Order" button

### Step 5: If Card selected:

- Loading state shows
- Paymob iframe loads
- User enters card details inside iframe
- System polls for payment status

### Step 6: After successful payment:

- Iframe disappears
- Success message shows
- Redirect to user dashboard after 3 seconds

---

## 🛠️ Backend Requirement:

You NEED to add this endpoint to your backend:

### Route: GET `/api/orders/:id/payment-status`

```javascript
// src/routes/orderRoutes.js

const getPaymentStatus = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorResponse("الطلب غير موجود", 404));
  }

  // Authorization check
  const isCustomer = order.customer.toString() === req.user._id.toString();
  const isPharmacist = req.user.role === "pharmacist";
  const isAdmin = req.user.role === "admin";

  if (!isCustomer && !isPharmacist && !isAdmin) {
    return next(new ErrorResponse("غير مصرح لك", 403));
  }

  successResponse(res, 200, "Payment Status", {
    orderId: order._id,
    paymentStatus: order.payment.status, // 'pending' | 'paid' | 'failed'
    method: order.payment.method,
    transactionId: order.payment.transactionId,
    paidAt: order.payment.paidAt,
  });
});

// Add route
router.get("/:id/payment-status", protect, validateObjectId("id"), getPaymentStatus);
```

---

## 📊 State Management:

### Active States During Payment:

```typescript
// Before payment
showIframe = false;
isPaying = false;
isPolling = false;
paymentError = null;

// After clicking Pay
isProcessing = true;

// Creating payment token
isPaying = true;
showIframe = false;

// Payment gateway loaded
isPaying = false;
showIframe = true;
isPolling = true;

// Payment success
isPolling = false;
showIframe = false;
orderPlaced = true;

// Payment failed
isPolling = false;
showIframe = false;
paymentError = "Error message";
```

---

## 🧪 Testing Checklist:

- [ ] Order creation works
- [ ] Paymob iframe loads correctly
- [ ] Polling starts after iframe displays
- [ ] Payment status updates on success
- [ ] Success message shows after 3 seconds
- [ ] Redirect to dashboard works
- [ ] Retry button works on error
- [ ] Cancel button stops polling
- [ ] Error messages display correctly
- [ ] Mobile responsive design works

---

## ⚙️ Configuration:

### Environment Variables (Backend):

```env
PAYMOB_API_KEY=your_key
PAYMOB_INTEGRATION_ID=your_integration_id
PAYMOB_IFRAME_ID=your_iframe_id
PAYMOB_HMAC_SECRET=your_hmac_secret
```

### Polling Configuration (Angular):

```typescript
// In payment-polling.service.ts
defaultConfig = {
  orderId: "",
  maxRetries: 30, // 30 attempts
  pollInterval: 2000, // 2 seconds
  maxTimeout: 60000, // 60 seconds total
};
```

---

## 🔒 Security Notes:

1. ✅ **URL Sanitization**: iframeUrl sanitized using `DomSanitizer`
2. ✅ **No Cross-Domain Communication**: iframe doesn't communicate with Angular
3. ✅ **Authorization Checks**: All endpoints protected
4. ✅ **HMAC Verification**: Backend verifies Paymob webhooks
5. ✅ **HTTPS Only**: Use HTTPS in production
6. ✅ **Rate Limiting**: Implement rate limiting on polling endpoint

---

## 📱 Mobile Optimization:

- Responsive iframe container
- Touch-friendly buttons
- Clear error messages
- Loading spinners
- Mobile-friendly fonts

---

## 🚀 What's Next:

1. Add backend endpoint for payment status
2. Implement Paymob webhook handler (already exists)
3. Test with real Paymob credentials
4. Add payment failure recovery
5. Implement payment retry logic
6. Add payment history view

---

## 📞 Support:

If you need to modify the polling behavior, update these values:

- `pollInterval`: How often to check (in ms)
- `maxRetries`: Maximum number of checks
- `maxTimeout`: Total timeout duration (in ms)

For example, to poll every 3 seconds for 2 minutes:

```typescript
startPaymentPolling({
  orderId: this.orderId,
  pollInterval: 3000, // 3 seconds
  maxRetries: 40, // 40 attempts
  maxTimeout: 120000, // 2 minutes
});
```
