// Tipos para o sistema de licenciamento

export interface License {
  id: string;
  key?: string;
  displayCode?: string;
  companyId?: string;
  companyName?: string;
  role?: 'admin' | 'gestor' | 'motorista';
  status: 'active' | 'expired' | 'blocked' | 'pending';
  plan?: 'monthly';
  expires_at: string;
  max_activations: number;
  activationsCount?: number;
  created_at: string;
  updated_at: string;
  createdBy?: string;
}

export interface Activation {
  id: string;
  license_id: string;
  fingerprint_hash: string;
  activated_at: string;
  last_validated_at: string;
}

export interface LicenseToken {
  license_id: string;
  fingerprint_hash: string;
  issued_at: number;
  expires_at: number;
  plan: 'monthly';
}

export interface LicenseState {
  isActivated: boolean;
  isValid: boolean;
  token: string | null;
  expiresAt: string | null;
  lastValidation: string | null;
  offlineGracePeriod: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin';
  created_at: string;
}

export interface ActivityLog {
  id: string;
  license_id: string | null;
  userId?: string;
  companyId?: string;
  action: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  userAgent?: string | null;
  created_at: string;
}

export type LicenseStatus = 'active' | 'expired' | 'blocked' | 'pending';

export interface ActivationResponse {
  success: boolean;
  token?: string;
  expiresAt?: string;
  error?: string;
}

export interface ValidationResponse {
  valid: boolean;
  token?: string;
  expiresAt?: string;
  error?: string;
}
