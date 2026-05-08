import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyC257VfoujWKRjaem7TZPl_TcKQ0Zr3_7o",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "gestao-frota-bus.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "gestao-frota-bus",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "gestao-frota-bus.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "914757900925",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:914757900925:web:03f7943a284a6ec5b8ef14",
};

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
const companyId = process.env.SEED_COMPANY_ID || "demo-company";

if (!email || !password) {
  throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before running this script.");
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

await signInWithEmailAndPassword(auth, email, password);

const demoVehicles = [
  { legacyId: 1, numeroRegistro: "05", tipo: "onibus", status: "operacao", createdAt: "2024-01-15T08:00:00Z" },
  { legacyId: 2, numeroRegistro: "12", tipo: "micro_onibus", status: "garagem", createdAt: "2024-01-20T09:30:00Z" },
  { legacyId: 3, numeroRegistro: "08", tipo: "articulado", status: "manutencao", createdAt: "2024-02-01T10:15:00Z" },
  { legacyId: 4, numeroRegistro: "15", tipo: "onibus", status: "operacao", createdAt: "2024-02-10T11:00:00Z" },
];

const demoDrivers = [
  { legacyId: 1, numeroRegistro: "M001", nome: "Carlos Silva", telefone: "(11) 99999-1111", createdAt: "2024-01-10T08:00:00Z" },
  { legacyId: 2, numeroRegistro: "M002", nome: "Joao Santos", telefone: "(11) 99999-2222", createdAt: "2024-01-12T09:00:00Z" },
  { legacyId: 3, numeroRegistro: "M003", nome: "Pedro Lima", telefone: "", createdAt: "2024-01-18T10:00:00Z" },
];

const demoProblems = [
  { legacyId: 1, vehicleId: 1, driverId: 1, categoria: "eletrica", gravidade: "alta", observacao: "Problema no sistema de ar condicionado", status: "aberto", createdAt: "2024-07-25T14:30:00Z" },
  { legacyId: 2, vehicleId: 3, driverId: 2, categoria: "mecanica", gravidade: "critica", observacao: "Freios fazendo ruido estranho", status: "aberto", createdAt: "2024-07-26T10:15:00Z" },
  { legacyId: 3, vehicleId: 2, driverId: 3, categoria: "funilaria", gravidade: "baixa", observacao: "Arranhao na lateral direita", status: "resolvido", createdAt: "2024-07-20T16:45:00Z", resolvedAt: "2024-07-22T09:00:00Z" },
];

const demoRevisions = [
  { legacyId: 1, vehicleId: 1, tipo: "geral", dataRevisao: "2024-06-15", dataProxima: "2026-06-15", observacao: "Revisao completa realizada", responsavel: "Oficina Central", createdAt: "2024-06-15T08:00:00Z" },
  { legacyId: 2, vehicleId: 2, tipo: "mecanica", dataRevisao: "2024-05-20", dataProxima: "2026-05-20", observacao: "Troca de oleo e filtros", responsavel: "Mecanico Joao", createdAt: "2024-05-20T10:30:00Z" },
  { legacyId: 3, vehicleId: 3, tipo: "eletrica", dataRevisao: "2024-04-10", dataProxima: "2026-05-10", observacao: "Verificacao do sistema eletrico", responsavel: "Eletricista Mario", createdAt: "2024-04-10T14:20:00Z" },
];

async function existsBy(collectionName, field, value) {
  const snapshot = await getDocs(query(collection(db, collectionName), where("companyId", "==", companyId), where(field, "==", value)));
  return !snapshot.empty;
}

async function addIfMissing(collectionName, existsField, payload, extra = {}) {
  if (await existsBy(collectionName, existsField, payload[existsField])) {
    return false;
  }

  await addDoc(collection(db, collectionName), {
    ...payload,
    ...extra,
    companyId,
    id: payload.legacyId,
    createdAt: payload.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return true;
}

let created = 0;

for (const vehicle of demoVehicles) {
  const wasCreated = await addIfMissing("vehicles", "numeroRegistro", vehicle, { plate: vehicle.numeroRegistro });
  if (wasCreated) created += 1;
}

for (const driver of demoDrivers) {
  const wasCreated = await addIfMissing("drivers", "numeroRegistro", driver, { name: driver.nome, phone: driver.telefone, status: "active" });
  if (wasCreated) created += 1;
}

for (const problem of demoProblems) {
  const wasCreated = await addIfMissing("issues", "observacao", problem, {
    title: problem.observacao.slice(0, 80),
    description: problem.observacao,
    priority: problem.gravidade,
  });
  if (wasCreated) created += 1;
}

for (const revision of demoRevisions) {
  const wasCreated = await addIfMissing("maintenance", "observacao", revision, {
    type: revision.tipo,
    description: revision.observacao,
    status: "scheduled",
    scheduledAt: revision.dataProxima,
    completedAt: revision.dataRevisao,
  });
  if (wasCreated) created += 1;
}

console.log(`Demo fleet seed complete. Created ${created} missing records for ${companyId}.`);
process.exit(0);
