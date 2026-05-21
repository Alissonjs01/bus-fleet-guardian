import { ReactNode } from "react";
import { ArrowLeft, LogOut, Moon, Sun, User, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mobileStorage } from "../utils/storage";
import { useMobileTheme } from "../utils/theme";

interface MobileLayoutProps {
  children: ReactNode;
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  onLogout?: () => void;
}

export const MobileLayout = ({
  children,
  title,
  showBackButton = false,
  onBack,
  onLogout,
}: MobileLayoutProps) => {
  const currentDriver = mobileStorage.getCurrentDriver();
  const isOnline = navigator.onLine;
  const { isDark, toggleTheme } = useMobileTheme();

  return (
    <div className="min-h-screen mobile-surface text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-card/90 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-center gap-3">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="h-9 w-9 shrink-0 p-0"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h1 className="truncate text-lg font-semibold text-foreground">{title}</h1>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-9 w-9 p-0"
              aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
              title={isDark ? "Modo claro" : "Modo escuro"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <div className="hidden items-center gap-1 rounded-full border border-border/70 bg-background/55 px-2.5 py-1 sm:flex">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-success" />
              ) : (
                <WifiOff className="h-4 w-4 text-destructive" />
              )}
              <span className="text-xs text-muted-foreground">
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>

            {currentDriver && (
              <div className="flex items-center gap-1.5">
                <div className="hidden items-center gap-1 rounded-full border border-border/70 bg-background/55 px-2.5 py-1 text-xs sm:flex">
                  <User className="h-3 w-3" />
                  <span className="text-muted-foreground">{currentDriver.numeroRegistro}</span>
                </div>

                {onLogout && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLogout}
                    className="h-9 w-9 p-0"
                    aria-label="Sair"
                    title="Sair"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="p-4 pb-8">{children}</main>

      <div className="h-4" />
    </div>
  );
};
