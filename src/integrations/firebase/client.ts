import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
  type Auth,
} from "firebase/auth";
import {
  CACHE_SIZE_UNLIMITED,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getFunctions } from "firebase/functions";

function requiredEnv(name: string) {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }
  return value;
}

export const firebaseConfig = {
  apiKey: requiredEnv("VITE_FIREBASE_API_KEY"),
  authDomain: requiredEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: requiredEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: requiredEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requiredEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: requiredEnv("VITE_FIREBASE_APP_ID"),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

function createAuth(): Auth {
  try {
    return initializeAuth(firebaseApp, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch (error) {
    console.warn("Firebase Auth usando inicialização padrão.", error);
    return getAuth(firebaseApp);
  }
}

function createFirestore(): Firestore {
  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (error) {
    console.warn("Firestore offline cache indisponível; usando modo padrão.", error);
    return getFirestore(firebaseApp);
  }
}

export const auth = createAuth();
export const db = createFirestore();

export const functions = getFunctions(firebaseApp, "us-central1");

export async function initAnalytics() {
  if (!firebaseConfig.measurementId) return null;
  return (await isSupported()) ? getAnalytics(firebaseApp) : null;
}
