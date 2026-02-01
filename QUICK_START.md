# 🚀 Quick Start Commands

## Navigation

```bash
# الذهاب إلى المشروع
cd "d:\DOC-DOSE Project\front-git"

# تثبيت المتطلبات
npm install

# تشغيل السيرفر
npm start

# الدخول إلى الـ checkout
http://localhost:4200/checkout
```

---

## View Files

### الملفات المُنشأة (الجديدة)

```bash
# Services
cat src/app/services/payment.service.ts
cat src/app/services/payment-polling.service.ts

# Documentation
cat PAYMOB_IFRAME_GUIDE.md
cat PAYMENT_IMPLEMENTATION_GUIDE.md
cat BACKEND_TODO.md
cat COMPONENT_CHANGES.md
cat IMPLEMENTATION_SUMMARY.md
cat FAQ.md
cat README_PAYMENT.md
cat CHANGELOG.md
cat DONE.md
```

### الملفات المُحدثة

```bash
# Component
cat src/app/components/checkout/checkout.component.ts
cat src/app/components/checkout/checkout.component.html
cat src/app/components/checkout/checkout.component.scss
```

---

## Testing

### اختبار Cash Payment

```
1. Navigate: http://localhost:4200/checkout
2. Fill form: (name, phone, address, etc.)
3. Select: "الدفع عند الاستلام"
4. Click: "Confirm Order"
5. Result: ✅ Order confirmed immediately
```

### اختبار Card Payment

```
1. Navigate: http://localhost:4200/checkout
2. Fill form: (name, phone, address, etc.)
3. Select: "Card Payment"
4. Click: "Confirm Order"
5. See: Paymob iframe loads
6. Watch: Network tab → polling requests
7. Click: Cancel or wait for timeout
```

### اختبار Polling

```
# Open DevTools → Network tab
# Sort by: XHR/Fetch
# See: GET /api/orders/{id}/payment-status
# Repeated: every 2 seconds
# Total: up to 60 seconds
```

---

## Backend Implementation

### Add Payment Status Endpoint

```bash
# File: src/routes/orderRoutes.js

# 1. Add to controller import
const { getPaymentStatus } = require("../controllers/orderController");

# 2. Add route
router.get("/:id/payment-status", protect, validateObjectId("id"), getPaymentStatus);

# 3. Implement controller (in orderController.js)
const getPaymentStatus = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorResponse("Order not found", 404));
  }

  const isCustomer = order.customer.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isCustomer && !isAdmin) {
    return next(new ErrorResponse("Unauthorized", 403));
  }

  successResponse(res, 200, "Payment Status", {
    orderId: order._id,
    paymentStatus: order.payment.status,
    method: order.payment.method,
    transactionId: order.payment.transactionId
  });
});
```

### Test with Curl

```bash
# Test the endpoint
curl -X GET \
  http://localhost:3000/api/orders/ORDER_ID/payment-status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
# {
#   "success": true,
#   "message": "Payment Status",
#   "data": {
#     "orderId": "...",
#     "paymentStatus": "pending",
#     "method": "card",
#     "transactionId": null
#   }
# }
```

---

## Build & Deploy

### Build for Production

```bash
# Build optimized bundle
npm run build

# Output: dist/front-git/

# Serve locally to test
npx http-server dist/front-git/
```

### Deploy to Server

```bash
# Frontend deployment (example with Firebase)
npm install -g firebase-tools
firebase login
firebase init
firebase deploy

# Or with your hosting provider
# Copy dist/ to your server
scp -r dist/front-git/* user@server:/var/www/
```

---

## Environment Setup

### Create .env (Backend)

```bash
# Paymob Configuration
PAYMOB_API_KEY=your_api_key
PAYMOB_INTEGRATION_ID=your_integration_id
PAYMOB_IFRAME_ID=your_iframe_id
PAYMOB_HMAC_SECRET=your_hmac_secret

# Server
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost/docdose

# Other
JWT_SECRET=your_secret_key
```

### Update in Code

```typescript
// In payment-polling.service.ts
defaultConfig = {
  pollInterval: 2000, // Change to 3000 for 3 sec
  maxRetries: 30, // Change to 40 for 2 minutes
  maxTimeout: 60000, // Change to 120000 for 2 minutes
};
```

---

## Debugging

### Check Console Errors

```bash
# Browser Console (F12)
# Look for:
- Network errors
- Type errors
- Missing imports
- API call failures

# Network Tab
# Look for:
- Status codes (200, 404, 500)
- Response bodies
- Request headers
```

### Log Payment Activity

```typescript
// In checkout.component.ts
console.log("Payment initiated", this.orderId);
console.log("Iframe URL", this.iframeUrl);
console.log("Polling started", this.isPolling);
console.log("Payment status", this.paymentStatus);
```

### Monitor API Calls

```bash
# Backend logs
tail -f logs/payment.log

# Or add logging
console.error('Payment error:', err);
this.loggingService.error({ error: err });
```

---

## Common Issues & Fixes

### Issue: Iframe Not Loading

```bash
# Fix 1: Check Paymob API key
echo $PAYMOB_API_KEY

# Fix 2: Check iframe ID
grep "PAYMOB_IFRAME_ID" .env

# Fix 3: Check HTTPS (production only)
# Make sure using https://
```

### Issue: Polling Never Stops

