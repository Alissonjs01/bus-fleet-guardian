import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  return value;
}

const firebaseConfig = {
  apiKey: requiredEnv("VITE_FIREBASE_API_KEY"),
  authDomain: requiredEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: requiredEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: requiredEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requiredEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: requiredEnv("VITE_FIREBASE_APP_ID"),
};

const apiKey = firebaseConfig.apiKey;
const adminEmail = requiredEnv("SEED_ADMIN_EMAIL");
const adminPassword = requiredEnv("SEED_ADMIN_PASSWORD");
const companyId = process.env.SEED_COMPANY_ID || "demo-company";
const gestorEmail = requiredEnv("SEED_GESTOR_EMAIL");
const gestorPassword = requiredEnv("SEED_GESTOR_PASSWORD");
const motoristaEmail = requiredEnv("SEED_MOTORISTA_EMAIL");
const motoristaPassword = requiredEnv("SEED_MOTORISTA_PASSWORD");

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function authRest(path, body) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${path}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Firebase Auth REST error");
  return data;
}

async function ensureAuthUser(email, password) {
  try {
    const created = await authRest("accounts:signUp", { email, password, returnSecureToken: true });
    return created.localId;
  } catch (error) {
    if (!String(error.message).includes("EMAIL_EXISTS")) throw error;
    const signedIn = await authRest("accounts:signInWithPassword", { email, password, returnSecureToken: true });
    return signedIn.localId;
  }
}

const gestorUid = await ensureAuthUser(gestorEmail, gestorPassword);
const motoristaUid = await ensureAuthUser(motoristaEmail, motoristaPassword);

await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

await setDoc(doc(db, "companies", companyId), {
  name: "Empresa Demo",
  status: "active",
  createdAt: serverTimestamp(),
}, { merge: true });

await setDoc(doc(db, "users", gestorUid), {
  name: "Gestor Demo",
  email: gestorEmail,
  role: "gestor",
  companyId,
  status: "active",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
}, { merge: true });

await setDoc(doc(db, "users", motoristaUid), {
  name: "Motorista Demo",
  email: motoristaEmail,
  role: "motorista",
  companyId,
  status: "active",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
}, { merge: true });

const demoVehicles = [
  { legacyId: 1, numeroRegistro: "05", vehicleType: "van", tipo: "van", status: "garagem", createdAt: "2024-01-15T08:00:00Z" },
  { legacyId: 2, numeroRegistro: "12", vehicleType: "micro_onibus", tipo: "micro_onibus", status: "garagem", createdAt: "2024-01-20T09:30:00Z" },
  { legacyId: 3, numeroRegistro: "08", vehicleType: "convencional", tipo: "convencional", status: "manutencao", createdAt: "2024-02-01T10:15:00Z" },
  { legacyId: 4, numeroRegistro: "15", vehicleType: "eletrico", tipo: "eletrico", status: "garagem", createdAt: "2024-02-10T11:00:00Z" },
];

const demoDrivers = [
  { legacyId: 1, registrationNumber: "M001", registrationNumberNormalized: "M001", numeroRegistro: "M001", name: "Motorista Demo", nome: "Motorista Demo", phone: "(11) 99999-1111", telefone: "(11) 99999-1111", document: "000.000.000-01", userId: motoristaUid, status: "active", createdAt: "2024-01-10T08:00:00Z" },
  { legacyId: 2, registrationNumber: "M002", registrationNumberNormalized: "M002", numeroRegistro: "M002", name: "Joao Santos", nome: "Joao Santos", phone: "(11) 99999-2222", telefone: "(11) 99999-2222", document: "000.000.000-02", status: "inactive", createdAt: "2024-01-12T09:00:00Z" },
  { legacyId: 3, registrationNumber: "M003", registrationNumberNormalized: "M003", numeroRegistro: "M003", name: "Pedro Lima", nome: "Pedro Lima", document: "000.000.000-03", status: "blocked", createdAt: "2024-01-18T10:00:00Z" },
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

async function findOne(collectionName, field, value) {
  const snapshot = await getDocs(query(collection(db, collectionName), where("companyId", "==", companyId), where(field, "==", value)));
  return snapshot.empty ? null : snapshot.docs[0];
}

async function addOrUpdate(collectionName, existsField, payload, extra = {}) {
  const existing = await findOne(collectionName, existsField, payload[existsField]);
  if (existing) {
    await updateDoc(doc(db, collectionName, existing.id), {
      ...payload,
      ...extra,
      companyId,
      updatedAt: serverTimestamp(),
    });
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
  const wasCreated = await addOrUpdate("vehicles", "numeroRegistro", vehicle, { plate: vehicle.numeroRegistro });
  if (wasCreated) created += 1;
}

for (const driver of demoDrivers) {
  const wasCreated = await addOrUpdate("drivers", "registrationNumber", driver);
  if (wasCreated) created += 1;
}

for (const problem of demoProblems) {
  const wasCreated = await addOrUpdate("issues", "observacao", problem, {
    title: problem.observacao.slice(0, 80),
    description: problem.observacao,
    priority: problem.gravidade,
  });
  if (wasCreated) created += 1;
}

for (const revision of demoRevisions) {
  const wasCreated = await addOrUpdate("maintenance", "observacao", revision, {
    type: revision.tipo,
    description: revision.observacao,
    status: "scheduled",
    scheduledAt: revision.dataProxima,
    completedAt: revision.dataRevisao,
  });
  if (wasCreated) created += 1;
}

console.log(`Demo seed complete. Created ${created} missing fleet records for ${companyId}.`);
console.log(`Gestor demo: ${gestorEmail}`);
console.log(`Motorista demo: ${motoristaEmail}`);
process.exit(0);
