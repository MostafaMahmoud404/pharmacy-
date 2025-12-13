// src/environments/environment.prod.ts (Production)
export const environment = {
  production: true,
  // ✅ هنا كمان بدون /api في النهاية
  apiUrl: 'https://your-production-api.com',
  appName: 'منصة الصيدلية',
  uploadsUrl: 'https://YOUR-DOMAIN/uploads',
  tokenKey: 'pharma_token',
  userKey: 'pharma_user'  // ✅ تم الإضافة
,
  version: '1.0.0'
};
