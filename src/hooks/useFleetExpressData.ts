import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeFleetExpressData, type FleetExpressData } from "@/services/fleetService";

const DEMO_COMPANY_ID = "demo-company";

const emptyExpressData: FleetExpressData = {
  vehicles: [],
  drivers: [],
  problems: [],
  routes: [],
  vehicleDevices: [],
};

export function useFleetExpressData(companyIdOverride?: string) {
  const { user, loading: authLoading } = useAuth();
  const activeCompanyId = companyIdOverride || (user?.role === "admin" || user?.role === "gestor" ? DEMO_COMPANY_ID : user?.companyId || DEMO_COMPANY_ID);
  const [data, setData] = useState<FleetExpressData>(emptyExpressData);
  const [loading, setLoading] = useState(true);
  const [pendingWrites, setPendingWrites] = useState(false);

  useEffect(() => {
    if (authLoading && !companyIdOverride) {
      setLoading(true);
      return undefined;
    }

    if (!activeCompanyId) {
      setData(emptyExpressData);
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    return subscribeFleetExpressData(
      activeCompanyId,
      (fleetData, hasPendingWrites) => {
        setData(fleetData);
        setPendingWrites(hasPendingWrites);
        setLoading(false);
      },
      (error) => {
        console.warn("[fleet-express] Erro em listener realtime:", error);
        setLoading(false);
      },
    );
  }, [activeCompanyId, authLoading, companyIdOverride]);

  return useMemo(() => ({
    data,
    loading,
    pendingWrites,
    companyId: activeCompanyId || DEMO_COMPANY_ID,
  }), [activeCompanyId, data, loading, pendingWrites]);
}
