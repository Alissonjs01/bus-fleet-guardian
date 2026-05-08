import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  initializeAuth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
} from "firebase/auth";
import {
  CACHE_SIZE_UNLIMITED,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC257VfoujWKRjaem7TZPl_TcKQ0Zr3_7o",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gestao-frota-bus.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gestao-frota-bus",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gestao-frota-bus.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "914757900925",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:914757900925:web:03f7943a284a6ec5b8ef14",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-G8S4FXPRED",
};

const missingConfig = Object.entries(firebaseConfig)
  .filter(([key, value]) => key !== "measurementId" && !value)
  .map(([key]) => key);

if (missingConfig.length > 0) {
  console.warn(`Firebase config incompleta: ${missingConfig.join(", ")}`);
}

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = initializeAuth(firebaseApp, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});

export const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    tabManager: persistentMultipleTabManager(),
  }),
});

export const functions = getFunctions(firebaseApp, "us-central1");

export async function initAnalytics() {
  if (!firebaseConfig.measurementId) return null;
  return (await isSupported()) ? getAnalytics(firebaseApp) : null;
}
