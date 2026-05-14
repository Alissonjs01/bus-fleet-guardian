import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createCompanyIfMissing, seedInitialFleetData, subscribeFleetData } from "@/services/fleetService";
import { getFleetData } from "@/utils/localStorage";
import type { FleetData } from "@/types/fleet";

const DEMO_COMPANY_ID = "demo-company";

export function useFleetData(companyIdOverride?: string) {
  const { user, loading: authLoading } = useAuth();
  const activeCompanyId = companyIdOverride || (user?.role === "admin" || user?.role === "gestor" ? DEMO_COMPANY_ID : user?.companyId || DEMO_COMPANY_ID);
  const isPublicFleetSession = !user && !!companyIdOverride;
  const [data, setData] = useState<FleetData>(() => getFleetData());
  const [loading, setLoading] = useState(true);
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (authLoading && !companyIdOverride) {
      setLoading(true);
      return;
    }

    if (!activeCompanyId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const canPrepareCompanyData = !isPublicFleetSession && user?.role === "admin";

    if (canPrepareCompanyData) {
      createCompanyIfMissing(activeCompanyId)
        .then(() => seedInitialFleetData(activeCompanyId))
        .catch((err) => console.warn("[fleet-data] Erro ao preparar dados iniciais:", err));
    }

    return subscribeFleetData(
      activeCompanyId,
      (fleetData) => {
        setData(fleetData);
        dataRef.current = fleetData;
        setLoading(false);
      },
      (err) => {
        console.warn("[fleet-data] Erro em listener realtime:", err);
        setLoading(false);
      },
    );
  }, [activeCompanyId, authLoading, companyIdOverride, isPublicFleetSession, user?.role]);

  return {
    data,
    loading,
    companyId: activeCompanyId || DEMO_COMPANY_ID,
    userId: user?.id || "",
  };
}
