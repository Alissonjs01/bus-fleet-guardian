import { Badge } from "@/components/ui/badge";
import type { SyncStatus } from "@/types/auth";

const labels: Record<SyncStatus["state"], string> = {
  online: "Online",
  offline: "Offline",
  syncing: "Sincronizando",
  synced: "Sincronizado",
  error: "Erro",
};

export function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const variant = status.state === "offline" || status.state === "error" ? "destructive" : "secondary";
  return <Badge variant={variant}>{labels[status.state]}</Badge>;
}
