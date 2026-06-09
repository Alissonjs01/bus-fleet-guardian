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
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { MobileLayout } from '../components/MobileLayout';
import { mobileStorage } from '../utils/storage';
import { mobileAPI } from '../services/api';
import { useFleetData } from '@/hooks/useFleetData';
import { normalizeRegistration } from '@/utils/localStorage';
import { getDeviceId } from '@/services/deviceService';

interface MobileDashboardProps {
  onStartTrip: () => void;
  onEndTrip: () => void;
  onReportProblem: () => void;
  onViewHistory: () => void;
  onLogout: () => void;
}

export const MobileDashboard = ({ 
  onStartTrip, 
  onEndTrip, 
  onReportProblem,
  onViewHistory, 
  onLogout 
}: MobileDashboardProps) => {
  const [driver] = useState(() => mobileStorage.getCurrentDriver());
  const [currentTrip] = useState(() => mobileStorage.getCurrentTrip());
  const [pendingProblems] = useState(() => mobileStorage.getPendingProblems());
  const [isOnline] = useState(() => navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const { data } = useFleetData(driver?.companyId || 'demo-company');
  const currentDeviceId = getDeviceId();
  const vehicleDevice = data.vehicleDevices.find((device) => device.deviceId === currentDeviceId && device.status === "active");
  const deviceVehicle = vehicleDevice ? data.vehicles.find((vehicle) => vehicle.id === vehicleDevice.vehicleId) : undefined;
  const releasedVehicle = data.vehicles.find((vehicle) =>
    vehicle.status === 'liberado' &&
    (
      (driver?.driverId !== undefined && vehicle.releasedToDriverId === driver.driverId) ||
      normalizeRegistration(vehicle.releasedToDriverNumber || '') === normalizeRegistration(driver?.numeroRegistro || '')
    )
  );
  const streetAvailableVehicles = data.vehicles.filter((vehicle) => vehicle.status === 'fora_garagem');
  const canStartDeviceOperation = !!deviceVehicle && (
    deviceVehicle.status === "fora_garagem" ||
    (
      deviceVehicle.status === "liberado" &&
      (
        (driver?.driverId !== undefined && deviceVehicle.releasedToDriverId === driver.driverId) ||
        normalizeRegistration(deviceVehicle.releasedToDriverNumber || '') === normalizeRegistration(driver?.numeroRegistro || '')
      )
    )
  );
  const canStartOperation = vehicleDevice ? canStartDeviceOperation : !!releasedVehicle || streetAvailableVehicles.length > 0;

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
        <Card className="mobile-premium-card bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl">
              Bem-vindo, {driver?.nome}
            </CardTitle>
            <CardDescription>
              Registro: {driver?.numeroRegistro}
            </CardDescription>
          </CardHeader>
        </Card>

        {vehicleDevice && (
          <Card className="border-info/30 bg-info/10">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-info">Dispositivo do Veiculo</p>
                  {vehicleDevice.deviceName && (
                    <p className="mt-1 text-sm font-semibold">{vehicleDevice.deviceName}</p>
                  )}
                  <p className="mt-1 text-xl font-semibold">
                    Veiculo {deviceVehicle?.numeroRegistro || vehicleDevice.vehicleLabel || vehicleDevice.vehicleId}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Este aparelho opera a rota deste veiculo.
                  </p>
                </div>
                <Badge className="bg-info text-info-foreground">Vinculado</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trip Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Status da Operacao
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentTrip?.isActive ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Operacao em andamento</p>
                    <p className="text-sm text-muted-foreground">
                      Veículo: {currentTrip.vehicleNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Início: {new Date(currentTrip.startTime).toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge variant="default" className="bg-success text-success-foreground">
                    Ativo
                  </Badge>
                </div>
                
                <Button 
                  onClick={onReportProblem}
                  className="w-full"
                  size="lg"
                  variant="outline"
                >
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Criar Relatorio
                </Button>

                <Button 
                  onClick={onEndTrip} 
                  className="w-full" 
                  size="lg"
                  variant="destructive"
                >
                  <StopCircle className="mr-2 h-5 w-5" />
                  Encerrar Operacao
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {releasedVehicle ? (
                  <div className="rounded-lg border border-info/30 bg-info/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 font-medium text-info">
                          <KeyRound className="h-4 w-4" />
                          Veiculo liberado
                        </div>
                        <p className="mt-1 text-2xl font-bold">Veiculo {releasedVehicle.numeroRegistro}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Chave liberada para iniciar rota
                        </p>
                        {releasedVehicle.releaseNotes && (
                          <p className="mt-2 text-sm">{releasedVehicle.releaseNotes}</p>
                        )}
                      </div>
                      <Badge className="bg-info text-info-foreground">Pronto</Badge>
                    </div>
                  </div>
                ) : !vehicleDevice && streetAvailableVehicles.length > 0 ? (
                  <div className="rounded-lg border border-success/30 bg-success/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 font-medium text-success">
                          <KeyRound className="h-4 w-4" />
                          Disponivel na Rua
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {streetAvailableVehicles.length} veiculo(s) podem ser assumidos por motorista ativo
                        </p>
                      </div>
                      <Badge className="bg-success text-success-foreground">Rua</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-muted-foreground">Nenhuma operacao ativa ou veiculo disponivel</p>
                  </div>
                )}
                
                <Button 
                  onClick={onStartTrip} 
                  className="w-full" 
                  size="lg"
                  disabled={!canStartOperation}
                >
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Iniciar Operacao
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Problems Alert */}
        {pendingProblems.length > 0 && (
          <Card className="border-warning/35 bg-warning/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-5 w-5" />
                Relatorios Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-warning">
                {pendingProblems.length} relatorio(s) aguardando sincronizacao
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
