import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PlayCircle, 
  StopCircle, 
  AlertTriangle, 
  Clock, 
  History,
  RefreshCw
} from 'lucide-react';
import { MobileLayout } from '../components/MobileLayout';
import { mobileStorage } from '../utils/storage';
import { mobileAPI } from '../services/api';

interface MobileDashboardProps {
  onStartTrip: () => void;
  onEndTrip: () => void;
  onViewHistory: () => void;
  onLogout: () => void;
}

export const MobileDashboard = ({ 
  onStartTrip, 
  onEndTrip, 
  onViewHistory, 
  onLogout 
}: MobileDashboardProps) => {
  const [driver] = useState(() => mobileStorage.getCurrentDriver());
  const [currentTrip] = useState(() => mobileStorage.getCurrentTrip());
  const [pendingProblems] = useState(() => mobileStorage.getPendingProblems());
  const [isOnline] = useState(() => navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const handleSync = async () => {
    try {
      await mobileAPI.syncData();
      setLastSync(new Date());
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
    }
  };

  useEffect(() => {
    // Auto-sync quando voltar online
    if (isOnline) {
      handleSync();
    }
  }, [isOnline]);

  return (
    <MobileLayout 
      title="Painel do Motorista" 
      onLogout={onLogout}
    >
      <div className="space-y-6">
        {/* Welcome Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl">
              Bem-vindo, {driver?.nome}
            </CardTitle>
            <CardDescription>
              Registro: {driver?.numeroRegistro}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Trip Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Status da Viagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentTrip?.isActive ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Viagem em andamento</p>
                    <p className="text-sm text-muted-foreground">
                      Veículo: {currentTrip.vehicleNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Início: {new Date(currentTrip.startTime).toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge variant="default" className="bg-green-500">
                    Ativo
                  </Badge>
                </div>
                
                <Button 
                  onClick={onEndTrip} 
                  className="w-full" 
                  size="lg"
                  variant="destructive"
                >
                  <StopCircle className="mr-2 h-5 w-5" />
                  Finalizar Viagem
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-muted-foreground">Nenhuma viagem ativa</p>
                </div>
                
                <Button 
                  onClick={onStartTrip} 
                  className="w-full" 
                  size="lg"
                >
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Iniciar Viagem
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Problems Alert */}
        {pendingProblems.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                Problemas Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-orange-700">
                {pendingProblems.length} problema(s) aguardando sincronização
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            onClick={onViewHistory}
            className="h-20 flex-col"
          >
            <History className="h-6 w-6 mb-2" />
            <span className="text-sm">Histórico</span>
          </Button>

          <Button 
            variant="outline" 
            onClick={handleSync}
            className="h-20 flex-col"
            disabled={!isOnline}
          >
            <RefreshCw className="h-6 w-6 mb-2" />
            <span className="text-sm">Sincronizar</span>
          </Button>
        </div>

        {/* Status Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Status da conexão:</span>
              <Badge variant={isOnline ? "default" : "destructive"}>
                {isOnline ? "Online" : "Offline"}
              </Badge>
            </div>
            
            {lastSync && (
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-muted-foreground">Última sincronização:</span>
                <span className="text-xs">{lastSync.toLocaleTimeString()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
};