export interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
}

export interface AuthUser {
  id?: string | number;
  email?: string;
  roles?: string[];
}

export interface AuthResponse {
  userId?: string | number;
  tokens?: AuthTokens;
  user?: AuthUser;
}
