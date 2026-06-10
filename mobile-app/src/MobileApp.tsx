import { useEffect, useState } from "react";
import { mobileStorage } from "./utils/storage";
import { MobileDashboard } from "./pages/MobileDashboard";
import { MobileLogin } from "./pages/MobileLogin";
import { TripStart } from "./pages/TripStart";
import { TripEnd } from "./pages/TripEnd";
import { ProblemReport } from "./pages/ProblemReport";
import { History } from "./pages/History";
import { MobileLayout } from "./components/MobileLayout";
import { mobileAPI } from "./services/api";
import { clearMobileTheme, useMobileTheme } from "./utils/theme";
import { Loader2 } from "lucide-react";

type MobileView = "login" | "dashboard" | "trip-start" | "trip-end" | "problem-report" | "history";

export const MobileApp = () => {
  useMobileTheme();
  const [isRestoringSession, setIsRestoringSession] = useState(() => mobileStorage.isLoggedIn());
  const [currentView, setCurrentView] = useState<MobileView>(() =>
    mobileStorage.isLoggedIn() ? "dashboard" : "login",
  );

  useEffect(() => clearMobileTheme, []);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const storedDriver = mobileStorage.getCurrentDriver();

      if (!storedDriver) {
        mobileStorage.clearCurrentTrip();
        mobileStorage.clearPendingProblems();
        if (isMounted) {
          setCurrentView("login");
          setIsRestoringSession(false);
        }
        return;
      }

      try {
        const response = await mobileAPI.login(storedDriver.numeroRegistro);

        if (!response.success || !response.data) {
          mobileStorage.clearCurrentDriver();
          mobileStorage.clearCurrentTrip();
          mobileStorage.clearPendingProblems();
          if (isMounted) setCurrentView("login");
          return;
        }

        mobileStorage.setCurrentDriver({
          driverId: response.data.driverId,
          numeroRegistro: storedDriver.numeroRegistro,
          nome: response.data.nome,
          firestoreId: response.data.firestoreId,
          companyId: response.data.companyId,
          status: response.data.status,
          isLoggedIn: true,
        });

        if (response.data.activeRoute) {
          mobileStorage.restoreActiveRoute(response.data.activeRoute);
        } else {
          mobileStorage.clearCurrentTrip();
        }

        if (isMounted) setCurrentView("dashboard");
      } catch {
        if (isMounted) setCurrentView(mobileStorage.isLoggedIn() ? "dashboard" : "login");
      } finally {
        if (isMounted) setIsRestoringSession(false);
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isRestoringSession) {
    return (
      <div className="mobile-app">
        <MobileLayout title="Sistema de Frota">
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Restaurando sessao do motorista...</p>
          </div>
        </MobileLayout>
      </div>
    );
  }

  const handleLogout = () => {
    mobileStorage.clearCurrentDriver();
    mobileStorage.clearCurrentTrip();
    mobileStorage.clearPendingProblems();
    setCurrentView("login");
  };

  const handleProblemReported = () => {
    setCurrentView("dashboard");
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case "login":
        return <MobileLogin onLoginSuccess={() => setCurrentView("dashboard")} />;
      case "dashboard":
        return (
          <MobileDashboard
            onStartTrip={() => setCurrentView("trip-start")}
            onEndTrip={() => setCurrentView("trip-end")}
            onReportProblem={() => setCurrentView("problem-report")}
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

  return <div className="mobile-app">{renderCurrentView()}</div>;
};
