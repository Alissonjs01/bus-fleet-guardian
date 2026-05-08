import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createCompanyIfMissing, seedInitialFleetData, subscribeFleetData, syncCompanyFleetChanges } from "@/services/fleetService";
import { getFleetData } from "@/utils/localStorage";
import type { FleetData } from "@/types/fleet";
import { useSyncStatus } from "@/hooks/useSyncStatus";

export function useFleetData() {
  const { user } = useAuth();
  const [data, setData] = useState<FleetData>(() => getFleetData());
  const [loading, setLoading] = useState(true);
  const [pendingWrites, setPendingWrites] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const syncStatus = useSyncStatus(pendingWrites, error);
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!user?.companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);

    createCompanyIfMissing(user.companyId)
      .then(() => seedInitialFleetData(user.companyId))
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao preparar dados"));

    return subscribeFleetData(
      user.companyId,
      (fleetData, hasPendingWrites) => {
        setData(fleetData);
        dataRef.current = fleetData;
        setPendingWrites(hasPendingWrites);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, [user?.companyId]);

  useEffect(() => {
    if (!user?.companyId) return;

    const handleLocalChange = (event: Event) => {
      const detail = (event as CustomEvent<FleetData>).detail;
      if (!detail) return;
      syncCompanyFleetChanges(user.companyId, dataRef.current, detail).catch((err) => {
        setError(err instanceof Error ? err.message : "Erro ao sincronizar alterações");
      });
    };

    window.addEventListener("fleet-cache-updated", handleLocalChange);
    return () => window.removeEventListener("fleet-cache-updated", handleLocalChange);
  }, [user?.companyId]);

  return {
    data,
    loading,
    error,
    syncStatus,
    companyId: user?.companyId || "demo-company",
    userId: user?.id || "",
  };
}
