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

function timestampMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "string") return new Date(value).getTime();
  if (typeof value === "object" && value && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  if (typeof value === "object" && value && "seconds" in value && typeof value.seconds === "number") {
    return value.seconds * 1000;
  }
  return 0;
}

function pickLatestDriver(docs: Array<{ id: string; data: () => Record<string, unknown> }>): Driver | null {
  if (docs.length === 0) return null;

  const [latest] = docs
    .map((item) => ({ item, data: item.data() }))
    .sort((a, b) => {
      const aTime = Math.max(timestampMillis(a.data.updatedAt), timestampMillis(a.data.createdAt));
      const bTime = Math.max(timestampMillis(b.data.updatedAt), timestampMillis(b.data.createdAt));
      return bTime - aTime;
    });

  return normalizeDriver(latest.item.id, latest.data);
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
  ));

  if (!byRegistration.empty) {
    return pickLatestDriver(byRegistration.docs);
  }

  const byRawRegistration = await getDocs(query(
    collection(db, "drivers"),
    where("companyId", "==", companyId),
    where("registrationNumber", "==", normalizedRegistration),
  ));

  if (!byRawRegistration.empty) {
    return pickLatestDriver(byRawRegistration.docs);
  }

  const byLegacyRegistration = await getDocs(query(
    collection(db, "drivers"),
    where("companyId", "==", companyId),
    where("numeroRegistro", "==", normalizedRegistration),
  ));

  if (!byLegacyRegistration.empty) {
    return pickLatestDriver(byLegacyRegistration.docs);
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
