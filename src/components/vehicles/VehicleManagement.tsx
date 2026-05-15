import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VEHICLE_TYPES, VEHICLE_TYPE_OPTIONS, getVehicleTypeIcon, getVehicleTypeLabel, normalizeVehicleType } from "@/constants/vehicleTypes";
import { useFleetData } from "@/hooks/useFleetData";
import { useToast } from "@/hooks/use-toast";
import { deleteVehicle, isProblemOpen, upsertVehicle } from "@/services/fleetService";
import type { FleetData, Vehicle } from "@/types/fleet";
import { normalizeRegistration } from "@/utils/localStorage";
import { Activity, AlertTriangle, Car, Edit, History, Home, Plus, Trash2, Wrench } from "lucide-react";

const emptyForm = {
  numeroRegistro: "",
  tipo: VEHICLE_TYPES.CONVENCIONAL as Vehicle["tipo"],
  status: "garagem" as Vehicle["status"],
  currentKm: "",
};

export const VehicleManagement = () => {
  const [data, setData] = useState<FleetData | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [typeFilter, setTypeFilter] = useState<Vehicle["tipo"] | "todos">("todos");
  const [isSaving, setIsSaving] = useState(false);
  const [historyVehicle, setHistoryVehicle] = useState<Vehicle | null>(null);
  const { toast } = useToast();
  const { data: realtimeData, loading, companyId } = useFleetData();

  useEffect(() => {
    if (loading) return;
    setData(realtimeData);
  }, [loading, realtimeData]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingVehicle(null);
    setIsCreateOpen(false);
  };

  const handleCreate = () => {
    setEditingVehicle(null);
    setFormData(emptyForm);
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || isSaving) return;

    const numeroRegistro = normalizeRegistration(formData.numeroRegistro);
    const currentKm = formData.currentKm === "" ? undefined : Number(formData.currentKm);

    if (!numeroRegistro) {
      toast({
        title: "Erro",
        description: "Numero de registro e obrigatorio",
        variant: "destructive",
      });
      return;
    }

    if (currentKm !== undefined && (!Number.isFinite(currentKm) || currentKm < 0)) {
      toast({
        title: "Erro",
        description: "Informe uma quilometragem valida",
        variant: "destructive",
      });
      return;
    }

    const existingVehicle = data.vehicles.find(
      (vehicle) => vehicle.numeroRegistro === numeroRegistro && (!editingVehicle || vehicle.id !== editingVehicle.id),
    );

    if (existingVehicle) {
      toast({
        title: "Erro",
        description: "Ja existe um veiculo com este numero de registro",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingVehicle) {
        await upsertVehicle(companyId, {
          ...editingVehicle,
          numeroRegistro,
          tipo: normalizeVehicleType(formData.tipo),
          vehicleType: normalizeVehicleType(formData.tipo),
          status: formData.status,
          currentKm,
        });
        toast({
          title: "Sucesso",
          description: "Veiculo atualizado com sucesso",
        });
      } else {
        await upsertVehicle(companyId, {
          id: Math.max(0, ...data.vehicles.map((vehicle) => vehicle.id)) + 1,
          numeroRegistro,
          tipo: normalizeVehicleType(formData.tipo),
          vehicleType: normalizeVehicleType(formData.tipo),
          companyId,
          status: formData.status,
          currentKm,
          createdAt: new Date().toISOString(),
        });
        toast({
          title: "Sucesso",
          description: "Veiculo cadastrado com sucesso",
        });
      }
      resetForm();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Nao foi possivel gravar o veiculo no Firestore",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setIsCreateOpen(false);
    setEditingVehicle(vehicle);
    setFormData({
      numeroRegistro: vehicle.numeroRegistro,
      tipo: normalizeVehicleType(vehicle.vehicleType || vehicle.tipo),
      status: vehicle.status,
      currentKm: vehicle.currentKm === undefined ? "" : String(vehicle.currentKm),
    });
  };

  const handleDelete = async (vehicle: Vehicle) => {
    if (!data || isSaving) return;

    if (confirm(`Tem certeza que deseja excluir o veiculo ${vehicle.numeroRegistro}?`)) {
      setIsSaving(true);
      try {
        await deleteVehicle(vehicle);
        toast({
          title: "Sucesso",
          description: "Veiculo excluido com sucesso",
        });
      } catch (error) {
        toast({
          title: "Erro ao excluir",
          description: error instanceof Error ? error.message : "Nao foi possivel excluir o veiculo no Firestore",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const getStatusIcon = (status: Vehicle["status"]) => {
    switch (status) {
      case "operacao": return <Activity className="h-4 w-4 text-success" />;
      case "manutencao": return <Wrench className="h-4 w-4 text-warning" />;
      case "pane_em_rota": return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "aguardando_auxilio": return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "garagem": return <Home className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusClassName = (status: Vehicle["status"]) => {
    switch (status) {
      case "operacao": return "bg-success text-success-foreground hover:bg-success/80";
      case "manutencao": return "bg-warning text-warning-foreground hover:bg-warning/80";
      case "pane_em_rota": return "bg-destructive text-destructive-foreground hover:bg-destructive/80";
      case "aguardando_auxilio": return "bg-warning text-warning-foreground hover:bg-warning/80";
      case "garagem": return "";
    }
  };

  const getStatusLabel = (status: Vehicle["status"]) => {
    switch (status) {
      case "operacao": return "Em Operacao";
      case "manutencao": return "Em Manutencao";
      case "pane_em_rota": return "Pane em Rota";
      case "aguardando_auxilio": return "Aguardando Auxilio";
      case "garagem": return "Na Garagem";
    }
  };

  const getRouteStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Em rota";
      case "finished": return "Finalizada";
      case "canceled": return "Cancelada";
      default: return "Registrada";
    }
  };

  const getHistoryDayLabel = (value: string) => {
    const date = new Date(value);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    if (sameDay(date, today)) return "Hoje";
    if (sameDay(date, yesterday)) return "Ontem";
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  const getTime = (value?: string) => {
    if (!value) return "--:--";
    return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const getUsageDuration = (startedAt: string, finishedAt?: string) => {
    const startTime = new Date(startedAt).getTime();
    const endTime = finishedAt ? new Date(finishedAt).getTime() : Date.now();

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) {
      return finishedAt ? "Tempo indisponivel" : "Em andamento";
    }

    const totalMinutes = Math.max(0, Math.floor((endTime - startTime) / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) return `${minutes}min${finishedAt ? "" : " em andamento"}`;
    if (minutes === 0) return `${hours}h${finishedAt ? "" : " em andamento"}`;
    return `${hours}h ${minutes}min${finishedAt ? "" : " em andamento"}`;
  };

  const renderVehicleForm = (mode: "create" | "edit") => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor={`${mode}-numeroRegistro`}>Numero de Registro</Label>
        <Input
          id={`${mode}-numeroRegistro`}
          placeholder="Ex: 05"
          value={formData.numeroRegistro}
          onChange={(e) => setFormData({ ...formData, numeroRegistro: e.target.value })}
        />
      </div>

      <div>
        <Label>Tipo de Veiculo</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {VEHICLE_TYPE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={normalizeVehicleType(formData.tipo) === option.value ? "default" : "outline"}
              className="flex h-auto flex-col items-center gap-1 py-3"
              onClick={() => setFormData({ ...formData, tipo: option.value })}
            >
              <span className="text-lg">{option.icon}</span>
              <span className="text-xs">{option.label}</span>
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor={`${mode}-status`}>Status</Label>
        <Select value={formData.status} onValueChange={(value: Vehicle["status"]) => setFormData({ ...formData, status: value })}>
          <SelectTrigger id={`${mode}-status`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="garagem">Na Garagem</SelectItem>
            <SelectItem value="operacao">Em Operacao</SelectItem>
            <SelectItem value="manutencao">Em Manutencao</SelectItem>
            <SelectItem value="pane_em_rota">Pane em Rota</SelectItem>
            <SelectItem value="aguardando_auxilio">Aguardando Auxilio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor={`${mode}-currentKm`}>KM atual</Label>
        <Input
          id={`${mode}-currentKm`}
          type="number"
          inputMode="numeric"
          min="0"
          placeholder="Ex: 125430"
          value={formData.currentKm}
          onChange={(e) => setFormData({ ...formData, currentKm: e.target.value })}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isSaving}>
          {isSaving ? "Salvando..." : mode === "edit" ? "Atualizar" : "Cadastrar"}
        </Button>
        <Button type="button" variant="outline" onClick={resetForm}>
          Cancelar
        </Button>
      </div>
    </form>
  );

  if (loading || !data) {
    return <div>Carregando...</div>;
  }

  const filteredVehicles = typeFilter === "todos"
    ? data.vehicles
    : data.vehicles.filter((vehicle) => normalizeVehicleType(vehicle.vehicleType || vehicle.tipo) === typeFilter);

  const selectedVehicleRoutes = historyVehicle
    ? data.routes
      .filter((route) => route.vehicleId === historyVehicle.id)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, 12)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestao de Veiculos</h2>
          <p className="text-muted-foreground">
            Cadastro e controle da frota
          </p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar veiculo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Veiculos Cadastrados ({filteredVehicles.length})
            </div>
            <Select value={typeFilter} onValueChange={(value: Vehicle["tipo"] | "todos") => setTypeFilter(value)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {VEHICLE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.icon} {option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredVehicles.map((vehicle) => {
              const problems = data.problems.filter((problem) => problem.vehicleId === vehicle.id && isProblemOpen(problem.status)).length;

              return (
                <div key={vehicle.firestoreId || vehicle.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getVehicleTypeIcon(vehicle.vehicleType || vehicle.tipo)}</span>
                    {getStatusIcon(vehicle.status)}
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        Veiculo {vehicle.numeroRegistro}
                        <span className="text-sm text-muted-foreground">
                          ({getVehicleTypeLabel(vehicle.vehicleType || vehicle.tipo)})
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant={vehicle.status === "garagem" ? "secondary" : "default"} className={getStatusClassName(vehicle.status)}>
                          {getStatusLabel(vehicle.status)}
                        </Badge>
                        {vehicle.currentKm !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {vehicle.currentKm.toLocaleString("pt-BR")} km
                          </Badge>
                        )}
                        {problems > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {problems} problema{problems !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setHistoryVehicle(vehicle)}>
                      <History className="mr-1 h-4 w-4" />
                      Historico
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(vehicle)} title="Editar veiculo">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(vehicle)} title="Remover veiculo">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {filteredVehicles.length === 0 && data.vehicles.length > 0 && (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum veiculo encontrado para este filtro
              </div>
            )}
            {data.vehicles.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum veiculo cadastrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={(open) => open ? handleCreate() : resetForm()}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Veiculo</DialogTitle>
            <DialogDescription>
              Cadastre um veiculo e, se quiser, informe o KM atual para iniciar o controle operacional.
            </DialogDescription>
          </DialogHeader>
          {renderVehicleForm("create")}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingVehicle} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Veiculo</DialogTitle>
            <DialogDescription>
              Atualize os dados do veiculo sem sair da lista.
            </DialogDescription>
          </DialogHeader>
          {renderVehicleForm("edit")}
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyVehicle} onOpenChange={(open) => !open && setHistoryVehicle(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historico do Veiculo {historyVehicle?.numeroRegistro}</DialogTitle>
            <DialogDescription>
              Ultimas utilizacoes registradas pelas rotas do mobile
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {selectedVehicleRoutes.map((route) => {
              const driver = data.drivers.find((item) => item.id === route.driverId);
              return (
                <div key={route.firestoreId || route.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{getHistoryDayLabel(route.startedAt)}</div>
                      <div className="mt-1 font-semibold">{driver?.nome || "Motorista nao encontrado"}</div>
                      <div className="text-sm text-muted-foreground">
                        {getTime(route.startedAt)} - {route.finishedAt ? getTime(route.finishedAt) : "em andamento"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Tempo total: {getUsageDuration(route.startedAt, route.finishedAt)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        KM: {route.startKm !== undefined ? route.startKm.toLocaleString("pt-BR") : "--"} - {route.endKm !== undefined ? route.endKm.toLocaleString("pt-BR") : "--"}
                        {route.distanceKm !== undefined ? ` (${route.distanceKm.toLocaleString("pt-BR")} km rodados)` : ""}
                      </div>
                    </div>
                    <Badge variant={route.status === "active" ? "default" : "secondary"}>
                      {getRouteStatusLabel(route.status)}
                    </Badge>
                  </div>
                </div>
              );
            })}

            {selectedVehicleRoutes.length === 0 && (
              <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                Nenhuma utilizacao registrada para este veiculo.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
