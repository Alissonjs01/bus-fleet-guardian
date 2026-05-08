import { collection, doc, getDocs, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/integrations/firebase/client";
import { loginWithEmail, logout, currentUserId, getUserProfile } from "@/services/authService";
import type { ActivityLog, License } from "@/types/license";

export interface AdminLoginResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export interface LicenseListResponse {
  success: boolean;
  licenses?: License[];
  error?: string;
}

export interface LicenseStats {
  total: number;
  active: number;
  expired: number;
  blocked: number;
  pending: number;
}

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return new Date(value as string).toISOString();
}

function normalizeLicense(id: string, data: Record<string, unknown>): License {
  const status = data.status === "active" && new Date(toIso(data.expiresAt)).getTime() < Date.now() ? "expired" : data.status;

  return {
    id,
    key: String(data.displayCode || "••••-••••-••••-••••"),
    displayCode: String(data.displayCode || "••••-••••-••••-••••"),
    companyId: String(data.companyId || ""),
    companyName: String(data.companyName || ""),
    role: data.role as License["role"],
    status: (status as License["status"]) || "pending",
    plan: "monthly",
    expires_at: toIso(data.expiresAt),
    max_activations: Number(data.maxDevices || 1),
    activationsCount: Number(data.activationsCount || 0),
    created_at: toIso(data.createdAt),
    updated_at: toIso(data.updatedAt),
    createdBy: data.createdBy ? String(data.createdBy) : undefined,
  };
}

function normalizeLog(id: string, data: Record<string, unknown>): ActivityLog {
  return {
    id,
    license_id: data.licenseKeyId ? String(data.licenseKeyId) : null,
    userId: data.userId ? String(data.userId) : undefined,
    companyId: data.companyId ? String(data.companyId) : undefined,
    action: String(data.action || ""),
    details: (data.details as Record<string, unknown>) || null,
    ip_address: data.ip ? String(data.ip) : null,
    userAgent: data.userAgent ? String(data.userAgent) : null,
    created_at: toIso(data.createdAt),
  };
}

export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  try {
    const user = await loginWithEmail(email, password);
    if (!["admin", "gestor"].includes(user.role)) {
      await logout();
      return { success: false, error: "Acesso não autorizado" };
    }
    return { success: true, token: user.id };
  } catch {
    return { success: false, error: "Credenciais inválidas" };
  }
}

export function adminLogout(): void {
  void logout();
}

export function isAdminLoggedIn(): boolean {
  return !!currentUserId();
}

export function getAdminToken(): string | null {
  return currentUserId();
}

export async function verifyAdminSession(): Promise<boolean> {
  const userId = currentUserId();
  if (!userId) return false;
  const user = await getUserProfile(userId);
  return !!user && ["admin", "gestor"].includes(user.role) && user.status === "active";
}

export async function listLicenses(): Promise<LicenseListResponse> {
  try {
    const snapshot = await getDocs(query(collection(db, "licenseKeys"), orderBy("createdAt", "desc")));
    return {
      success: true,
      licenses: snapshot.docs.map((item) => normalizeLicense(item.id, item.data())),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao buscar licenças" };
  }
}

export function subscribeLicenses(callback: (licenses: License[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    query(collection(db, "licenseKeys"), orderBy("createdAt", "desc")),
    (snapshot) => callback(snapshot.docs.map((item) => normalizeLicense(item.id, item.data()))),
    onError,
  );
}

export async function getLicenseStats(): Promise<LicenseStats> {
  const result = await listLicenses();
  const licenses = result.licenses || [];
  return {
    total: licenses.length,
    active: licenses.filter((l) => l.status === "active").length,
    expired: licenses.filter((l) => l.status === "expired").length,
    blocked: licenses.filter((l) => l.status === "blocked").length,
    pending: licenses.filter((l) => l.status === "pending").length,
  };
}

export async function createLicense(expiresAt: string): Promise<{ success: boolean; license?: License; error?: string }> {
  try {
    const createLicenseKey = httpsCallable(functions, "createLicenseKey");
    const result = await createLicenseKey({
      expiresAt,
      maxDevices: 1,
      role: "gestor",
      companyName: "Empresa Demo",
      accessType: "monthly",
    });
    const data = result.data as { success: boolean; license?: License; code?: string; error?: string };
    return {
      success: data.success,
      license: data.license ? { ...data.license, key: data.code || data.license.key } : undefined,
      error: data.error,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar licença" };
  }
}

export async function updateLicenseStatus(
  licenseId: string,
  status: "active" | "blocked" | "expired",
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateLicense = httpsCallable(functions, "updateLicenseStatus");
    await updateLicense({ licenseId, status });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar licença" };
  }
}

export async function resetLicenseActivation(licenseId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const reset = httpsCallable(functions, "resetLicenseActivations");
    await reset({ licenseId });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao resetar ativação" };
  }
}

export async function updateLicenseExpiration(
  licenseId: string,
  expiresAt: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, "licenseKeys", licenseId), {
      expiresAt,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar expiração" };
  }
}

export async function getActivityLogs(licenseId?: string): Promise<{ success: boolean; logs?: ActivityLog[]; error?: string }> {
  try {
    const base = collection(db, "accessLogs");
    const q = licenseId
      ? query(base, where("licenseKeyId", "==", licenseId), orderBy("createdAt", "desc"))
      : query(base, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return { success: true, logs: snapshot.docs.map((item) => normalizeLog(item.id, item.data())) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao buscar logs" };
  }
}
