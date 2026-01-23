import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Key, 
  ScrollText, 
  LogOut,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminAuth } from '@/admin/hooks/useAdminAuth';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { path: '/admin-panel-secure/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin-panel-secure/licenses', label: 'Licenças', icon: Key },
  { path: '/admin-panel-secure/logs', label: 'Logs', icon: ScrollText },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const { logout } = useAdminAuth();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-6 w-6" />
            <span className="font-semibold">Admin Panel</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={logout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
