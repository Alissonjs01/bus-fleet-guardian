import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFleetData } from "@/hooks/useFleetData";
import { useToast } from "@/hooks/use-toast";
import { updateVehicleDeviceStatus, upsertVehicleDevice } from "@/services/fleetService";
import { getDeviceId, getUserAgent } from "@/services/deviceService";
import type { VehicleDevice } from "@/types/fleet";
import { ArrowRightLeft, HardDrive, MapPin, Plus, Radio, RefreshCw, ShieldAlert, Unlink } from "lucide-react";

const DEVICE_STATUS_LABELS: Record<VehicleDevice["status"], string> = {
  active: "Ativo",
  inactive: "Inativo",
  blocked: "Bloqueado",
};

function isOnline(lastSeenAt?: string) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 2 * 60 * 1000;
}

function formatLastSeen(value?: string) {
  if (!value) return "Sem atividade";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function VehicleDevices() {
  const { data, loading, companyId } = useFleetData();
  const { toast } = useToast();
  const [deviceId, setDeviceId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [status, setStatus] = useState<VehicleDevice["status"]>("active");
  const [transferTargets, setTransferTargets] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const currentBrowserDeviceId = getDeviceId();

  const sortedVehicles = useMemo(
    () => [...data.vehicles].sort((a, b) => a.numeroRegistro.localeCompare(b.numeroRegistro, "pt-BR", { numeric: true })),
    [data.vehicles],
  );

  const sortedDevices = useMemo(
    () => [...data.vehicleDevices].sort((a, b) => {
      const aLabel = a.vehicleLabel || a.deviceName || a.deviceId;
      const bLabel = b.vehicleLabel || b.deviceName || b.deviceId;
      return aLabel.localeCompare(bLabel, "pt-BR", { numeric: true });
    }),
    [data.vehicleDevices],
  );

  const resetForm = () => {
    setDeviceId("");
    setDeviceName("");
    setVehicleId("");
    setStatus("active");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const vehicle = data.vehicles.find((item) => String(item.id) === vehicleId);
    const normalizedDeviceId = deviceId.trim();

    if (!normalizedDeviceId || !vehicle) {
      toast({ title: "Dados incompletos", description: "Informe dispositivo e veiculo.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await upsertVehicleDevice(companyId, {
        deviceId: normalizedDeviceId,
        deviceName: deviceName.trim() || normalizedDeviceId,
        vehicleId: vehicle.id,
        vehicleLabel: vehicle.numeroRegistro,
        status,
        userAgent: getUserAgent(),
        deviceInfo: getUserAgent(),
      });
      if (status === "active") {
        await Promise.all(
          data.vehicleDevices
            .filter((device) => device.vehicleId === vehicle.id && device.deviceId !== normalizedDeviceId && device.status === "active")
            .map((device) => updateVehicleDeviceStatus(device, "inactive")),
        );
      }
      toast({ title: "Dispositivo vinculado", description: `Dispositivo vinculado ao veiculo ${vehicle.numeroRegistro}.` });
      resetForm();
    } catch (error) {
      toast({
        title: "Erro ao salvar dispositivo",
        description: error instanceof Error ? error.message : "Nao foi possivel salvar no Firestore.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (device: VehicleDevice, nextStatus: VehicleDevice["status"]) => {
    setIsSaving(true);
    try {
      await updateVehicleDeviceStatus(device, nextStatus);
      toast({ title: "Status atualizado", description: `${device.vehicleLabel}: ${DEVICE_STATUS_LABELS[nextStatus]}.` });
    } catch (error) {
      toast({
        title: "Erro ao atualizar status",
        description: error instanceof Error ? error.message : "Nao foi possivel atualizar o dispositivo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTransfer = async (device: VehicleDevice) => {
    const targetVehicle = data.vehicles.find((vehicle) => String(vehicle.id) === transferTargets[device.deviceId]);
    if (!targetVehicle) {
      toast({ title: "Selecione um veiculo", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await upsertVehicleDevice(companyId, {
        ...device,
        vehicleId: targetVehicle.id,
        vehicleLabel: targetVehicle.numeroRegistro,
        status: "active",
      });
      await Promise.all(
        data.vehicleDevices
          .filter((item) => item.vehicleId === targetVehicle.id && item.deviceId !== device.deviceId && item.status === "active")
          .map((item) => updateVehicleDeviceStatus(item, "inactive")),
      );
      toast({ title: "Dispositivo transferido", description: `${device.deviceName || device.deviceId} agora esta no veiculo ${targetVehicle.numeroRegistro}.` });
      setTransferTargets((current) => ({ ...current, [device.deviceId]: "" }));
    } catch (error) {
      toast({
        title: "Erro ao transferir",
        description: error instanceof Error ? error.message : "Nao foi possivel transferir o dispositivo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlink = async (device: VehicleDevice) => {
    setIsSaving(true);
    try {
      await upsertVehicleDevice(companyId, {
        ...device,
        vehicleId: 0,
        vehicleLabel: "Sem vinculo",
        status: "inactive",
      });
      toast({ title: "Dispositivo desvinculado", description: `${device.deviceName || device.deviceId} ficou inativo e sem veiculo.` });
    } catch (error) {
      toast({
        title: "Erro ao desvincular",
        description: error instanceof Error ? error.message : "Nao foi possivel desvincular o dispositivo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrepareReplacement = (device: VehicleDevice) => {
    setDeviceId("");
    setDeviceName("");
    setVehicleId(device.vehicleId ? String(device.vehicleId) : "");
    setStatus("active");
    toast({ title: "Substituir dispositivo", description: "Informe o novo aparelho e salve no mesmo veiculo." });
  };

  if (loading) return <div>Carregando dispositivos...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dispositivos dos Veiculos</h2>
        <p className="text-muted-foreground">
          Vinculo operacional entre aparelho mobile fixo e veiculo da frota.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Vincular dispositivo
            </CardTitle>
            <CardDescription>
              Use o deviceId do aparelho instalado no veiculo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deviceName">Nome do aparelho</Label>
                <Input
                  id="deviceName"
                  value={deviceName}
                  onChange={(event) => setDeviceName(event.target.value)}
                  placeholder="Ex: Samsung Tab A9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deviceId">Identificacao do dispositivo</Label>
                <Input
                  id="deviceId"
                  value={deviceId}
                  onChange={(event) => setDeviceId(event.target.value)}
                  placeholder="Ex: device-8472"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => setDeviceId(currentBrowserDeviceId)}>
                  Usar este aparelho
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Veiculo</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o veiculo" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedVehicles.map((vehicle) => (
                      <SelectItem key={vehicle.firestoreId || vehicle.id} value={String(vehicle.id)}>
                        Veiculo {vehicle.numeroRegistro}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value: VehicleDevice["status"]) => setStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="blocked">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar vinculo"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Dispositivos vinculados ({sortedDevices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedDevices.map((device) => {
              const vehicle = data.vehicles.find((item) => item.id === device.vehicleId);
              const activeRoute = data.routes.find((route) => route.vehicleId === device.vehicleId && route.status === "active");
              const currentDriver = activeRoute ? data.drivers.find((driver) => driver.id === activeRoute.driverId) : undefined;
              const online = isOnline(device.lastSeenAt);

              return (
                <div key={device.deviceId} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{device.deviceName || "Dispositivo sem nome"}</h3>
                        <Badge className={online ? "bg-success text-success-foreground" : "bg-muted text-foreground"}>
                          {online ? "Online" : "Offline"}
                        </Badge>
                        <Badge variant={device.status === "blocked" ? "destructive" : "secondary"}>
                          {DEVICE_STATUS_LABELS[device.status]}
                        </Badge>
                      </div>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{device.deviceId}</p>
                      <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                        <span>Veiculo vinculado: {vehicle ? `Veiculo ${vehicle.numeroRegistro}` : device.vehicleId ? `Veiculo ${device.vehicleLabel || device.vehicleId}` : "Sem vinculo"}</span>
                        <span>Ultima atividade: {formatLastSeen(device.lastSeenAt)}</span>
                        <span>Motorista atual: {currentDriver?.nome || "Nenhum motorista em rota"}</span>
                        <span>Dispositivo: {device.deviceInfo || "Nao informado"}</span>
                      </div>
                      {device.lastLocation && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {device.lastLocation.latitude.toFixed(5)}, {device.lastLocation.longitude.toFixed(5)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <div className="flex min-w-[220px] gap-2">
                        <Select
                          value={transferTargets[device.deviceId] || ""}
                          onValueChange={(value) => setTransferTargets((current) => ({ ...current, [device.deviceId]: value }))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Transferir para..." />
                          </SelectTrigger>
                          <SelectContent>
                            {sortedVehicles.map((vehicleOption) => (
                              <SelectItem key={vehicleOption.firestoreId || vehicleOption.id} value={String(vehicleOption.id)}>
                                Veiculo {vehicleOption.numeroRegistro}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" onClick={() => handleTransfer(device)} disabled={isSaving || !transferTargets[device.deviceId]}>
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(device, "active")} disabled={isSaving || device.status === "active"}>
                        <Radio className="mr-2 h-4 w-4" />
                        Ativar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(device, "inactive")} disabled={isSaving || device.status === "inactive"}>
                        Inativar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(device, "blocked")} disabled={isSaving || device.status === "blocked"}>
                        <ShieldAlert className="mr-2 h-4 w-4" />
                        Bloquear
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handlePrepareReplacement(device)} disabled={isSaving || !device.vehicleId}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Substituir
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleUnlink(device)} disabled={isSaving || !device.vehicleId}>
                        <Unlink className="mr-2 h-4 w-4" />
                        Desvincular
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {sortedDevices.length === 0 && (
              <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                Nenhum dispositivo de veiculo vinculado.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
