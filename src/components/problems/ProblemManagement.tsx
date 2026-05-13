import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Problem, Route } from "@/types/fleet";
import { AlertTriangle, CheckCircle, Clock, User, Car, Eye, MapPin, Route as RouteIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/utils/dateFormat";
import { useFleetData } from "@/hooks/useFleetData";
import { isProblemOpen, normalizeProblemStatus, updateProblem } from "@/services/fleetService";
import { getMapUrl } from "@/utils/geolocation";

const PROBLEM_STATUS_LABELS: Record<Problem["status"], string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  resolvida: "Resolvida",
  cancelada: "Cancelada",
};

const PROBLEM_CATEGORY_LABELS: Record<Problem["categoria"], string> = {
  eletrica: "Eletrica",
  mecanica: "Mecanica",
  funilaria: "Funilaria",
  limpeza: "Limpeza",
  pneus: "Pneus",
  outros: "Outros",
};

const PROBLEM_PRIORITY_LABELS: Record<Problem["gravidade"], string> = {
  baixa: "Baixa",
  media: "Media",
  alta: "Alta",
  critica: "Critica",
};

function getLinkedRoute(problem: Problem, routes: Route[]) {
  return routes.find((route) => {
    if (problem.routeFirestoreId && route.firestoreId === problem.routeFirestoreId) return true;
    if (problem.routeId && route.id === problem.routeId) return true;
    return route.status === "active" && route.vehicleId === problem.vehicleId && route.driverId === problem.driverId;
  });
}

