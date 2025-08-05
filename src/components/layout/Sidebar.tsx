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
  Menu,
  X,
} from "lucide-react";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'vehicles', label: 'Veículos', icon: Car },
  { id: 'drivers', label: 'Motoristas', icon: Users },
  { id: 'revisions', label: 'Revisões', icon: ClipboardCheck },
  { id: 'problems', label: 'Problemas', icon: AlertTriangle },
  { id: 'reports', label: 'Relatórios', icon: FileText },
  { id: 'backup', label: 'Backup', icon: HardDrive },
];

export const Sidebar = ({ activeView, onViewChange, isCollapsed, onToggleCollapse }: SidebarProps) => {
  return (
    <div className={cn(
      "bg-card border-r border-border h-screen transition-all duration-300 flex flex-col",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header com botão de toggle */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 shrink-0"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
          
          {!isCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <Car className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-primary truncate">Sistema de Frota</h1>
                <p className="text-xs text-muted-foreground">Gestão Local</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={activeView === item.id ? "secondary" : "ghost"}
              className={cn(
                "w-full transition-all duration-200",
                isCollapsed ? "justify-center p-2" : "justify-start gap-3 px-3",
                activeView === item.id && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              onClick={() => onViewChange(item.id)}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Button>
          );
        })}
      </nav>
    </div>
  );
};