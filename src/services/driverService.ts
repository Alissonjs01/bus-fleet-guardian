import { collection, getDocs, limit, query, serverTimestamp, updateDoc, where, doc } from "firebase/firestore";
import { normalizeDriverStatus } from "@/constants/driverStatus";
import { db } from "@/integrations/firebase/client";
import type { AppUser } from "@/types/auth";
import type { Driver } from "@/types/fleet";
import { normalizeRegistration } from "@/utils/localStorage";

function normalizeDriver(id: string, data: Record<string, unknown>): Driver {
  const registrationNumber = String(data.registrationNumber || data.numeroRegistro || "");
  const name = String(data.name || data.nome || "");
  const phone = data.phone || data.telefone;

  return {
    id: Number(data.legacyId || data.id || 0),
    firestoreId: id,
    companyId: String(data.companyId || ""),
    numeroRegistro: normalizeRegistration(registrationNumber),
    registrationNumber: normalizeRegistration(registrationNumber),
    registrationNumberNormalized: String(data.registrationNumberNormalized || normalizeRegistration(registrationNumber)),
    nome: name,
    name,
    telefone: phone ? String(phone) : undefined,
    phone: phone ? String(phone) : undefined,
    document: data.document ? String(data.document) : undefined,
    userId: data.userId ? String(data.userId) : undefined,
    status: normalizeDriverStatus(data.status),
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
    createdBy: data.createdBy ? String(data.createdBy) : undefined,
  };
}

export async function getDriverForUser(user: AppUser): Promise<Driver | null> {
  if (!user.companyId) return null;

  const byUser = await getDocs(query(
    collection(db, "drivers"),
    where("companyId", "==", user.companyId),
    where("userId", "==", user.id),
    limit(1),
  ));

  if (!byUser.empty) {
    const item = byUser.docs[0];
    return normalizeDriver(item.id, item.data());
  }

  const byEmailRegistration = await getDocs(query(
    collection(db, "drivers"),
    where("companyId", "==", user.companyId),
    where("registrationNumber", "==", normalizeRegistration(user.email)),
    limit(1),
  ));

  if (!byEmailRegistration.empty) {
    const item = byEmailRegistration.docs[0];
    return normalizeDriver(item.id, item.data());
  }

  return null;
}

export async function getDriverByRegistration(registrationNumber: string, companyId = "demo-company"): Promise<Driver | null> {
  const normalizedRegistration = normalizeRegistration(registrationNumber);

  const byRegistration = await getDocs(query(
    collection(db, "drivers"),
    where("companyId", "==", companyId),
    where("registrationNumberNormalized", "==", normalizedRegistration),
    limit(1),
  ));

  if (!byRegistration.empty) {
    const item = byRegistration.docs[0];
    return normalizeDriver(item.id, item.data());
  }

  const byRawRegistration = await getDocs(query(
    collection(db, "drivers"),
    where("companyId", "==", companyId),
    where("registrationNumber", "==", normalizedRegistration),
    limit(1),
  ));

  if (!byRawRegistration.empty) {
    const item = byRawRegistration.docs[0];
    return normalizeDriver(item.id, item.data());
  }

  const byLegacyRegistration = await getDocs(query(
    collection(db, "drivers"),
    where("companyId", "==", companyId),
    where("numeroRegistro", "==", normalizedRegistration),
    limit(1),
  ));

  if (!byLegacyRegistration.empty) {
    const item = byLegacyRegistration.docs[0];
    return normalizeDriver(item.id, item.data());
  }

  return null;
}

export async function updateDriverOperationalStatus(driver: Driver, status: Driver["status"]) {
  if (!driver.firestoreId) return;
  await updateDoc(doc(db, "drivers", driver.firestoreId), {
    status: normalizeDriverStatus(status),
    updatedAt: serverTimestamp(),
  });
}
