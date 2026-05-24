import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { VehicleManagement } from "@/components/vehicles/VehicleManagement";
import { DriverManagement } from "@/components/drivers/DriverManagement";
import { ProblemManagement } from "@/components/problems/ProblemManagement";
import { Revisions } from "@/components/revisions/Revisions";
import { Reports } from "@/components/reports/Reports";
import { Backup } from "@/components/backup/Backup";
import { GarageOperations } from "@/components/garage/GarageOperations";
import { useFleetData } from "@/hooks/useFleetData";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState(() => user?.role === "lider_garagem" ? "garage" : "dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const { data } = useFleetData();
  const dataVersion = [
    data.vehicles.length,
    data.drivers.length,
    data.problems.length,
    data.revisions.length,
    data.trips.length,
    data.routes.length,
    data.vehicles.map((vehicle) => `${vehicle.id}:${vehicle.status}`).join("|"),
    data.drivers.map((driver) => `${driver.id}:${driver.status}`).join("|"),
  ].join("-");

  const canAccessView = (view: string) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (user.role === "gestor") return view !== "backup";
    if (user.role === "lider_garagem") return ["garage", "vehicles", "problems"].includes(view);
    return false;
  };

  const renderContent = () => {
    if (!canAccessView(activeView)) {
      return user?.role === "lider_garagem" ? <GarageOperations /> : <Dashboard />;
    }

    switch (activeView) {
      case "dashboard":
        return <Dashboard />;
      case "garage":
        return <GarageOperations />;
      case "vehicles":
        return <VehicleManagement />;
      case "drivers":
        return <DriverManagement />;
      case "problems":
        return <ProblemManagement />;
      case "revisions":
        return <Revisions />;
      case "reports":
        return <Reports />;
      case "backup":
        return <Backup />;
      default:
        return user?.role === "lider_garagem" ? <GarageOperations /> : <Dashboard />;
    }
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div key={`${activeView}-${dataVersion}`}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Index;