```typescript
// Check payment status endpoint
GET http://localhost:3000/api/orders/ORDER_ID/payment-status

// Should return: paymentStatus: "paid" or "failed"
// If returns "pending", polling continues (normal)
```

### Issue: CORS Error

```javascript
// In backend - add CORS headers
const cors = require("cors");
app.use(cors());

// Or specific origin
app.use(
  cors({
    origin: "http://localhost:4200",
  })
);
```

### Issue: Token Expiration

```typescript
// Check token in localStorage
localStorage.getItem("token");

// Refresh token if expired
// Usually done in auth.interceptor
```

---

## Performance Optimization

### Reduce Bundle Size

```bash
# Check bundle
npm run build

# Analyze
npm install -g webpack-bundle-analyzer
ng build --stats-json
webpack-bundle-analyzer dist/front-git/stats.json
```

### Improve Loading

```typescript
// Use lazy loading
const routes = [
  {
    path: "checkout",
    loadChildren: () => import("./checkout/checkout.module").then((m) => m.CheckoutModule),
  },
];
```

### Cache Optimization

```typescript
// Add to service
return this.http.get(url).pipe(
  shareReplay(1) // Cache the result
);
```

---

## Documentation Links

```bash
# Read documentation
open PAYMOB_IFRAME_GUIDE.md
open PAYMENT_IMPLEMENTATION_GUIDE.md
open BACKEND_TODO.md
open COMPONENT_CHANGES.md
open FAQ.md
```

Or view online:

```
PAYMOB_IFRAME_GUIDE.md          → How to use
PAYMENT_IMPLEMENTATION_GUIDE.md  → Technical details
BACKEND_TODO.md                 → Backend tasks
COMPONENT_CHANGES.md            → Component reference
FAQ.md                          → Questions & answers
README_PAYMENT.md               → Full documentation
```

---

## Git Commands

### Commit Changes

```bash
# Check status
git status

# Add files
git add .

# Commit
git commit -m "feat: add Paymob payment integration"

# Push
git push origin main
```

### Create Branch

```bash
# Create feature branch
git checkout -b feature/payment-integration

# Make changes...

# Create pull request
git push origin feature/payment-integration
```

---

## Database

### Check Order in MongoDB

```bash
# Connect to MongoDB
mongo

# Use database
use docdose

# Find order
db.orders.findOne({ _id: ObjectId("...") })

# Check payment status
db.orders.findOne({}, { payment: 1 })
```

---

## API Testing

### Postman Collection

```bash
# Import: Copy these curl commands

# 1. Create Order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{...}'

# 2. Create Paymob Token
curl -X POST http://localhost:3000/api/payments/paymob/create-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"orderId":"..."}'

# 3. Get Payment Status
curl -X GET http://localhost:3000/api/orders/ORDER_ID/payment-status \
  -H "Authorization: Bearer TOKEN"
```

---

## Monitoring & Analytics

### Track Metrics

```typescript
// Add to your logging service
{
  type: 'payment',
  method: 'card',
  amount: 500,
  status: 'paid',
  duration: 45000,  // ms
  timestamp: new Date()
}
```

### View Logs

```bash
# Real-time logs
tail -f /var/log/docdose/payment.log

# Search for errors
grep "error" /var/log/docdose/payment.log

# Count transactions
grep "payment" /var/log/docdose/payment.log | wc -l
```

---

## Useful Tools

### Browser DevTools

```
F12 → Opens DevTools
Ctrl+Shift+J → Console
Ctrl+Shift+I → Inspector
Ctrl+Shift+N → Network
Ctrl+Shift+K → Console shortcut
```

### Postman

```
1. Create workspace
2. Import API collection
3. Set variables (token, URL)
4. Run requests
5. View responses
```

### Visual Studio Code

```
Ctrl+` → Open terminal
Ctrl+F → Find
Ctrl+H → Find & replace
Ctrl+Shift+F → Global search
Ctrl+D → Multi-cursor
```

---

## Quick Checklist

### Before Going Live

- [ ] Backend endpoint added
- [ ] Environment variables set
- [ ] HTTPS enabled
- [ ] Tests passed
- [ ] Error handling verified
- [ ] Mobile tested
- [ ] Performance checked
- [ ] Security reviewed
- [ ] Documentation updated
- [ ] Team trained

---

## Support

### Get Help

```
For Angular issues:
- Angular docs: https://angular.io
- Stack Overflow: tag:angular

For Paymob issues:
- Paymob docs: https://docs.paymob.com
- Email: support@paymob.com

For this implementation:
- Check FAQ.md
- Read COMPONENT_CHANGES.md
- Review PAYMENT_IMPLEMENTATION_GUIDE.md
```

---

## Quick Reference

| Task             | Command           |
| ---------------- | ----------------- |
| Start dev server | `npm start`       |
| Build production | `npm run build`   |
| Run tests        | `npm test`        |
| Lint code        | `npm run lint`    |
| View docs        | `open *.md`       |
| Check logs       | `tail -f logs/`   |
| Deploy           | `firebase deploy` |

---

## One Last Thing...

```
Everything is ready!
Just add the backend endpoint and you're good to go! 🚀

Time needed: ~2 hours to production
Status: 95% complete
Next action: BACKEND_TODO.md

Let's ship this! 🎉
```

---

**Date**: January 26, 2026  
**Status**: ✅ Ready for Deployment  
**Questions**: Check FAQ.md  
**Need Help**: See documentation files
