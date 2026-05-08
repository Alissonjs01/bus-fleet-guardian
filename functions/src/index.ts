import { createHash, randomBytes } from "node:crypto";
import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";

admin.initializeApp();

const db = admin.firestore();

type UserRole = "admin" | "gestor" | "motorista";
type LicenseStatus = "active" | "blocked" | "expired" | "pending";

function hashCode(code: string) {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

function generateCode() {
  return randomBytes(12)
    .toString("hex")
    .toUpperCase()
    .match(/.{1,4}/g)!
    .join("-");
}

async function requireManager(uid?: string) {
  if (!uid) throw new HttpsError("unauthenticated", "Autenticação obrigatória");
  const snapshot = await db.doc(`users/${uid}`).get();
  const role = snapshot.get("role");
  if (!["admin", "gestor"].includes(role)) {
    throw new HttpsError("permission-denied", "Permissão insuficiente");
  }
  return snapshot.data()!;
}

async function writeLog(data: Record<string, unknown>) {
  await db.collection("accessLogs").add({
    ...data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export const bootstrapFirstAdmin = onCall(async (request) => {
  const existingAdmins = await db.collection("users").where("role", "==", "admin").limit(1).get();
  if (!existingAdmins.empty) {
    throw new HttpsError("failed-precondition", "O primeiro admin já foi configurado");
  }

  const email = String(request.data.email || "").trim().toLowerCase();
  const password = String(request.data.password || "");
  const name = String(request.data.name || "Administrador").trim();
  const companyName = String(request.data.companyName || "Empresa Demo").trim();
  const userAgent = String(request.data.userAgent || request.rawRequest.get("user-agent") || "");

  if (!email || password.length < 6) {
    throw new HttpsError("invalid-argument", "Email e senha com pelo menos 6 caracteres são obrigatórios");
  }

  const companyRef = db.collection("companies").doc();
  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName: name,
    emailVerified: false,
  });

  await db.runTransaction(async (transaction) => {
    transaction.set(companyRef, {
      name: companyName,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    transaction.set(db.doc(`users/${userRecord.uid}`), {
      name,
      email,
      role: "admin",
      companyId: companyRef.id,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      lastIp: request.rawRequest.ip,
      lastUserAgent: userAgent,
    });
  });

  await writeLog({
    userId: userRecord.uid,
    companyId: companyRef.id,
    action: "first_admin_created",
    ip: request.rawRequest.ip,
    userAgent,
    details: { companyName },
  });

  return { success: true, email };
});

export const createLicenseKey = onCall(async (request) => {
  const manager = await requireManager(request.auth?.uid);
  const code = generateCode();
  const companyRef = db.collection("companies").doc();
  const licenseRef = db.collection("licenseKeys").doc();
  const companyName = String(request.data.companyName || "Empresa Demo");
  const role = (request.data.role || "gestor") as UserRole;
  const maxDevices = Number(request.data.maxDevices || 1);

  await db.runTransaction(async (transaction) => {
    transaction.set(companyRef, {
      name: companyName,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    transaction.set(licenseRef, {
      codeHash: hashCode(code),
      displayCode: `${code.slice(0, 4)}-••••-••••-••••`,
      companyId: companyRef.id,
      companyName,
      role,
      status: "active" satisfies LicenseStatus,
      expiresAt: request.data.expiresAt,
      maxDevices,
      activationsCount: 0,
      accessType: request.data.accessType || "monthly",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: request.auth!.uid,
    });
  });

  await writeLog({
    userId: request.auth!.uid,
    companyId: manager.companyId || null,
    licenseKeyId: licenseRef.id,
    action: "license_created",
    details: { companyName, role, maxDevices },
    ip: request.rawRequest.ip,
    userAgent: request.rawRequest.get("user-agent") || null,
  });

  return {
    success: true,
    code,
    license: {
      id: licenseRef.id,
      key: code,
      status: "active",
      expires_at: request.data.expiresAt,
      max_activations: maxDevices,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
});

export const activateLicenseKey = onCall(async (request) => {
  const code = String(request.data.code || "");
  const deviceId = String(request.data.deviceId || "");
  const userAgent = String(request.data.userAgent || request.rawRequest.get("user-agent") || "");

  if (!code || !deviceId) {
    throw new HttpsError("invalid-argument", "Chave e dispositivo são obrigatórios");
  }

  const query = await db.collection("licenseKeys").where("codeHash", "==", hashCode(code)).limit(1).get();
  if (query.empty) throw new HttpsError("not-found", "Chave inválida");

  const licenseRef = query.docs[0].ref;
  const license = query.docs[0].data();
  const now = Date.now();
  const expiresAt = new Date(license.expiresAt).getTime();

  if (license.status === "blocked") throw new HttpsError("permission-denied", "Chave bloqueada");
  if (license.status === "expired" || expiresAt < now) throw new HttpsError("permission-denied", "Chave expirada");

  const activationQuery = await licenseRef.collection("activations").where("deviceId", "==", deviceId).limit(1).get();
  const activeActivations = await licenseRef.collection("activations").where("status", "==", "active").get();
  if (activationQuery.empty && activeActivations.size >= Number(license.maxDevices || 1)) {
    throw new HttpsError("resource-exhausted", "Limite de dispositivos atingido");
  }

  let uid = request.auth?.uid;
  let email = "";

  if (!uid) {
    email = String(request.data.email || "").trim().toLowerCase();
    const password = String(request.data.password || "");
    const name = String(request.data.name || "Usuário").trim();

    if (!email || password.length < 6) {
      throw new HttpsError("invalid-argument", "Email e senha com pelo menos 6 caracteres são obrigatórios");
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      emailVerified: false,
    });
    uid = userRecord.uid;
  }

  await db.runTransaction(async (transaction) => {
    const activationRef = activationQuery.empty ? licenseRef.collection("activations").doc() : activationQuery.docs[0].ref;
    transaction.set(
      activationRef,
      {
        userId: uid,
        deviceId,
        ip: request.rawRequest.ip,
        userAgent,
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    transaction.set(
      db.doc(`users/${uid}`),
      {
        name: request.data.name || "",
        email,
        role: license.role,
        companyId: license.companyId,
        licenseKeyId: licenseRef.id,
        status: "active",
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        lastIp: request.rawRequest.ip,
        lastUserAgent: userAgent,
      },
      { merge: true },
    );

    transaction.update(licenseRef, {
      activationsCount: admin.firestore.FieldValue.increment(activationQuery.empty ? 1 : 0),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await writeLog({
    userId: uid,
    companyId: license.companyId,
    licenseKeyId: licenseRef.id,
    action: "license_activated",
    ip: request.rawRequest.ip,
    userAgent,
    details: { deviceId },
  });

  return { success: true, email };
});

export const updateLicenseStatus = onCall(async (request) => {
  await requireManager(request.auth?.uid);
  const licenseId = String(request.data.licenseId || "");
  const status = request.data.status as LicenseStatus;

  if (!licenseId || !["active", "blocked", "expired"].includes(status)) {
    throw new HttpsError("invalid-argument", "Status inválido");
  }

  await db.doc(`licenseKeys/${licenseId}`).update({
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await writeLog({
    userId: request.auth!.uid,
    licenseKeyId: licenseId,
    action: "license_status_updated",
    ip: request.rawRequest.ip,
    userAgent: request.rawRequest.get("user-agent") || null,
    details: { status },
  });

  return { success: true };
});

export const resetLicenseActivations = onCall(async (request) => {
  await requireManager(request.auth?.uid);
  const licenseId = String(request.data.licenseId || "");
  if (!licenseId) throw new HttpsError("invalid-argument", "Licença obrigatória");

  const licenseRef = db.doc(`licenseKeys/${licenseId}`);
  const activations = await licenseRef.collection("activations").get();
  const batch = db.batch();

  activations.docs.forEach((snapshot) => {
    batch.update(snapshot.ref, {
      status: "blocked",
      lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  batch.update(licenseRef, {
    activationsCount: 0,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  await writeLog({
    userId: request.auth!.uid,
    licenseKeyId: licenseId,
    action: "license_activations_reset",
    ip: request.rawRequest.ip,
    userAgent: request.rawRequest.get("user-agent") || null,
  });

  return { success: true };
});
