import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DRIVER_STATUS_LABELS, DRIVER_STATUSES, normalizeDriverStatus } from "@/constants/driverStatus";
import { useFleetData } from "@/hooks/useFleetData";
import { useToast } from "@/hooks/use-toast";
import { deleteDriver, isProblemOpen, upsertDriver } from "@/services/fleetService";
import type { Driver, FleetData, Problem, Route, Vehicle } from "@/types/fleet";
import { normalizeRegistration } from "@/utils/localStorage";
import { AlertTriangle, CheckCircle2, Clock, Edit, History, KeyRound, Phone, PlayCircle, Plus, Trash2, User, Users } from "lucide-react";

const emptyForm = {
  numeroRegistro: "",
  nome: "",
  telefone: "",
  document: "",
  userId: "",
  status: DRIVER_STATUSES.ACTIVE as Driver["status"],
};

type DriverTimelineEventType = "route_start" | "route_end" | "problem" | "vehicle_released";

interface DriverTimelineEvent {
  id: string;
  type: DriverTimelineEventType;
  title: string;
  description: string;
  badge: string;
  timestamp: string;
}

function getTimeValue(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "--:--";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Sem data";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const key = date.toLocaleDateString("pt-BR");
  if (key === today.toLocaleDateString("pt-BR")) return "Hoje";
  if (key === yesterday.toLocaleDateString("pt-BR")) return "Ontem";
  return key;
}

function getVehicleLabel(vehicles: Vehicle[], vehicleId: number) {
  const vehicle = vehicles.find((item) => item.id === vehicleId);
  return vehicle?.numeroRegistro ? `Veiculo ${vehicle.numeroRegistro}` : `Veiculo ${vehicleId}`;
}

function problemLabel(problem: Problem) {
  const labels: Record<Problem["categoria"], string> = {
    eletrica: "Pane eletrica",
    mecanica: "Pane mecanica",
    funilaria: "Funilaria",
    limpeza: "Limpeza",
    pneus: "Pneus",
    outros: "Problema reportado",
  };
  return labels[problem.categoria] || "Problema reportado";
}

function buildDriverTimeline(driver: Driver, data: FleetData) {
  const events: DriverTimelineEvent[] = [];

  data.routes
    .filter((route) => route.driverId === driver.id)
    .forEach((route: Route) => {
      const routeKey = route.firestoreId || String(route.id);
      events.push({
        id: `route-start-${routeKey}`,
        type: "route_start",
        title: "Rota iniciada",
        description: getVehicleLabel(data.vehicles, route.vehicleId),
        badge: route.status === "active" ? "rota em andamento" : "rota iniciada",
        timestamp: route.startedAt,
      });

      if (route.finishedAt) {
        events.push({
          id: `route-end-${routeKey}`,
          type: "route_end",
          title: "Rota finalizada",
          description: getVehicleLabel(data.vehicles, route.vehicleId),
          badge: "rota concluida",
          timestamp: route.finishedAt,
        });
      }
    });

  data.problems
    .filter((problem) => problem.driverId === driver.id)
    .forEach((problem) => {
      events.push({
        id: `problem-${problem.firestoreId || problem.id}`,
        type: "problem",
        title: problemLabel(problem),
        description: `${getVehicleLabel(data.vehicles, problem.vehicleId)} - ${problem.observacao}`,
        badge: problem.routeFirestoreId || problem.routeId ? "pane em rota" : "problema reportado",
        timestamp: problem.createdAt,
      });
    });

  data.vehicles
    .filter((vehicle) => vehicle.releasedToDriverId === driver.id && vehicle.releasedAt)
    .forEach((vehicle) => {
      events.push({
        id: `release-${vehicle.firestoreId || vehicle.id}-${vehicle.releasedAt}`,
        type: "vehicle_released",
        title: "Veiculo liberado",
        description: `Veiculo ${vehicle.numeroRegistro}${vehicle.releasedBy ? ` - por ${vehicle.releasedBy}` : ""}`,
        badge: "veiculo liberado",
        timestamp: vehicle.releasedAt!,
      });
    });

  return events.sort((a, b) => getTimeValue(b.timestamp) - getTimeValue(a.timestamp));
}

