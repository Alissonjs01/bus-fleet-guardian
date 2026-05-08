export type UserRole = "admin" | "gestor" | "motorista";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  licenseKeyId?: string;
  status: "active" | "blocked" | "pending";
  createdAt?: string;
  lastLoginAt?: string;
  lastIp?: string;
  lastUserAgent?: string;
}

export interface AuthState {
  firebaseUserId: string | null;
  user: AppUser | null;
  loading: boolean;
}

export interface AccessKeyActivationResult {
  success: boolean;
  email?: string;
  error?: string;
}

export interface BootstrapAdminResult {
  success: boolean;
  email?: string;
  error?: string;
}

export interface SyncStatus {
  state: "online" | "offline" | "syncing" | "synced" | "error";
  isOnline: boolean;
  pendingWrites: boolean;
  lastSyncedAt: Date | null;
  error?: string;
}
