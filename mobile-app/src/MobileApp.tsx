import { useEffect, useState } from "react";
import { mobileStorage } from "./utils/storage";
import { MobileDashboard } from "./pages/MobileDashboard";
import { TripStart } from "./pages/TripStart";
import { TripEnd } from "./pages/TripEnd";
import { ProblemReport } from "./pages/ProblemReport";
import { History } from "./pages/History";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/services/authService";
import { useFleetData } from "@/hooks/useFleetData";
import { getDriverForUser } from "@/services/driverService";
import { DRIVER_STATUSES } from "@/constants/driverStatus";
import { MobileLayout } from "./components/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Driver } from "@/types/fleet";

type MobileView = "dashboard" | "trip-start" | "trip-end" | "problem-report" | "history";

export const MobileApp = () => {
  const [currentView, setCurrentView] = useState<MobileView>("dashboard");
  const [driverRecord, setDriverRecord] = useState<Driver | null>(null);
  const [driverLoading, setDriverLoading] = useState(true);
  const [driverMessage, setDriverMessage] = useState("");
  const { user } = useAuth();
  useFleetData();

  useEffect(() => {
    let mounted = true;

    async function loadDriver() {
      if (!user) {
        setDriverLoading(false);
        return;
      }

      if (user.role !== "motorista") {
        setDriverMessage("Este acesso mobile é exclusivo para motoristas.");
        setDriverLoading(false);
        return;
      }

      const driver = await getDriverForUser(user).catch(() => null);
      if (!mounted) return;

      if (!driver) {
        setDriverMessage("Seu cadastro de motorista ainda não foi liberado pelo gestor.");
        setDriverLoading(false);
        return;
      }

      if (driver.status === DRIVER_STATUSES.BLOCKED) {
        setDriverMessage("Seu acesso de motorista está bloqueado. Procure o gestor da frota.");
        setDriverLoading(false);
        return;
      }

      setDriverRecord(driver);
      mobileStorage.setCurrentDriver({
        numeroRegistro: driver.registrationNumber,
        nome: driver.name,
        firestoreId: driver.firestoreId,
        userId: driver.userId,
        companyId: driver.companyId,
        status: driver.status,
        isLoggedIn: true,
      });
      setDriverLoading(false);
    }

    void loadDriver();
    return () => {
      mounted = false;
    };
  }, [user]);

  const handleLogout = () => {
    mobileStorage.clearCurrentDriver();
    mobileStorage.clearCurrentTrip();
    mobileStorage.clearPendingProblems();
    void logout();
  };

  const handleProblemReported = () => {
    const hasActiveTrip = mobileStorage.hasActiveTrip();
    setCurrentView(hasActiveTrip ? "trip-end" : "dashboard");
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <MobileDashboard
            onStartTrip={() => setCurrentView("trip-start")}
            onEndTrip={() => setCurrentView("trip-end")}
            onViewHistory={() => setCurrentView("history")}
            onLogout={handleLogout}
          />
        );
      case "trip-start":
        return <TripStart onTripStarted={() => setCurrentView("dashboard")} onBack={() => setCurrentView("dashboard")} />;
      case "trip-end":
        return (
          <TripEnd
            onTripEnded={() => setCurrentView("dashboard")}
            onReportProblem={() => setCurrentView("problem-report")}
            onBack={() => setCurrentView("dashboard")}
          />
        );
      case "problem-report":
        return (
          <ProblemReport
            onProblemReported={handleProblemReported}
            onBack={() => setCurrentView(mobileStorage.hasActiveTrip() ? "trip-end" : "dashboard")}
          />
        );
      case "history":
        return <History onBack={() => setCurrentView("dashboard")} />;
      default:
        return null;
    }
  };

  if (driverLoading) {
    return (
      <MobileLayout title="Painel do Motorista">
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Validando cadastro do motorista...</CardContent>
        </Card>
      </MobileLayout>
    );
  }

  if (driverMessage) {
    return (
      <MobileLayout title="Painel do Motorista" onLogout={handleLogout}>
        <Card>
          <CardHeader>
            <CardTitle>Acesso indisponível</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{driverMessage}</p>
            <Button className="w-full" variant="outline" onClick={handleLogout}>Sair</Button>
          </CardContent>
        </Card>
      </MobileLayout>
    );
  }

  if (!driverRecord) return null;

  return <div className="mobile-app">{renderCurrentView()}</div>;
};