export const ProblemManagement = () => {
  const [filter, setFilter] = useState({
    status: "todos",
    categoria: "todas",
    gravidade: "todas",
  });
  const [selectedProblemId, setSelectedProblemId] = useState<string | number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { data, loading, companyId, syncStatus } = useFleetData();

  const handleStatusChange = async (problem: Problem, status: Problem["status"]) => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const resolvedAt = status === "resolvida" ? new Date().toISOString() : null;
      await updateProblem(companyId, {
        ...problem,
        status,
        resolvedAt,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: "Sucesso",
        description: status === "resolvida" ? "Ocorrencia marcada como resolvida" : "Status da ocorrencia atualizado",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Nao foi possivel atualizar a ocorrencia no Firestore",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getGravidadeVariant = (gravidade: Problem["gravidade"]) => {
    switch (gravidade) {
      case "baixa": return "secondary";
      case "alta": return "destructive";
      case "critica": return "destructive";
      case "media": return "default";
    }
  };

  const getGravidadeClassName = (gravidade: Problem["gravidade"]) => gravidade === "media"
    ? "bg-warning text-warning-foreground hover:bg-warning/80"
    : "";

  const filteredProblems = useMemo(() => {
    return data.problems
      .filter((problem) => filter.status === "todos" || normalizeProblemStatus(problem.status) === filter.status)
      .filter((problem) => filter.categoria === "todas" || problem.categoria === filter.categoria)
      .filter((problem) => filter.gravidade === "todas" || problem.gravidade === filter.gravidade)
      .sort((a, b) => {
        const aOpen = isProblemOpen(a.status);
        const bOpen = isProblemOpen(b.status);
        if (aOpen !== bOpen) return aOpen ? -1 : 1;

        const gravityOrder = { critica: 4, alta: 3, media: 2, baixa: 1 };
        if (gravityOrder[a.gravidade] !== gravityOrder[b.gravidade]) {
          return gravityOrder[b.gravidade] - gravityOrder[a.gravidade];
        }

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [data.problems, filter]);

  const stats = useMemo(() => ({
    abertas: data.problems.filter((problem) => normalizeProblemStatus(problem.status) === "aberta").length,
    emAndamento: data.problems.filter((problem) => normalizeProblemStatus(problem.status) === "em_andamento").length,
    criticas: data.problems.filter((problem) => isProblemOpen(problem.status) && problem.gravidade === "critica").length,
    comGps: data.problems.filter((problem) => typeof problem.location?.latitude === "number" && typeof problem.location?.longitude === "number").length,
  }), [data.problems]);

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Controle de Problemas</h2>
        <p className="text-muted-foreground">
          Central de ocorrencias da frota em tempo real
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.abertas}</div>
            <p className="text-xs text-muted-foreground">Abertas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.emAndamento}</div>
            <p className="text-xs text-muted-foreground">Em andamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.criticas}</div>
            <p className="text-xs text-muted-foreground">Criticas abertas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.comGps}</div>
            <p className="text-xs text-muted-foreground">Com GPS</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={filter.status} onValueChange={(value) => setFilter({ ...filter, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aberta">Abertas</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="resolvida">Resolvidas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select value={filter.categoria} onValueChange={(value) => setFilter({ ...filter, categoria: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="eletrica">Eletrica</SelectItem>
                  <SelectItem value="mecanica">Mecanica</SelectItem>
                  <SelectItem value="funilaria">Funilaria</SelectItem>
                  <SelectItem value="limpeza">Limpeza</SelectItem>
                  <SelectItem value="pneus">Pneus</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Prioridade</label>
              <Select value={filter.gravidade} onValueChange={(value) => setFilter({ ...filter, gravidade: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="critica">Critica</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Ocorrencias ({filteredProblems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredProblems.map((problem) => {
              const status = normalizeProblemStatus(problem.status);
              const vehicle = data.vehicles.find((item) => item.id === problem.vehicleId);
              const driver = data.drivers.find((item) => item.id === problem.driverId);
              const route = getLinkedRoute(problem, data.routes);
              const selectedKey = problem.firestoreId || problem.id;
              const isSelected = selectedProblemId === selectedKey;
              const hasLocation = typeof problem.location?.latitude === "number" && typeof problem.location?.longitude === "number";

              return (
                <div key={selectedKey} className={`p-4 border rounded-lg ${
                  isProblemOpen(status) ? "border-l-4 border-l-destructive" : "border-l-4 border-l-success"
                }`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        <Badge variant={getGravidadeVariant(problem.gravidade)} className={getGravidadeClassName(problem.gravidade)}>
                          {PROBLEM_PRIORITY_LABELS[problem.gravidade]}
                        </Badge>
                        <Badge variant="outline">{PROBLEM_CATEGORY_LABELS[problem.categoria]}</Badge>
                        <Badge variant={isProblemOpen(status) ? "destructive" : "secondary"}>
                          {PROBLEM_STATUS_LABELS[status]}
                        </Badge>
                      </div>

                      <p className="font-medium mb-2">{problem.observacao}</p>

                      <div className="grid gap-2 md:grid-cols-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          Veiculo: {vehicle?.numeroRegistro || "Nao encontrado"}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Motorista: {driver?.nome || "Nao encontrado"}
                        </div>
                        <div className="flex items-center gap-1">
                          <RouteIcon className="h-3 w-3" />
                          Rota: {route ? `${route.status === "active" ? "Ativa" : "Finalizada"} #${route.id || route.firestoreId}` : "Nao vinculada"}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Relatada: {formatDateTime(problem.createdAt)}
                        </div>
                        {problem.resolvedAt && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Resolvida: {formatDateTime(problem.resolvedAt)}
                          </div>
                        )}
                        {hasLocation && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Localizacao registrada
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <div className="mt-3 grid gap-2 rounded border bg-muted/40 p-3 text-sm text-muted-foreground md:grid-cols-2">
                          <div>Status: {PROBLEM_STATUS_LABELS[status]}</div>
                          <div>Prioridade: {PROBLEM_PRIORITY_LABELS[problem.gravidade]}</div>
                          <div>Tipo: {PROBLEM_CATEGORY_LABELS[problem.categoria]}</div>
                          <div>Empresa: {problem.companyId || companyId}</div>
                          <div>Veiculo: {vehicle?.numeroRegistro || problem.vehicleId}</div>
                          <div>Motorista: {driver?.nome || problem.driverId}</div>
                          <div>Rota: {route ? `${route.status} (${route.firestoreId || route.id})` : "Nao vinculada"}</div>
                          <div>Sincronizacao: {syncStatus}</div>
                          <div>ID Firestore: {problem.firestoreId || "pendente"}</div>
                          <div>Criada em: {formatDateTime(problem.createdAt)}</div>
                          {hasLocation && (
                            <div className="md:col-span-2">
                              GPS: {problem.location?.latitude.toFixed(6)}, {problem.location?.longitude.toFixed(6)}
                              {problem.location?.accuracy ? ` (${Math.round(problem.location.accuracy)}m)` : ""}
                            </div>
                          )}
                          {!hasLocation && problem.locationError && (
                            <div className="md:col-span-2">GPS: {problem.locationError.message}</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Select
                        value={status}
                        onValueChange={(value: Problem["status"]) => handleStatusChange(problem, value)}
                        disabled={isSaving}
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aberta">Aberta</SelectItem>
                          <SelectItem value="em_andamento">Em andamento</SelectItem>
                          <SelectItem value="resolvida">Resolvida</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                      {status !== "resolvida" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(problem, "resolvida")} disabled={isSaving}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolver
                        </Button>
                      )}
                      {hasLocation && problem.location && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={getMapUrl(problem.location)} target="_blank" rel="noreferrer">
                            <MapPin className="h-4 w-4 mr-1" />
                            Mapa
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedProblemId(isSelected ? null : selectedKey)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredProblems.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                Nenhuma ocorrencia encontrada
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
