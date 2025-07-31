import { ReactNode } from 'react';
import { Wifi, WifiOff, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mobileStorage } from '../utils/storage';

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
  onLogout 
}: MobileLayoutProps) => {
  const currentDriver = mobileStorage.getCurrentDriver();
  const isOnline = navigator.onLine;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      {/* Header */}
      <header className="bg-card/95 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onBack}
                className="p-2"
              >
                ←
              </Button>
            )}
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className="flex items-center gap-1">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* User Info */}
            {currentDriver && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs">
                  <User className="h-3 w-3" />
                  <span className="text-muted-foreground">{currentDriver.numeroRegistro}</span>
                </div>
                
                {onLogout && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onLogout}
                    className="p-1 h-auto"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 pb-8">
        {children}
      </main>

      {/* Bottom spacing for mobile */}
      <div className="h-4" />
    </div>
  );
};