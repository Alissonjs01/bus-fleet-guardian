import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Bus, MapPin } from 'lucide-react';
import { MobileLayout } from '../components/MobileLayout';
import { mobileStorage } from '../utils/storage';
import { mobileAPI } from '../services/api';
import { TripSession } from '../types/mobile';

interface TripStartProps {
  onTripStarted: () => void;
  onBack: () => void;
}

export const TripStart = ({ onTripStarted, onBack }: TripStartProps) => {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const driver = mobileStorage.getCurrentDriver();

  const handleStartTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vehicleNumber.trim()) {
      setError('Digite o número do veículo');
      return;
    }

    if (!driver) {
      setError('Erro: dados do motorista não encontrados');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await mobileAPI.registrarSaida(
        vehicleNumber.trim(),
        driver.numeroRegistro
      );
      
      if (response.success) {
        // Criar sessão da viagem
        const tripSession: TripSession = {
          id: `trip_${Date.now()}`,
          vehicleNumber: vehicleNumber.trim(),
          driverNumber: driver.numeroRegistro,
          startTime: new Date().toISOString(),
          isActive: true,
        };
        
        mobileStorage.setCurrentTrip(tripSession);
        onTripStarted();
      } else {
        setError(response.message || 'Erro ao registrar saída');
      }
    } catch (error) {
      setError('Erro de conexão. Dados salvos localmente.');
      
      // Salvar offline
      const tripSession: TripSession = {
        id: `trip_${Date.now()}`,
        vehicleNumber: vehicleNumber.trim(),
        driverNumber: driver.numeroRegistro,
        startTime: new Date().toISOString(),
        isActive: true,
      };
      
      mobileStorage.setCurrentTrip(tripSession);
      mobileStorage.addToOfflineQueue({
        type: 'saida',
        data: { vehicleNumber: vehicleNumber.trim(), driverNumber: driver.numeroRegistro },
        timestamp: new Date().toISOString(),
      });
      
      onTripStarted();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileLayout 
      title="Iniciar Viagem" 
      showBackButton 
      onBack={onBack}
    >
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Registrar Saída</CardTitle>
            <CardDescription>
              Digite o número do veículo para iniciar a viagem
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleStartTrip} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Número do Veículo</Label>
                <Input
                  id="vehicleNumber"
                  type="text"
                  placeholder="Ex: 05"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  disabled={isLoading}
                  className="text-center text-lg font-medium"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Bus className="mr-2 h-4 w-4" />
                      Iniciar Viagem
                    </>
                  )}
                </Button>

                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={onBack}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </div>
            </form>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="text-sm space-y-1">
                <p className="font-medium">Motorista: {driver?.nome}</p>
                <p className="text-muted-foreground">Registro: {driver?.numeroRegistro}</p>
                <p className="text-xs text-muted-foreground">
                  Horário: {new Date().toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
};