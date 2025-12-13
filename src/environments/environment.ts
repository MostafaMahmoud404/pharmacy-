// src/environments/environment.ts (Development)
export const environment = {
  production: false,
  // ✅ غيّرت من 'http://localhost:5000/api'
  // لـ 'http://localhost:5000' (بدون /api)
  // عشان الـ Services بتضيف /api بنفسها
  apiUrl: 'http://localhost:5000',
  appName: 'منصة الصيدلية',
  version: '1.0.0'
};
