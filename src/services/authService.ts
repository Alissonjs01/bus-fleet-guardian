import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "@/integrations/firebase/client";
import type { AccessKeyActivationResult, AppUser, BootstrapAdminResult, UserRole } from "@/types/auth";
import { getDeviceId, getUserAgent } from "@/services/deviceService";

const DEFAULT_COMPANY_ID = "demo-company";

function normalizeUser(id: string, data: Record<string, unknown>): AppUser {
  return {
    id,
    name: String(data.name || data.email || "Usuário"),
    email: String(data.email || ""),
    role: (data.role as UserRole) || "motorista",
    companyId: String(data.companyId || DEFAULT_COMPANY_ID),
    licenseKeyId: data.licenseKeyId ? String(data.licenseKeyId) : undefined,
    status: (data.status as AppUser["status"]) || "active",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : undefined,
    lastLoginAt: typeof data.lastLoginAt === "string" ? data.lastLoginAt : undefined,
    lastIp: typeof data.lastIp === "string" ? data.lastIp : undefined,
    lastUserAgent: typeof data.lastUserAgent === "string" ? data.lastUserAgent : undefined,
  };
}

export async function getUserProfile(userId: string): Promise<AppUser | null> {
  const snapshot = await getDoc(doc(db, "users", userId));
  if (!snapshot.exists()) return null;
  return normalizeUser(snapshot.id, snapshot.data());
}

async function ensureDemoAdmin(user: User): Promise<AppUser> {
  const existing = await getUserProfile(user.uid);
  if (existing) return existing;

  const profile: AppUser = {
    id: user.uid,
    name: user.displayName || user.email || "Administrador",
    email: user.email || "",
    role: "admin",
    companyId: DEFAULT_COMPANY_ID,
    status: "active",
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, "users", user.uid), {
    ...profile,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    lastUserAgent: getUserAgent(),
  });

  return profile;
}

export function subscribeAuthState(callback: (user: AppUser | null, firebaseUserId: string | null) => void) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback(null, null);
      return;
    }

    const profile = (await getUserProfile(firebaseUser.uid)) || (await ensureDemoAdmin(firebaseUser));
    await updateDoc(doc(db, "users", firebaseUser.uid), {
      lastLoginAt: serverTimestamp(),
      lastUserAgent: getUserAgent(),
    }).catch(() => undefined);

    callback(profile, firebaseUser.uid);
  });
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return (await getUserProfile(credential.user.uid)) || ensureDemoAdmin(credential.user);
}

export async function registerWithEmail(email: string, password: string, name: string, role: UserRole = "motorista") {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const profile: AppUser = {
    id: credential.user.uid,
    name,
    email,
    role,
    companyId: DEFAULT_COMPANY_ID,
    status: "active",
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, "users", credential.user.uid), {
    ...profile,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    lastUserAgent: getUserAgent(),
  });

  return profile;
}

export async function activateAccessKey(
  code: string,
  userData?: { name: string; email: string; password: string },
): Promise<AccessKeyActivationResult> {
  const activate = httpsCallable(functions, "activateLicenseKey");
  const result = await activate({
    code,
    ...userData,
    deviceId: getDeviceId(),
    userAgent: getUserAgent(),
  });

  return result.data as AccessKeyActivationResult;
}

export async function bootstrapFirstAdmin(userData: {
  name: string;
  email: string;
  password: string;
  companyName: string;
}): Promise<BootstrapAdminResult> {
  const bootstrap = httpsCallable(functions, "bootstrapFirstAdmin");
  const result = await bootstrap({
    ...userData,
    deviceId: getDeviceId(),
    userAgent: getUserAgent(),
  });

  return result.data as BootstrapAdminResult;
}

export async function logout() {
  await signOut(auth);
}

export function currentUserId() {
  return auth.currentUser?.uid || null;
}
