export interface User {
  id?: string | number;
  // Friendly display name used in templates
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: 'doctor' | 'patient' | 'customer' | 'pharmacist' | 'admin' | string;
  avatarUrl?: string;
}
