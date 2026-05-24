import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { getDeviceId, getUserAgent } from "@/services/deviceService";
import { logout } from "@/services/authService";
import type { AppUser } from "@/types/auth";

const SESSION_ID_KEY = "fleet_session_id";
const HEARTBEAT_MS = 30000;

function getSessionId(userId: string) {
  const existing = sessionStorage.getItem(SESSION_ID_KEY);
  if (existing?.startsWith(`${userId}_`)) return existing;

  const id = `${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  sessionStorage.setItem(SESSION_ID_KEY, id);
  return id;
}

function getDeviceInfo() {
  const userAgent = getUserAgent();
  const browser = userAgent.includes("Edg/")
    ? "Edge"
    : userAgent.includes("Chrome/")
      ? "Chrome"
      : userAgent.includes("Firefox/")
        ? "Firefox"
        : userAgent.includes("Safari/")
          ? "Safari"
          : "Navegador";
  const os = userAgent.includes("Windows")
    ? "Windows"
    : userAgent.includes("Android")
      ? "Android"
      : userAgent.includes("iPhone") || userAgent.includes("iPad")
        ? "iOS"
        : userAgent.includes("Mac")
          ? "macOS"
          : "Dispositivo";

  return { browser, os, userAgent };
}

export function startUserSession(user: AppUser) {
  const sessionId = getSessionId(user.id);
  const sessionRef = doc(db, "userSessions", sessionId);
  const deviceId = getDeviceId();
  const device = getDeviceInfo();
  let stopped = false;

  const initialPayload = {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    role: user.role,
    companyId: user.companyId,
    deviceId,
    browser: device.browser,
    os: device.os,
    userAgent: device.userAgent,
    status: "online",
    createdAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const heartbeatPayload = {
    status: "online",
    lastSeenAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const start = () => setDoc(sessionRef, initialPayload, { merge: true }).catch(() => undefined);
  const touch = () => updateDoc(sessionRef, heartbeatPayload).catch(() => start());

  void start();
  const heartbeat = window.setInterval(() => {
    if (!stopped) void touch();
  }, HEARTBEAT_MS);

  const unsubscribeForceLogout = onSnapshot(sessionRef, (snapshot) => {
    const data = snapshot.data();
    if (!data?.forceLogout || stopped) return;
    stopped = true;
    window.clearInterval(heartbeat);
    void updateDoc(sessionRef, {
      status: "terminated",
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).finally(() => logout());
  });

  const endOnlineSession = () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(heartbeat);
    unsubscribeForceLogout();
    void updateDoc(sessionRef, {
      status: "offline",
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch(() => undefined);
  };

  window.addEventListener("beforeunload", endOnlineSession);

  return () => {
    window.removeEventListener("beforeunload", endOnlineSession);
    endOnlineSession();
  };
}
