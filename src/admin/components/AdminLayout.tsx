import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Car,
  Footprints,
  Key,
  LayoutDashboard,
  LogOut,
  Monitor,
  ScrollText,
  Shield,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/admin/hooks/useAdminAuth";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { path: "/admin", label: "Central", icon: LayoutDashboard, description: "Visao geral" },
  { path: "/gestor", label: "Gestao de Frota", icon: Car, description: "Operacional" },
  { path: "/admin/licenses", label: "Acessos", icon: Key, description: "Usuarios" },
  { path: "/admin/manager-access", label: "Solicitacoes", icon: Monitor, description: "Gestores" },
  { path: "/admin/mobile-gate", label: "Mobile Gate", icon: Footprints, description: "Respostas" },
  { path: "/admin/logs", label: "Logs", icon: ScrollText, description: "Auditoria" },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const { logout } = useAdminAuth();

  return (
    <div className="min-h-screen bg-[#07090d] text-foreground">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-white/10 bg-card/80 backdrop-blur-xl lg:flex lg:flex-col">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 shadow-[0_0_30px_rgba(34,197,94,0.12)]">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 font-semibold">
                  Admin Command
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">Controle geral do sistema</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 p-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border px-3 py-3 transition-all duration-200",
                    isActive
                      ? "border-primary/30 bg-primary/15 text-primary shadow-[0_0_26px_rgba(34,197,94,0.12)]"
                      : "border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/[0.04] hover:text-foreground",
                  )}
                >
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                    isActive ? "border-primary/30 bg-primary/10" : "border-white/10 bg-background/40 group-hover:border-white/20",
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="mb-3 rounded-xl border border-white/10 bg-background/40 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Firebase</span>
                <span className="flex items-center gap-1 text-primary">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  online
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
              onClick={logout}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sair
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto">
          <div className="border-b border-white/10 bg-card/50 px-4 py-3 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <Shield className="h-5 w-5 text-primary" />
                Admin Command
              </div>
              <Button size="sm" variant="ghost" onClick={logout}>Sair</Button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs transition-colors",
                      isActive ? "border-primary/30 bg-primary/15 text-primary" : "border-white/10 text-muted-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-44 border-b border-white/5 bg-[linear-gradient(180deg,rgba(34,197,94,0.08),rgba(7,9,13,0))]" />
            <div className="relative">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