function groupTimeline(events: DriverTimelineEvent[]) {
  return events.reduce<Array<{ day: string; events: DriverTimelineEvent[] }>>((groups, event) => {
    const day = formatDay(event.timestamp);
    const group = groups.find((item) => item.day === day);
    if (group) group.events.push(event);
    else groups.push({ day, events: [event] });
    return groups;
  }, []);
}

export const DriverManagement = () => {
  const [data, setData] = useState<FleetData | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [historyDriver, setHistoryDriver] = useState<Driver | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { data: realtimeData, loading, companyId } = useFleetData();
  const timelineEvents = useMemo(
    () => historyDriver && data ? buildDriverTimeline(historyDriver, data) : [],
    [data, historyDriver],
  );
  const groupedTimeline = useMemo(() => groupTimeline(timelineEvents), [timelineEvents]);

  useEffect(() => {
    if (loading) return;
    setData(realtimeData);
  }, [loading, realtimeData]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingDriver(null);
    setIsCreateOpen(false);
  };

  const validateForm = () => {
    const numeroRegistro = normalizeRegistration(formData.numeroRegistro);

    if (!numeroRegistro || !formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "Numero de registro e nome sao obrigatorios",
        variant: "destructive",
      });
      return null;
    }

    const existingDriver = data?.drivers.find((driver) =>
      normalizeRegistration(driver.registrationNumberNormalized || driver.registrationNumber || driver.numeroRegistro) === numeroRegistro &&
      (!editingDriver || driver.id !== editingDriver.id)
    );

    if (existingDriver) {
      toast({
        title: "Erro",
        description: "Ja existe um motorista com este numero de registro",
        variant: "destructive",
      });
      return null;
    }

    return numeroRegistro;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || isSaving) return;

    const numeroRegistro = validateForm();
    if (!numeroRegistro) return;

    setIsSaving(true);

    try {
      if (editingDriver) {
        await upsertDriver(companyId, {
          ...editingDriver,
          numeroRegistro,
          registrationNumber: numeroRegistro,
          registrationNumberNormalized: numeroRegistro,
          nome: formData.nome,
          name: formData.nome,
          telefone: formData.telefone || undefined,
          phone: formData.telefone || undefined,
          document: formData.document || undefined,
          userId: formData.userId || undefined,
          status: normalizeDriverStatus(formData.status),
        });
        toast({
          title: "Sucesso",
          description: "Motorista atualizado com sucesso",
        });
      } else {
        const newDriver: Driver = {
          id: Math.max(0, ...data.drivers.map((driver) => driver.id)) + 1,
          numeroRegistro,
          registrationNumber: numeroRegistro,
          registrationNumberNormalized: numeroRegistro,
          nome: formData.nome,
          name: formData.nome,
          telefone: formData.telefone || undefined,
          phone: formData.telefone || undefined,
          document: formData.document || undefined,
          userId: formData.userId || undefined,
          companyId,
          status: normalizeDriverStatus(formData.status),
          createdAt: new Date().toISOString(),
        };
        await upsertDriver(companyId, newDriver);
        toast({
          title: "Sucesso",
          description: "Motorista cadastrado com sucesso",
        });
      }
      resetForm();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Nao foi possivel gravar o motorista no Firestore",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (driver: Driver) => {
    setIsCreateOpen(false);
    setEditingDriver(driver);
    setFormData({
      numeroRegistro: driver.numeroRegistro,
      nome: driver.nome,
      telefone: driver.telefone || "",
      document: driver.document || "",
      userId: driver.userId || "",
      status: normalizeDriverStatus(driver.status),
    });
  };

  const handleCreate = () => {
    setEditingDriver(null);
    setFormData(emptyForm);
    setIsCreateOpen(true);
  };

  const handleDelete = async (driver: Driver) => {
    if (!data || isSaving) return;

    const hasProblems = data.problems.some((problem) => problem.driverId === driver.id);
    const hasTrips = data.trips.some((trip) => trip.driverId === driver.id);
    const hasRoutes = data.routes.some((route) => route.driverId === driver.id);
    const hasHistory = hasProblems || hasTrips || hasRoutes;

    if (hasHistory && !confirm(`O motorista ${driver.nome} possui historico vinculado. Para manter as ocorrencias e viagens, ele sera inativado em vez de apagado. Continuar?`)) {
      return;
    }

    if (!hasHistory && !confirm(`Tem certeza que deseja excluir o motorista ${driver.nome}?`)) {
      return;
    }

    setIsSaving(true);
    try {
      if (hasHistory) {
        await upsertDriver(companyId, {
          ...driver,
          status: DRIVER_STATUSES.INACTIVE,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await deleteDriver(driver);
      }
      toast({
        title: "Sucesso",
        description: hasHistory ? "Motorista inativado e historico mantido" : "Motorista excluido com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro ao remover",
        description: error instanceof Error ? error.message : "Nao foi possivel atualizar o motorista no Firestore",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getDriverVehicleLabel = (driver: Driver | null) => {
    if (!driver || !data) return "";

    const releasedVehicle = data.vehicles.find((vehicle) =>
      vehicle.status === "liberado" &&
      (
        vehicle.releasedToDriverId === driver.id ||
        normalizeRegistration(vehicle.releasedToDriverNumber || "") === normalizeRegistration(driver.numeroRegistro)
      )
    );
    if (releasedVehicle) return `Veiculo ${releasedVehicle.numeroRegistro} liberado`;

    const activeRoute = data.routes.find((route) => route.driverId === driver.id && route.status === "active");
    if (!activeRoute) return "";

    const vehicle = data.vehicles.find((item) => item.id === activeRoute.vehicleId);
    return vehicle?.numeroRegistro ? `Veiculo ${vehicle.numeroRegistro}` : `Veiculo ${activeRoute.vehicleId}`;
  };

  const getTimelineIcon = (type: DriverTimelineEventType) => {
    if (type === "route_start") return <PlayCircle className="h-4 w-4 text-success" />;
    if (type === "route_end") return <CheckCircle2 className="h-4 w-4 text-primary" />;
    if (type === "vehicle_released") return <KeyRound className="h-4 w-4 text-info" />;
    return <AlertTriangle className="h-4 w-4 text-warning" />;
  };

  const getTimelineBadgeVariant = (type: DriverTimelineEventType) => {
    if (type === "problem") return "destructive" as const;
    if (type === "route_end") return "secondary" as const;
    return "outline" as const;
  };

  const renderDriverForm = (mode: "create" | "edit") => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor={`${mode}-numeroRegistro`}>Numero de Registro *</Label>
        <Input
          id={`${mode}-numeroRegistro`}
          placeholder="Ex: M001"
          value={formData.numeroRegistro}
          onChange={(e) => setFormData({ ...formData, numeroRegistro: e.target.value })}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Usado como login no app do motorista
        </p>
      </div>

      <div>
        <Label htmlFor={`${mode}-nome`}>Nome Completo *</Label>
        <Input
          id={`${mode}-nome`}
          placeholder="Nome do motorista"
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor={`${mode}-telefone`}>Telefone (opcional)</Label>
        <Input
          id={`${mode}-telefone`}
          placeholder="(11) 99999-9999"
          value={formData.telefone}
          onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor={`${mode}-document`}>Documento (opcional)</Label>
        <Input
          id={`${mode}-document`}
          placeholder="CPF/RG"
          value={formData.document}
          onChange={(e) => setFormData({ ...formData, document: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor={`${mode}-userId`}>Firebase UID (opcional)</Label>
        <Input
          id={`${mode}-userId`}
          placeholder="UID do usuario autenticado"
          value={formData.userId}
          onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor={`${mode}-status`}>Status</Label>
        <Select value={formData.status} onValueChange={(value: Driver["status"]) => setFormData({ ...formData, status: value })}>
          <SelectTrigger id={`${mode}-status`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(DRIVER_STATUSES).map((status) => (
              <SelectItem key={status} value={status}>{DRIVER_STATUS_LABELS[status]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {mode === "edit" && getDriverVehicleLabel(editingDriver) && (
        <div>
          <Label>Veiculo vinculado</Label>
          <div className="mt-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
            {getDriverVehicleLabel(editingDriver)}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isSaving}>
          {isSaving ? "Salvando..." : mode === "edit" ? "Atualizar" : "Cadastrar"}
        </Button>
        {(mode === "edit" || mode === "create") && (
          <Button type="button" variant="outline" onClick={resetForm}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );

  if (loading || !data) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestao de Motoristas</h2>
          <p className="text-muted-foreground">
            Cadastro e controle dos motoristas
          </p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar motorista
        </Button>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Motoristas Cadastrados ({data.drivers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.drivers.map((driver) => {
                const activeProblems = data.problems.filter((problem) => problem.driverId === driver.id && isProblemOpen(problem.status)).length;
                const totalProblems = data.problems.filter((problem) => problem.driverId === driver.id).length;
                const releasedVehicle = data.vehicles.find((vehicle) =>
                  vehicle.status === "liberado" &&
                  (
                    vehicle.releasedToDriverId === driver.id ||
                    normalizeRegistration(vehicle.releasedToDriverNumber || "") === normalizeRegistration(driver.numeroRegistro)
                  )
                );
                const activeRoute = data.routes.find((route) => route.driverId === driver.id && route.status === "active");
                const activeRouteVehicle = activeRoute ? data.vehicles.find((vehicle) => vehicle.id === activeRoute.vehicleId) : undefined;

                return (
                  <div key={driver.firestoreId || driver.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <User className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{driver.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          Registro: {driver.numeroRegistro}
                        </div>
                        <Badge variant={driver.status === "blocked" ? "destructive" : driver.status === "on_route" ? "default" : "secondary"} className="mt-1 text-xs">
                          {DRIVER_STATUS_LABELS[normalizeDriverStatus(driver.status)]}
                        </Badge>
                        {driver.telefone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {driver.telefone}
                          </div>
                        )}
                        <div className="mt-1 flex gap-2">
                          {releasedVehicle && (
                            <Badge className="bg-info text-info-foreground text-xs">
                              Veiculo {releasedVehicle.numeroRegistro} liberado
                            </Badge>
                          )}
                          {activeRouteVehicle && (
                            <Badge className="bg-success text-success-foreground text-xs">
                              Veiculo {activeRouteVehicle.numeroRegistro} em rota
                            </Badge>
                          )}
                          {activeProblems > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {activeProblems} problema{activeProblems !== 1 ? "s" : ""} ativo{activeProblems !== 1 ? "s" : ""}
                            </Badge>
                          )}
                          {totalProblems > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {totalProblems} total
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setHistoryDriver(driver)}
                        title="Historico operacional"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(driver)}
                        title="Editar motorista"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(driver)}
                        title="Remover motorista"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {data.drivers.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  Nenhum motorista cadastrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={(open) => open ? handleCreate() : resetForm()}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Motorista</DialogTitle>
            <DialogDescription>
              Cadastre um motorista para liberar o acesso operacional no mobile.
            </DialogDescription>
          </DialogHeader>
          {renderDriverForm("create")}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingDriver} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Motorista</DialogTitle>
            <DialogDescription>
              Atualize os dados do motorista sem sair da lista.
            </DialogDescription>
          </DialogHeader>
          {renderDriverForm("edit")}
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyDriver} onOpenChange={(open) => !open && setHistoryDriver(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historico operacional</DialogTitle>
            <DialogDescription>
              {historyDriver?.nome} - Registro {historyDriver?.numeroRegistro}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {groupedTimeline.length > 0 ? (
              groupedTimeline.map((group) => (
                <section key={group.day} className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {group.day}
                  </div>

                  <div className="space-y-3">
                    {group.events.map((event) => (
                      <div key={event.id} className="rounded-lg border p-4">
                        <div className="flex gap-3">
                          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                            {getTimelineIcon(event.type)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-semibold leading-tight">{event.title}</h3>
                                <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                              </div>
                              <span className="shrink-0 text-sm font-medium">{formatTime(event.timestamp)}</span>
                            </div>

                            <Badge className="mt-3" variant={getTimelineBadgeVariant(event.type)}>
                              {event.badge}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="rounded-lg border p-8 text-center">
                <History className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Nenhuma atividade encontrada</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rotas iniciadas, finalizadas, problemas e liberacoes de veiculo aparecem aqui em tempo real.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
