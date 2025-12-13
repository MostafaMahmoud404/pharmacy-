export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, any> | string[];
}
