import { useEffect, useState } from "react";
import { mobileStorage } from "./utils/storage";
import { MobileDashboard } from "./pages/MobileDashboard";
import { TripStart } from "./pages/TripStart";
import { TripEnd } from "./pages/TripEnd";
import { ProblemReport } from "./pages/ProblemReport";
import { History } from "./pages/History";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/services/authService";

type MobileView = "dashboard" | "trip-start" | "trip-end" | "problem-report" | "history";

export const MobileApp = () => {
  const [currentView, setCurrentView] = useState<MobileView>("dashboard");
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    mobileStorage.setCurrentDriver({
      numeroRegistro: user.id,
      nome: user.name,
      isLoggedIn: true,
    });
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

  return <div className="mobile-app">{renderCurrentView()}</div>;
};
