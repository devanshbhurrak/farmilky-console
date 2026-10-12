export type UserRole = 'admin' | 'delivery' | 'delivery_partner' | 'agent' | 'customer' | 'supplier';

export interface AuthUser {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  isActive?: boolean;
  [key: string]: unknown;
}

export interface LoginRequest {
  identifier: string;
  password: string;
  tenantSlug: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: AuthUser;
    token?: string;
  };
  message?: string;
}
