import { useEffect, useState } from 'react';
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
import { normalizeRegistration } from '@/utils/localStorage';
import { captureCurrentLocation } from '@/utils/geolocation';
import { useFleetData } from '@/hooks/useFleetData';
import { getDeviceId } from '@/services/deviceService';

interface TripStartProps {
  onTripStarted: () => void;
  onBack: () => void;
}

export const TripStart = ({ onTripStarted, onBack }: TripStartProps) => {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [startKm, setStartKm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationWarning, setLocationWarning] = useState('');

  const driver = mobileStorage.getCurrentDriver();
  const { data } = useFleetData(driver?.companyId || "demo-company");
  const vehicles = data.vehicles;
  const currentDeviceId = getDeviceId();
  const vehicleDevice = data.vehicleDevices.find((device) => device.deviceId === currentDeviceId && device.status === "active");
  const deviceVehicle = vehicleDevice ? vehicles.find((vehicle) => vehicle.id === vehicleDevice.vehicleId) : undefined;
  const releasedVehicle = vehicles.find((vehicle) =>
    vehicle.status === 'liberado' &&
    (
      (driver?.driverId !== undefined && vehicle.releasedToDriverId === driver.driverId) ||
      normalizeRegistration(vehicle.releasedToDriverNumber || '') === normalizeRegistration(driver?.numeroRegistro || '')
    )
  );
  const streetAvailableVehicles = vehicles.filter((vehicle) => vehicle.status === 'fora_garagem');
  const eligibleVehicles = vehicleDevice
    ? deviceVehicle ? [deviceVehicle] : []
    : releasedVehicle
    ? [releasedVehicle]
    : streetAvailableVehicles;
  const selectedVehicle = vehicles.find((vehicle) => normalizeRegistration(vehicle.numeroRegistro) === normalizeRegistration(vehicleNumber));

  useEffect(() => {
    if (!vehicleNumber && deviceVehicle?.numeroRegistro) {
      setVehicleNumber(deviceVehicle.numeroRegistro);
      return;
    }
    if (!vehicleNumber && releasedVehicle?.numeroRegistro) {
      setVehicleNumber(releasedVehicle.numeroRegistro);
    }
  }, [deviceVehicle?.numeroRegistro, releasedVehicle?.numeroRegistro, vehicleNumber]);

  const handleStartTrip = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedVehicleNumber = normalizeRegistration(vehicleNumber);

    if (!normalizedVehicleNumber) {
      setError('Digite o numero do veiculo');
      return;
    }

    if (!driver) {
      setError('Erro: dados do motorista nao encontrados');
      return;
    }

    if (!selectedVehicle) {
      setError('Veiculo nao encontrado na frota.');
      return;
    }

    const parsedStartKm = Number(startKm);
    if (!Number.isFinite(parsedStartKm) || parsedStartKm < 0) {
      setError('Informe a quilometragem atual do veiculo');
      return;
    }

    if (selectedVehicle?.currentKm !== undefined && parsedStartKm < selectedVehicle.currentKm) {
      setError('Quilometragem menor que o ultimo registro do veiculo.');
      return;
    }

    if (selectedVehicle?.status === 'garagem') {
      setError('Veiculo na garagem precisa ser liberado pelo lider antes de iniciar operacao.');
      return;
    }

    if (vehicleDevice && selectedVehicle.id !== vehicleDevice.vehicleId) {
      setError(`Este dispositivo esta vinculado ao veiculo ${vehicleDevice.vehicleLabel || vehicleDevice.vehicleId}.`);
      return;
    }

    if (selectedVehicle?.status === 'liberado' && !releasedVehicle) {
      setError('Veiculo liberado para outro motorista.');
      return;
    }

    if (selectedVehicle.status !== 'fora_garagem' && selectedVehicle.status !== 'liberado') {
      setError('Veiculo indisponivel para iniciar operacao.');
      return;
    }

    setIsLoading(true);
    setError('');
    setLocationWarning('');

    try {
      const locationResult = await captureCurrentLocation();
      if (locationResult.error) {
        setLocationWarning(locationResult.error.message || 'Localizacao nao capturada. A rota sera registrada sem GPS inicial.');
      }
      const response = await mobileAPI.registrarSaida(
        normalizedVehicleNumber,
        driver.numeroRegistro,
        {
          location: locationResult.location,
          locationError: locationResult.error,
        },
        parsedStartKm,
      );

      if (response.success) {
        const tripSession: TripSession = {
          id: `trip_${Date.now()}`,
          routeId: response.data?.routeId,
          tripId: response.data?.tripId,
          vehicleNumber: normalizedVehicleNumber,
          driverNumber: driver.numeroRegistro,
          startTime: new Date().toISOString(),
          startLocation: response.data?.startLocation || locationResult.location,
          startLocationError: response.data?.startLocationError || locationResult.error,
          startKm: response.data?.startKm ?? parsedStartKm,
          isActive: true,
        };

        mobileStorage.setCurrentTrip(tripSession);
        onTripStarted();
      } else {
        setError(response.message || 'Erro ao iniciar operacao');
      }
    } catch (error) {
      setError('Erro de conexao. Dados salvos localmente.');

      const locationResult = await captureCurrentLocation();
      if (locationResult.error) {
        setLocationWarning(locationResult.error.message || 'Localizacao nao capturada. A rota sera registrada sem GPS inicial.');
      }
      const tripSession: TripSession = {
        id: `trip_${Date.now()}`,
        vehicleNumber: normalizedVehicleNumber,
        driverNumber: driver.numeroRegistro,
        startTime: new Date().toISOString(),
          startLocation: locationResult.location,
          startLocationError: locationResult.error,
          startKm: parsedStartKm,
          isActive: true,
        };

      mobileStorage.setCurrentTrip(tripSession);
      mobileStorage.addToOfflineQueue({
        type: 'saida',
        data: {
          vehicleNumber: normalizedVehicleNumber,
          driverNumber: driver.numeroRegistro,
          startKm: parsedStartKm,
          location: locationResult.location,
          locationError: locationResult.error,
        },
        timestamp: new Date().toISOString(),
      });

      onTripStarted();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileLayout
      title="Iniciar Operacao"
      showBackButton
      onBack={onBack}
    >
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Iniciar Operacao</CardTitle>
            <CardDescription>
              Use um veiculo liberado para voce ou disponivel na rua
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleStartTrip} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Numero do Veiculo</Label>
                <Input
                  id="vehicleNumber"
                  type="text"
                  list="vehicle-options"
                  placeholder="Ex: 05"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  disabled={isLoading || !!releasedVehicle || !!vehicleDevice}
                  className="text-center text-lg font-medium"
                />
                <datalist id="vehicle-options">
                  {eligibleVehicles.map((vehicle) => (
                    <option
                      key={vehicle.firestoreId || vehicle.id}
                      value={vehicle.numeroRegistro}
                    >
                      {vehicle.numeroRegistro}
                    </option>
                  ))}
                </datalist>
                {selectedVehicle?.currentKm !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    Ultimo KM registrado: {selectedVehicle.currentKm.toLocaleString("pt-BR")} km
                  </p>
                )}
                {releasedVehicle && (
                  <p className="text-xs text-info">
                    Veiculo liberado pela garagem para este motorista.
                  </p>
                )}
                {vehicleDevice && (
                  <p className="text-xs text-info">
                    Dispositivo vinculado ao veiculo {vehicleDevice.vehicleLabel || deviceVehicle?.numeroRegistro || vehicleDevice.vehicleId}.
                  </p>
                )}
                {!vehicleDevice && !releasedVehicle && streetAvailableVehicles.length > 0 && (
                  <p className="text-xs text-info">
                    Veiculos disponiveis na rua podem ser assumidos por qualquer motorista ativo.
                  </p>
                )}
                {!vehicleDevice && !releasedVehicle && streetAvailableVehicles.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nao ha veiculo liberado para voce nem veiculo disponivel na rua.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="startKm">Quilometragem atual</Label>
                <Input
                  id="startKm"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="Ex: 125430"
                  value={startKm}
                  onChange={(e) => setStartKm(e.target.value)}
                  disabled={isLoading}
                  className="text-center text-lg font-medium"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {locationWarning && (
                <Alert>
                  <AlertDescription>{locationWarning}</AlertDescription>
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
                      Iniciar Operacao
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
                  Horario: {new Date().toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
};
