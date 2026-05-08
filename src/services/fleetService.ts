import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import type { Driver, FleetData, Problem, Revision, Trip, Vehicle } from "@/types/fleet";
import { getInitialFleetData, saveFleetCache } from "@/utils/localStorage";

type FleetCollectionName = "vehicles" | "drivers" | "issues" | "maintenance" | "trips";

const COLLECTIONS: Record<keyof FleetData, FleetCollectionName> = {
  vehicles: "vehicles",
  drivers: "drivers",
  problems: "issues",
  revisions: "maintenance",
  trips: "trips",
};

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return new Date(value as string).toISOString();
}

function normalizeVehicle(id: string, data: DocumentData): Vehicle {
  return {
    id: Number(data.legacyId || data.id || 0),
    firestoreId: id,
    companyId: data.companyId,
    numeroRegistro: data.numeroRegistro || data.plate || "",
    tipo: data.tipo || "onibus",
    status: data.status || "garagem",
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function normalizeDriver(id: string, data: DocumentData): Driver {
  return {
    id: Number(data.legacyId || data.id || 0),
    firestoreId: id,
    companyId: data.companyId,
    numeroRegistro: data.numeroRegistro || "",
    nome: data.nome || data.name || "",
    telefone: data.telefone || data.phone,
    status: data.status || "active",
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function normalizeProblem(id: string, data: DocumentData): Problem {
  return {
    id: Number(data.legacyId || data.id || 0),
    firestoreId: id,
    companyId: data.companyId,
    vehicleId: Number(data.vehicleId || 0),
    driverId: Number(data.driverId || 0),
    categoria: data.categoria || "outros",
    gravidade: data.gravidade || data.priority || "baixa",
    observacao: data.observacao || data.description || "",
    status: data.status || "aberto",
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    resolvedAt: data.resolvedAt ? toIso(data.resolvedAt) : undefined,
  };
}

function normalizeRevision(id: string, data: DocumentData): Revision {
  return {
    id: Number(data.legacyId || data.id || 0),
    firestoreId: id,
    companyId: data.companyId,
    vehicleId: Number(data.vehicleId || 0),
    tipo: data.tipo || data.type || "geral",
    dataRevisao: data.dataRevisao || toIso(data.completedAt),
    dataProxima: data.dataProxima || toIso(data.scheduledAt),
    observacao: data.observacao || data.description,
    responsavel: data.responsavel,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function normalizeTrip(id: string, data: DocumentData): Trip {
  return {
    id: Number(data.legacyId || data.id || 0),
    firestoreId: id,
    companyId: data.companyId,
    vehicleId: Number(data.vehicleId || 0),
    driverId: Number(data.driverId || 0),
    saida: data.saida || data.startTime || toIso(data.createdAt),
    retorno: data.retorno || data.endTime,
    problemas: data.problemas || [],
    createdAt: toIso(data.createdAt),
  };
}

function withCompany<T extends Record<string, unknown>>(companyId: string, data: T) {
  return {
    ...data,
    companyId,
    updatedAt: serverTimestamp(),
  };
}

export function subscribeFleetData(
  companyId: string,
  callback: (data: FleetData, pendingWrites: boolean) => void,
  onError: (error: Error) => void,
) {
  const data: FleetData = {
    vehicles: [],
    drivers: [],
    problems: [],
    revisions: [],
    trips: [],
  };
  const pending: Record<keyof FleetData, boolean> = {
    vehicles: false,
    drivers: false,
    problems: false,
    revisions: false,
    trips: false,
  };

  const emit = () => {
    saveFleetCache(data);
    callback({ ...data }, Object.values(pending).some(Boolean));
  };

  const subscriptions = (Object.keys(COLLECTIONS) as Array<keyof FleetData>).map((key) => {
    const q = query(
      collection(db, COLLECTIONS[key]),
      where("companyId", "==", companyId),
      orderBy("createdAt", "desc"),
    );

    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        pending[key] = snapshot.metadata.hasPendingWrites;
        const docs = snapshot.docs;

        if (key === "vehicles") data.vehicles = docs.map((item) => normalizeVehicle(item.id, item.data()));
        if (key === "drivers") data.drivers = docs.map((item) => normalizeDriver(item.id, item.data()));
        if (key === "problems") data.problems = docs.map((item) => normalizeProblem(item.id, item.data()));
        if (key === "revisions") data.revisions = docs.map((item) => normalizeRevision(item.id, item.data()));
        if (key === "trips") data.trips = docs.map((item) => normalizeTrip(item.id, item.data()));

        emit();
      },
      onError,
    );
  });

  return () => subscriptions.forEach((unsubscribe) => unsubscribe());
}

export async function seedInitialFleetData(companyId: string) {
  const existing = await getDocs(query(collection(db, "vehicles"), where("companyId", "==", companyId)));
  if (!existing.empty) return;

  const initial = getInitialFleetData();
  const batch = writeBatch(db);

  initial.vehicles.forEach((vehicle) => {
    const ref = doc(collection(db, "vehicles"));
    batch.set(ref, {
      ...vehicle,
      legacyId: vehicle.id,
      companyId,
      plate: vehicle.numeroRegistro,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  initial.drivers.forEach((driver) => {
    const ref = doc(collection(db, "drivers"));
    batch.set(ref, {
      ...driver,
      legacyId: driver.id,
      companyId,
      name: driver.nome,
      phone: driver.telefone || "",
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  initial.problems.forEach((problem) => {
    const ref = doc(collection(db, "issues"));
    batch.set(ref, {
      ...problem,
      legacyId: problem.id,
      companyId,
      title: problem.observacao.slice(0, 80),
      description: problem.observacao,
      priority: problem.gravidade,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  initial.revisions.forEach((revision) => {
    const ref = doc(collection(db, "maintenance"));
    batch.set(ref, {
      ...revision,
      legacyId: revision.id,
      companyId,
      type: revision.tipo,
      description: revision.observacao || "",
      status: "scheduled",
      scheduledAt: revision.dataProxima,
      completedAt: revision.dataRevisao,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

export async function upsertVehicle(companyId: string, vehicle: Vehicle) {
  const payload = withCompany(companyId, {
    ...vehicle,
    legacyId: vehicle.id,
    plate: vehicle.numeroRegistro,
    createdAt: vehicle.createdAt || new Date().toISOString(),
  });

  if (vehicle.firestoreId) {
    await updateDoc(doc(db, "vehicles", vehicle.firestoreId), payload);
    return vehicle.firestoreId;
  }

  const ref = await addDoc(collection(db, "vehicles"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteVehicle(vehicle: Vehicle) {
  if (!vehicle.firestoreId) return;
  await deleteDoc(doc(db, "vehicles", vehicle.firestoreId));
}

export async function upsertDriver(companyId: string, driver: Driver) {
  const payload = withCompany(companyId, {
    ...driver,
    legacyId: driver.id,
    name: driver.nome,
    phone: driver.telefone || "",
    status: driver.status || "active",
    createdAt: driver.createdAt || new Date().toISOString(),
  });

  if (driver.firestoreId) {
    await updateDoc(doc(db, "drivers", driver.firestoreId), payload);
    return driver.firestoreId;
  }

  const ref = await addDoc(collection(db, "drivers"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteDriver(driver: Driver) {
  if (!driver.firestoreId) return;
  await deleteDoc(doc(db, "drivers", driver.firestoreId));
}

export async function updateProblem(companyId: string, problem: Problem) {
  const payload = withCompany(companyId, {
    ...problem,
    legacyId: problem.id,
    title: problem.observacao.slice(0, 80),
    description: problem.observacao,
    priority: problem.gravidade,
    createdAt: problem.createdAt || new Date().toISOString(),
  });

  if (problem.firestoreId) {
    await updateDoc(doc(db, "issues", problem.firestoreId), payload);
    return problem.firestoreId;
  }

  const ref = await addDoc(collection(db, "issues"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createTrip(companyId: string, trip: Omit<Trip, "id" | "createdAt">) {
  const ref = await addDoc(collection(db, "trips"), {
    ...trip,
    companyId,
    startTime: trip.saida,
    endTime: trip.retorno || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function writeSyncQueue(companyId: string, userId: string, entity: string, action: string, payload: unknown) {
  await addDoc(collection(db, "syncQueue"), {
    companyId,
    userId,
    entity,
    action,
    payload,
    status: "pending",
    createdAt: serverTimestamp(),
    syncedAt: null,
  });
}

export async function createCompanyIfMissing(companyId: string, name = "Empresa Demo") {
  await setDoc(
    doc(db, "companies", companyId),
    {
      name,
      status: "active",
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function replaceCompanyFleetData(companyId: string, fleetData: FleetData) {
  const batch = writeBatch(db);
  const targets: Array<[FleetCollectionName, Array<Vehicle | Driver | Problem | Revision | Trip>]> = [
    ["vehicles", fleetData.vehicles],
    ["drivers", fleetData.drivers],
    ["issues", fleetData.problems],
    ["maintenance", fleetData.revisions],
    ["trips", fleetData.trips],
  ];

  targets.forEach(([collectionName, records]) => {
    records.forEach((record) => {
      const ref = record.firestoreId ? doc(db, collectionName, record.firestoreId) : doc(collection(db, collectionName));
      batch.set(
        ref,
        {
          ...record,
          legacyId: record.id,
          companyId,
          updatedAt: serverTimestamp(),
          createdAt: record.createdAt || new Date().toISOString(),
        },
        { merge: true },
      );
    });
  });

  await batch.commit();
}
