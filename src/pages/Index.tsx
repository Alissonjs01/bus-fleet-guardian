import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { VehicleManagement } from "@/components/vehicles/VehicleManagement";
import { DriverManagement } from "@/components/drivers/DriverManagement";
import { ProblemManagement } from "@/components/problems/ProblemManagement";
import { Revisions } from "@/components/revisions/Revisions";
import { Reports } from "@/components/reports/Reports";
import { Backup } from "@/components/backup/Backup";
import { useFleetData } from "@/hooks/useFleetData";

const Index = () => {
  const [activeView, setActiveView] = useState("dashboard");
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

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <Dashboard />;
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
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex-1 p-6 overflow-auto">
        <div key={`${activeView}-${dataVersion}`}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Index;
