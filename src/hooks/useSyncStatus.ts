import { useEffect, useState } from "react";
import type { SyncStatus } from "@/types/auth";

export function useSyncStatus(pendingWrites = false, error?: string): SyncStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastSyncedAt(new Date());
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  let state: SyncStatus["state"] = "synced";
  if (error) state = "error";
  else if (!isOnline) state = "offline";
  else if (pendingWrites) state = "syncing";
  else state = "synced";

  return {
    state,
    isOnline,
    pendingWrites,
    lastSyncedAt,
    error,
  };
}
