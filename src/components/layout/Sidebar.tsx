import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Car,
  Users,
  ClipboardCheck,
  AlertTriangle,
  FileText,
  HardDrive,
  LayoutDashboard,
} from "lucide-react";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'vehicles', label: 'Veículos', icon: Car },
  { id: 'drivers', label: 'Motoristas', icon: Users },
  { id: 'revisions', label: 'Revisões', icon: ClipboardCheck }, // Nova entrada
  { id: 'problems', label: 'Problemas', icon: AlertTriangle },
  { id: 'reports', label: 'Relatórios', icon: FileText },
  { id: 'backup', label: 'Backup', icon: HardDrive },
];

export const Sidebar = ({ activeView, onViewChange }: SidebarProps) => {
  return (
    <div className="w-64 bg-card border-r border-border h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <Car className="h-6 w-6" />
          Sistema de Frota
        </h1>
        <p className="text-sm text-muted-foreground">Gestão Local</p>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={activeView === item.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3",
                activeView === item.id && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              onClick={() => onViewChange(item.id)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      {/* 
      <div className="absolute bottom-4 left-4 right-4">
        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
          <p className="font-medium">💡 Próximas implementações:</p>
          <ul className="mt-1 space-y-1">
            <li>• Electron.js (Desktop)</li>
            <li>• Servidor Node.js local</li>
            <li>• Comunicação Wi-Fi</li>
            <li>• Backup automático</li>
          </ul>
        </div>
      </div>
      */}
    </div>
  );
};