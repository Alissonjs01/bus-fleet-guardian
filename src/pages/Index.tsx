import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { VehicleManagement } from "@/components/vehicles/VehicleManagement";
import { DriverManagement } from "@/components/drivers/DriverManagement";
import { ProblemManagement } from "@/components/problems/ProblemManagement";
import { Revisions } from "@/components/revisions/Revisions";

const Index = () => {
  const [activeView, setActiveView] = useState('dashboard');

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'vehicles':
        return <VehicleManagement />;
      case 'drivers':
        return <DriverManagement />;
      case 'problems':
        return <ProblemManagement />;
      case 'revisions':
        return <Revisions />;
      case 'reports':
        return <div className="p-8 text-center text-muted-foreground">Relatórios - A implementar</div>;
      case 'backup':
        return <div className="p-8 text-center text-muted-foreground">Backup - A implementar</div>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <div className="flex-1 p-6 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default Index;