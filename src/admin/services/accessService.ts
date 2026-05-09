import { deleteApp, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db, firebaseConfig } from "@/integrations/firebase/client";
import { currentUserId } from "@/services/authService";
import type { AppUser } from "@/types/auth";

const DEFAULT_COMPANY_ID = "demo-company";

function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return undefined;
}

function normalizeAccessUser(id: string, data: Record<string, unknown>): AppUser {
  return {
    id,
    name: String(data.name || data.email || "Gestor"),
    email: String(data.email || ""),
    role: data.role === "admin" || data.role === "motorista" ? data.role : "gestor",
    companyId: String(data.companyId || DEFAULT_COMPANY_ID),
    status: data.status === "blocked" || data.status === "pending" ? data.status : "active",
    createdAt: toIso(data.createdAt),
    lastLoginAt: toIso(data.lastLoginAt),
    lastIp: typeof data.lastIp === "string" ? data.lastIp : undefined,
    lastUserAgent: typeof data.lastUserAgent === "string" ? data.lastUserAgent : undefined,
  };
}

export function subscribeAccessUsers(callback: (users: AppUser[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    query(collection(db, "users"), orderBy("createdAt", "desc")),
    (snapshot) => {
      callback(
        snapshot.docs
          .map((item) => normalizeAccessUser(item.id, item.data()))
          .filter((user) => user.role === "gestor"),
      );
    },
    onError,
  );
}

export async function createManagerAccess(data: { name: string; email: string; password: string }) {
  const secondaryName = `manager-access-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, data.email.trim().toLowerCase(), data.password);
    await setDoc(doc(db, "users", credential.user.uid), {
      name: data.name.trim() || data.email.trim().toLowerCase(),
      email: data.email.trim().toLowerCase(),
      role: "gestor",
      companyId: DEFAULT_COMPANY_ID,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: currentUserId(),
    });
    return credential.user.uid;
  } finally {
    await secondaryAuth.signOut().catch(() => undefined);
    await deleteApp(secondaryApp).catch(() => undefined);
  }
}

export async function updateAccessUserStatus(userId: string, status: AppUser["status"]) {
  await updateDoc(doc(db, "users", userId), {
    status,
    updatedAt: serverTimestamp(),
  });
}
