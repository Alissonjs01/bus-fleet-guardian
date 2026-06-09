import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Bus, Shield } from 'lucide-react';
import { mobileAPI } from '../services/api';
import { mobileStorage } from '../utils/storage';
import { MobileLayout } from '../components/MobileLayout';
import type { MobileDriver } from '../types/mobile';
import { useFleetData } from '@/hooks/useFleetData';
import { getDeviceId } from '@/services/deviceService';
import { Badge } from '@/components/ui/badge';

interface MobileLoginProps {
  onLoginSuccess: () => void;
}

export const MobileLogin = ({ onLoginSuccess }: MobileLoginProps) => {
  const [numeroRegistro, setNumeroRegistro] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { data } = useFleetData("demo-company");
  const currentDeviceId = getDeviceId();
  const vehicleDevice = data.vehicleDevices.find((device) => device.deviceId === currentDeviceId && device.status === "active");
  const deviceVehicle = vehicleDevice ? data.vehicles.find((vehicle) => vehicle.id === vehicleDevice.vehicleId) : undefined;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!numeroRegistro.trim()) {
      setError('Digite seu número de registro');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await mobileAPI.login(numeroRegistro.trim());
      
      if (response.success && response.data) {
        const driver: MobileDriver = {
          driverId: response.data.driverId,
          numeroRegistro: numeroRegistro.trim(),
          nome: response.data.nome,
          firestoreId: response.data.firestoreId,
          companyId: response.data.companyId,
          status: response.data.status,
          isLoggedIn: true,
        };

        if (response.data.activeRoute) {
          mobileStorage.setCurrentDriver(driver);
          mobileStorage.restoreActiveRoute(response.data.activeRoute);
          onLoginSuccess();
          return;
        }

        mobileStorage.setCurrentDriver(driver);
        
        onLoginSuccess();
      } else {
        setError(response.message || 'Número de registro não encontrado');
      }
    } catch (error) {
      setError('Erro de conexão. Verifique a rede Wi-Fi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileLayout title="Sistema de Frota">
      <div className="max-w-md mx-auto mt-8">
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Bus className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Login Motorista</CardTitle>
              <CardDescription>
                Digite seu número de registro para acessar o sistema
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {vehicleDevice && (
              <div className="mb-4 rounded-lg border border-info/30 bg-info/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-info">Dispositivo do Veiculo</p>
                    {vehicleDevice.deviceName && (
                      <p className="text-sm font-semibold">{vehicleDevice.deviceName}</p>
                    )}
                    <p className="text-sm font-semibold">
                      Veiculo {deviceVehicle?.numeroRegistro || vehicleDevice.vehicleLabel || vehicleDevice.vehicleId}
                    </p>
                  </div>
                  <Badge className="bg-info text-info-foreground">Vinculado</Badge>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="numeroRegistro">Número de Registro</Label>
                <Input
                  id="numeroRegistro"
                  type="text"
                  placeholder="Ex: M001"
                  value={numeroRegistro}
                  onChange={(e) => setNumeroRegistro(e.target.value)}
                  disabled={isLoading}
                  className="text-center text-lg font-medium"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Sistema seguro para motoristas autorizados</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
};
