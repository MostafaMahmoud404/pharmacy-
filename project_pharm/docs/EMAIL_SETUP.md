# 📧 Email Setup Guide

## Development Mode (Without Email)

للتطوير بدون إعداد إيميل:

```bash
# في .env
NODE_ENV=development
EMAIL_HOST=
EMAIL_USER=
EMAIL_PASS=
```

### استخدام Reset Password في Development:

```bash
# 1. ارسل طلب Forgot Password
POST http://localhost:5000/api/auth/forgot-password
{
  "email": "user@example.com"
}

# 2. الـ Response هيحتوي على الـ Token:
{
  "success": true,
  "data": {
    "resetToken": "abc123def456...",
    "resetUrl": "http://localhost:3000/reset-password/abc123def456..."
  }
}

# 3. استخدم الـ Token في Reset Password:
POST http://localhost:5000/api/auth/reset-password/abc123def456...
{
  "password": "NewPassword@123",
  "confirmPassword": "NewPassword@123"
}
```

---

## Option 1: Gmail Setup

### Steps:

1. **Enable 2-Step Verification:**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Create App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select App: Mail
   - Select Device: Other (Custom name)
   - Copy the 16-character password

3. **Update .env:**
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx

FROM_NAME=Pharmacy Platform
FROM_EMAIL=your_email@gmail.com
```

### Limits:
- 500 emails per day (free Gmail account)
- 2000 emails per day (Google Workspace)

---

## Option 2: Mailtrap (Recommended for Development)

**Best for development** - Catches all emails without sending them.

### Steps:

1. **Sign up:** https://mailtrap.io
2. **Get credentials:** Inbox → SMTP Settings
3. **Update .env:**

```bash
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your_mailtrap_username
EMAIL_PASS=your_mailtrap_password

FROM_NAME=Pharmacy Platform
FROM_EMAIL=noreply@pharmacy.com
```

### Advantages:
- ✅ No real emails sent
- ✅ View all emails in browser
- ✅ Test email templates
- ✅ Free for development

---

## Option 3: SendGrid (For Production)

### Steps:

1. **Sign up:** https://sendgrid.com
2. **Create API Key:** Settings → API Keys
3. **Update .env:**

```bash
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your_sendgrid_api_key

FROM_NAME=Pharmacy Platform
FROM_EMAIL=verified@yourdomain.com
```

### Requirements:
- Domain verification required for production
- Free tier: 100 emails/day
- Paid plans available

---

## Option 4: Custom SMTP Server

```bash
EMAIL_HOST=smtp.your-domain.com
EMAIL_PORT=587
EMAIL_USER=noreply@your-domain.com
EMAIL_PASS=your_password

FROM_NAME=Pharmacy Platform
FROM_EMAIL=noreply@your-domain.com
```

---

## Testing Email Configuration

### Test Script:

```bash
# Create test file: src/utils/test-email.js
node src/utils/test-email.js
```

### Manual Test:

```bash
# 1. Start server
npm run dev

# 2. Test Forgot Password
POST http://localhost:5000/api/auth/forgot-password
{
  "email": "test@example.com"
}

# 3. Check:
# - Mailtrap inbox (if using Mailtrap)
# - Gmail inbox (if using Gmail)
# - Server logs for errors
```

---

## Troubleshooting

### Error: "Invalid login"
- Check EMAIL_USER and EMAIL_PASS are correct
- For Gmail, make sure you're using App Password, not account password

### Error: "Connection timeout"
- Check EMAIL_HOST and EMAIL_PORT
- Check firewall settings

### Error: "Self-signed certificate"
- Already handled in code with `rejectUnauthorized: false`

### Emails not arriving:
- Check spam folder
- Verify FROM_EMAIL is valid
- Check email service limits

---

## Environment Variables

```bash
# Required
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_username
EMAIL_PASS=your_password

# Optional
FROM_NAME=Pharmacy Platform
FROM_EMAIL=noreply@pharmacy.com
NODE_ENV=development
```

---

## Production Checklist

- [ ] Use dedicated email service (SendGrid, AWS SES, etc.)
- [ ] Verify sender domain
- [ ] Set up SPF, DKIM, DMARC records
- [ ] Use strong passwords
- [ ] Enable rate limiting
- [ ] Monitor email deliverability
- [ ] Set up email templates
- [ ] Test all email scenarios