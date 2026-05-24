import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
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

export interface UserSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  companyId?: string;
  deviceId?: string;
  browser?: string;
  os?: string;
  userAgent?: string;
  status: "online" | "offline" | "terminated";
  forceLogout?: boolean;
  createdAt?: string;
  lastSeenAt?: string;
  endedAt?: string;
}

export interface OperationalEvent {
  id: string;
  type: "route_start" | "route_end" | "issue" | "vehicle_release" | "vehicle_maintenance" | "login" | "session" | "access";
  title: string;
  detail?: string;
  createdAt: string;
  tone: "success" | "warning" | "destructive" | "info" | "muted";
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

function normalizeSession(id: string, data: Record<string, unknown>): UserSession {
  return {
    id,
    userId: String(data.userId || ""),
    userName: String(data.userName || data.userEmail || "Usuario"),
    userEmail: String(data.userEmail || ""),
    role: String(data.role || ""),
    companyId: data.companyId ? String(data.companyId) : undefined,
    deviceId: data.deviceId ? String(data.deviceId) : undefined,
    browser: data.browser ? String(data.browser) : undefined,
    os: data.os ? String(data.os) : undefined,
    userAgent: data.userAgent ? String(data.userAgent) : undefined,
    status: data.status === "terminated" ? "terminated" : data.status === "offline" ? "offline" : "online",
    forceLogout: Boolean(data.forceLogout),
    createdAt: data.createdAt ? toIso(data.createdAt) : undefined,
    lastSeenAt: data.lastSeenAt ? toIso(data.lastSeenAt) : undefined,
    endedAt: data.endedAt ? toIso(data.endedAt) : undefined,
  };
}

function eventTime(value: unknown) {
  const iso = toIso(value);
  const time = new Date(iso).getTime();
  return Number.isFinite(time) ? time : 0;
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

export function subscribeUserSessions(callback: (sessions: UserSession[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    query(collection(db, "userSessions"), orderBy("lastSeenAt", "desc"), limit(100)),
    (snapshot) => callback(snapshot.docs.map((item) => normalizeSession(item.id, item.data()))),
    onError,
  );
}

export async function terminateUserSession(sessionId: string) {
  await updateDoc(doc(db, "userSessions", sessionId), {
    status: "terminated",
    forceLogout: true,
    endedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeOperationalEvents(callback: (events: OperationalEvent[]) => void, onError?: (error: Error) => void) {
  const buckets: Record<string, OperationalEvent[]> = {};
  const emit = () => {
    callback(Object.values(buckets).flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 80));
  };

  const subscriptions = [
    onSnapshot(query(collection(db, "routes"), orderBy("createdAt", "desc"), limit(40)), (snapshot) => {
      buckets.routes = snapshot.docs.flatMap((item) => {
        const data = item.data();
        const startedAt = data.startedAt || data.createdAt;
        const events: OperationalEvent[] = [{
          id: `${item.id}-start`,
          type: "route_start",
          title: `Motorista ${data.driverId || ""} iniciou rota`,
          detail: `Veiculo ${data.vehicleId || ""}`,
          createdAt: toIso(startedAt),
          tone: "success",
        }];
        if (data.finishedAt) {
          events.push({
            id: `${item.id}-end`,
            type: "route_end",
            title: `Motorista ${data.driverId || ""} finalizou rota`,
            detail: `Veiculo ${data.vehicleId || ""}`,
            createdAt: toIso(data.finishedAt),
            tone: "info",
          });
        }
        return events;
      });
      emit();
    }, onError),
    onSnapshot(query(collection(db, "issues"), orderBy("createdAt", "desc"), limit(40)), (snapshot) => {
      buckets.issues = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          type: "issue",
          title: `${String(data.gravidade || "Ocorrencia")} reportada`,
          detail: `Veiculo ${data.vehicleId || ""} - ${String(data.observacao || "").slice(0, 90)}`,
          createdAt: toIso(data.createdAt),
          tone: data.gravidade === "critica" ? "destructive" : "warning",
        };
      });
      emit();
    }, onError),
    onSnapshot(query(collection(db, "vehicles"), orderBy("updatedAt", "desc"), limit(60)), (snapshot) => {
      buckets.vehicles = snapshot.docs.flatMap((item) => {
        const data = item.data();
        const events: OperationalEvent[] = [];
        if (data.releasedAt) {
          events.push({
            id: `${item.id}-release`,
            type: "vehicle_release",
            title: `Veiculo ${data.numeroRegistro || data.plate || ""} liberado`,
            detail: `Para ${data.releasedToDriverName || data.releasedToDriverNumber || "motorista"} por ${data.releasedBy || "operacao"}`,
            createdAt: toIso(data.releasedAt),
            tone: "info",
          });
        }
        if (data.status === "manutencao") {
          events.push({
            id: `${item.id}-maintenance`,
            type: "vehicle_maintenance",
            title: `Veiculo ${data.numeroRegistro || data.plate || ""} enviado para manutencao`,
            detail: "Status operacional alterado",
            createdAt: toIso(data.updatedAt),
            tone: "warning",
          });
        }
        return events;
      });
      emit();
    }, onError),
    onSnapshot(query(collection(db, "users"), orderBy("lastLoginAt", "desc"), limit(40)), (snapshot) => {
      buckets.users = snapshot.docs
        .filter((item) => Boolean(item.data().lastLoginAt))
        .map((item) => {
          const data = item.data();
          return {
            id: `${item.id}-login`,
            type: "login",
            title: `${data.name || data.email || "Usuario"} fez login`,
            detail: `${data.role || "perfil"} - ${data.lastUserAgent ? String(data.lastUserAgent).slice(0, 80) : "dispositivo nao informado"}`,
            createdAt: toIso(data.lastLoginAt),
            tone: "success",
          };
        });
      emit();
    }, onError),
    onSnapshot(query(collection(db, "userSessions"), orderBy("lastSeenAt", "desc"), limit(40)), (snapshot) => {
      buckets.sessions = snapshot.docs.map((item) => {
        const data = item.data();
        const online = data.status !== "offline" && data.status !== "terminated" && Date.now() - eventTime(data.lastSeenAt) < 90000;
        return {
          id: `${item.id}-session`,
          type: "session",
          title: `${data.userName || data.userEmail || "Usuario"} ${online ? "online agora" : "ficou offline"}`,
          detail: `${data.os || "Dispositivo"} - ${data.browser || "Navegador"}`,
          createdAt: toIso(data.lastSeenAt || data.updatedAt || data.createdAt),
          tone: online ? "success" : "muted",
        };
      });
      emit();
    }, onError),
    onSnapshot(query(collection(db, "accessLogs"), orderBy("createdAt", "desc"), limit(40)), (snapshot) => {
      buckets.access = snapshot.docs.map((item) => {
        const log = normalizeLog(item.id, item.data());
        return {
          id: `access-${item.id}`,
          type: "access",
          title: log.action || "Acao administrativa",
          detail: log.details ? JSON.stringify(log.details).slice(0, 110) : log.userAgent || undefined,
          createdAt: log.created_at,
          tone: log.action.includes("blocked") ? "destructive" : "info",
        };
      });
      emit();
    }, onError),
  ];

  return () => subscriptions.forEach((unsubscribe) => unsubscribe());
}
