const DEVICE_ID_KEY = "fleet_device_id";

export function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID ? crypto.randomUUID() : `device_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

export function getUserAgent(): string {
  return navigator.userAgent || "unknown";
}

export function isMobileViewport(): boolean {
  return window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
}
