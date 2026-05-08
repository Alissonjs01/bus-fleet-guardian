import { signOut } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";

const RESET_VERSION_KEY = "fleet-session-reset-version";
const CURRENT_RESET_VERSION = "driver-registration-flow-v1";

const LEGACY_SESSION_KEYS = [
  "mobile_current_driver",
  "mobile_current_trip",
  "mobile_pending_problems",
  "mobile_offline_queue",
  "fleet_driver_session",
];

export function resetLegacySessionsOnce() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(RESET_VERSION_KEY) === CURRENT_RESET_VERSION) return;

  LEGACY_SESSION_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  void signOut(auth).catch(() => undefined);
  localStorage.setItem(RESET_VERSION_KEY, CURRENT_RESET_VERSION);
}

export function clearDriverSessionStorage() {
  LEGACY_SESSION_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}
