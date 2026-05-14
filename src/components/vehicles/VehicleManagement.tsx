import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Vehicle, FleetData } from "@/types/fleet";
import { normalizeRegistration } from "@/utils/localStorage";
import { VEHICLE_TYPES, VEHICLE_TYPE_OPTIONS, getVehicleTypeIcon, getVehicleTypeLabel, normalizeVehicleType } from "@/constants/vehicleTypes";
import { Car, Plus, Edit, Trash2, Activity, Wrench, Home, History, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFleetData } from "@/hooks/useFleetData";
import { deleteVehicle, isProblemOpen, upsertVehicle } from "@/services/fleetService";

export const VehicleManagement = () => {
  const [data, setData] = useState<FleetData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    numeroRegistro: "",
    tipo: VEHICLE_TYPES.CONVENCIONAL as Vehicle["tipo"],
    status: "garagem" as Vehicle["status"],
  });
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
    setFormData({ numeroRegistro: "", tipo: VEHICLE_TYPES.CONVENCIONAL, status: "garagem" });
    setIsEditing(false);
    setEditingVehicle(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || isSaving) return;

    const numeroRegistro = normalizeRegistration(formData.numeroRegistro);

    if (!numeroRegistro) {
      toast({
        title: "Erro",
        description: "Numero de registro e obrigatorio",
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
      if (isEditing && editingVehicle) {
        await upsertVehicle(companyId, {
          ...editingVehicle,
          numeroRegistro,
          tipo: normalizeVehicleType(formData.tipo),
          vehicleType: normalizeVehicleType(formData.tipo),
          status: formData.status,
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
    setEditingVehicle(vehicle);
    setFormData({
      numeroRegistro: vehicle.numeroRegistro,
      tipo: normalizeVehicleType(vehicle.vehicleType || vehicle.tipo),
      status: vehicle.status,
    });
    setIsEditing(true);
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

  if (loading || !data) {
    return <div>Carregando...</div>;
  }

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
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Gestao de Veiculos</h2>
        <p className="text-muted-foreground">
          Cadastro e controle da frota
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {isEditing ? "Editar Veiculo" : "Novo Veiculo"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="numeroRegistro">Numero de Registro</Label>
                <Input
                  id="numeroRegistro"
                  placeholder="Ex: 05"
                  value={formData.numeroRegistro}
                  onChange={(e) => setFormData({ ...formData, numeroRegistro: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="tipo">Tipo de Veiculo</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {VEHICLE_TYPE_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={normalizeVehicleType(formData.tipo) === option.value ? "default" : "outline"}
                      className="flex flex-col items-center gap-1 h-auto py-3"
                      onClick={() => setFormData({ ...formData, tipo: option.value })}
                    >
                      <span className="text-lg">{option.icon}</span>
                      <span className="text-xs">{option.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: Vehicle["status"]) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
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

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={isSaving}>
                  {isSaving ? "Salvando..." : isEditing ? "Atualizar" : "Cadastrar"}
                </Button>
                {isEditing && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Veiculos Cadastrados ({filteredVehicles.length})
              </div>
              <Select value={typeFilter} onValueChange={(value: Vehicle["tipo"] | "todos") => setTypeFilter(value)}>
                <SelectTrigger className="w-40">
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
                  <div key={vehicle.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getVehicleTypeIcon(vehicle.vehicleType || vehicle.tipo)}</span>
                      {getStatusIcon(vehicle.status)}
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          Veiculo {vehicle.numeroRegistro}
                          <span className="text-sm text-muted-foreground">
                            ({getVehicleTypeLabel(vehicle.vehicleType || vehicle.tipo)})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={vehicle.status === "garagem" ? "secondary" : "default"} className={getStatusClassName(vehicle.status)}>
                            {getStatusLabel(vehicle.status)}
                          </Badge>
                          {problems > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {problems} problema{problems !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setHistoryVehicle(vehicle)}
                      >
                        <History className="h-4 w-4 mr-1" />
                        Historico
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(vehicle)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(vehicle)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {filteredVehicles.length === 0 && data.vehicles.length > 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum veiculo encontrado para este filtro
                </div>
              )}
              {data.vehicles.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum veiculo cadastrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!historyVehicle} onOpenChange={(open) => !open && setHistoryVehicle(null)}>
        <DialogContent className="max-w-lg">
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
