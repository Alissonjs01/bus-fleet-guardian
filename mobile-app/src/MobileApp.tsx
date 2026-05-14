import { useEffect, useState } from "react";
import { mobileStorage } from "./utils/storage";
import { MobileDashboard } from "./pages/MobileDashboard";
import { MobileLogin } from "./pages/MobileLogin";
import { TripStart } from "./pages/TripStart";
import { TripEnd } from "./pages/TripEnd";
import { ProblemReport } from "./pages/ProblemReport";
import { History } from "./pages/History";
import { useFleetData } from "@/hooks/useFleetData";

type MobileView = "login" | "dashboard" | "trip-start" | "trip-end" | "problem-report" | "history";

export const MobileApp = () => {
  const [currentView, setCurrentView] = useState<MobileView>(() =>
    mobileStorage.isLoggedIn() ? "dashboard" : "login",
  );

  useFleetData("demo-company");

  useEffect(() => {
    if (!mobileStorage.isLoggedIn()) {
      setCurrentView("login");
    }
  }, []);

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
