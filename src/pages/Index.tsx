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
import { VehicleDevices } from "@/components/devices/VehicleDevices";
import { ManagerExpress } from "@/components/manager/ManagerExpress";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState(() => user?.role === "lider_garagem" ? "garage" : "dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const canAccessView = (view: string) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (user.role === "gestor") return view !== "backup";
    if (user.role === "lider_garagem") return ["garage", "vehicle-devices", "vehicles", "problems"].includes(view);
    return false;
  };

  const renderContent = () => {
    if (!canAccessView(activeView)) {
      return user?.role === "lider_garagem" ? <GarageOperations /> : <Dashboard />;
    }

    switch (activeView) {
      case "dashboard":
        return <Dashboard />;
      case "manager-express":
        return <ManagerExpress />;
      case "garage":
        return <GarageOperations />;
      case "vehicle-devices":
        return <VehicleDevices />;
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
        {renderContent()}
      </div>
    </div>
  );
};

export default Index;
