import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, BarChart3, Clock, Download, Route, Users, Wrench } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useFleetData } from "@/hooks/useFleetData";
import { isProblemOpen, normalizeProblemStatus, normalizeRevisionStatus } from "@/services/fleetService";
import type { FleetData, Problem, Revision, Route as FleetRoute, Vehicle } from "@/types/fleet";

type PeriodFilter = "last7" | "last30" | "last90" | "all";
type ReportFilter = "all" | "routes" | "problems" | "maintenance" | "fleet";

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  last7: "Ultimos 7 dias",
  last30: "Ultimos 30 dias",
  last90: "Ultimos 90 dias",
  all: "Todo o historico",
};

const REPORT_LABELS: Record<ReportFilter, string> = {
  all: "Operacional completo",
  routes: "Rotas e utilizacao",
  problems: "Problemas",
  maintenance: "Revisoes",
  fleet: "Status da frota",
};

const VEHICLE_STATUS_LABELS: Record<Vehicle["status"], string> = {
  garagem: "Na garagem",
  operacao: "Em operacao",
  manutencao: "Em manutencao",
  pane_em_rota: "Pane em rota",
  aguardando_auxilio: "Aguardando auxilio",
};

const ROUTE_STATUS_LABELS: Record<FleetRoute["status"], string> = {
  active: "Ativa",
  finished: "Finalizada",
  canceled: "Cancelada",
};

const PROBLEM_STATUS_LABELS: Record<Problem["status"], string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  resolvida: "Resolvida",
  cancelada: "Cancelada",
};

const REVISION_STATUS_LABELS: Record<Revision["status"], string> = {
  agendada: "Agendada",
  em_andamento: "Em andamento",
  concluida: "Concluida",
  cancelada: "Cancelada",
};

function parseTime(value?: string) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getPeriodStart(period: PeriodFilter) {
  if (period === "all") return 0;
  const days = period === "last7" ? 7 : period === "last30" ? 30 : 90;
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.getTime();
}

function isWithinPeriod(value: string | undefined, periodStart: number) {
  if (!periodStart) return true;
  return parseTime(value) >= periodStart;
}

function formatDateTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "--";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRouteMinutes(route: FleetRoute) {
  if (!route.finishedAt) return 0;
  const start = parseTime(route.startedAt);
  const end = parseTime(route.finishedAt);
  if (!start || !end || end < start) return 0;
  return Math.floor((end - start) / 60000);
}

function formatDuration(minutes: number) {
  if (!minutes) return "0min";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}min`;
  if (!rest) return `${hours}h`;
  return `${hours}h ${rest}min`;
}

function monthKey(value?: string) {
  const date = value ? new Date(value) : new Date();
  if (!Number.isFinite(date.getTime())) return "Sem data";
  return date.toLocaleDateString("pt-BR", { month: "short" });
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(";"),
    ...rows.map((row) =>
      headers
        .map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`)
        .join(";"),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildVehicleStats(data: FleetData, routes: FleetRoute[]) {
  return data.vehicles.map((vehicle) => {
    const vehicleRoutes = routes.filter((route) => route.vehicleId === vehicle.id);
    const finishedRoutes = vehicleRoutes.filter((route) => route.status === "finished");
    const totalMinutes = finishedRoutes.reduce((sum, route) => sum + getRouteMinutes(route), 0);
    const issues = data.problems.filter((problem) => problem.vehicleId === vehicle.id);

    return {
      vehicle,
      routeCount: vehicleRoutes.length,
      finishedRoutes: finishedRoutes.length,
      totalMinutes,
      averageMinutes: finishedRoutes.length ? Math.round(totalMinutes / finishedRoutes.length) : 0,
      issueCount: issues.length,
      openIssues: issues.filter((problem) => isProblemOpen(problem.status)).length,
    };
  });
}

function buildDriverStats(data: FleetData, routes: FleetRoute[]) {
  return data.drivers.map((driver) => {
    const driverRoutes = routes.filter((route) => route.driverId === driver.id);
    const finishedRoutes = driverRoutes.filter((route) => route.status === "finished");
    const totalMinutes = finishedRoutes.reduce((sum, route) => sum + getRouteMinutes(route), 0);
    const issues = data.problems.filter((problem) => problem.driverId === driver.id);

    return {
      driver,
      routeCount: driverRoutes.length,
      finishedRoutes: finishedRoutes.length,
      totalMinutes,
      averageMinutes: finishedRoutes.length ? Math.round(totalMinutes / finishedRoutes.length) : 0,
      issueCount: issues.length,
    };
  });
}

export const Reports = () => {
  const [period, setPeriod] = useState<PeriodFilter>("last30");
  const [reportType, setReportType] = useState<ReportFilter>("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const { data: fleetData, loading } = useFleetData();

  const reportData = useMemo(() => {
    const periodStart = getPeriodStart(period);
    const selectedVehicleId = vehicleFilter === "all" ? null : Number(vehicleFilter);
    const vehicleMatches = (vehicleId: number) => selectedVehicleId === null || vehicleId === selectedVehicleId;

    const routes = fleetData.routes
      .filter((route) => vehicleMatches(route.vehicleId))
      .filter((route) => isWithinPeriod(route.startedAt || route.createdAt, periodStart));

    const problems = fleetData.problems
      .filter((problem) => vehicleMatches(problem.vehicleId))
      .filter((problem) => isWithinPeriod(problem.createdAt, periodStart));

    const revisions = fleetData.revisions
      .filter((revision) => vehicleMatches(revision.vehicleId))
      .filter((revision) => isWithinPeriod(revision.createdAt || revision.dataProxima, periodStart));

    const vehicles = selectedVehicleId === null
      ? fleetData.vehicles
      : fleetData.vehicles.filter((vehicle) => vehicle.id === selectedVehicleId);

    const finishedRoutes = routes.filter((route) => route.status === "finished");
    const activeRoutes = routes.filter((route) => route.status === "active");
    const totalUsageMinutes = finishedRoutes.reduce((sum, route) => sum + getRouteMinutes(route), 0);
    const averageUsageMinutes = finishedRoutes.length ? Math.round(totalUsageMinutes / finishedRoutes.length) : 0;

    const vehicleStats = buildVehicleStats({ ...fleetData, vehicles }, routes)
      .sort((a, b) => b.routeCount - a.routeCount || b.totalMinutes - a.totalMinutes);

    const driverStats = buildDriverStats(fleetData, routes)
      .filter((item) => item.routeCount > 0 || item.issueCount > 0)
      .sort((a, b) => b.routeCount - a.routeCount || b.totalMinutes - a.totalMinutes);

    const problemChart = ["eletrica", "mecanica", "funilaria", "limpeza", "pneus", "outros"].map((category) => ({
      name: category,
      total: problems.filter((problem) => problem.categoria === category).length,
    }));

    const routeChartMap = new Map<string, number>();
    routes.forEach((route) => {
      const key = monthKey(route.startedAt || route.createdAt);
      routeChartMap.set(key, (routeChartMap.get(key) || 0) + 1);
    });
    const routeChart = Array.from(routeChartMap.entries()).map(([name, total]) => ({ name, total }));

    const routeIssues = problems.filter((problem) => {
      const status = normalizeProblemStatus(problem.status);
      const route = fleetData.routes.find((item) =>
        (problem.routeFirestoreId && item.firestoreId === problem.routeFirestoreId) ||
        (problem.routeId && item.id === problem.routeId) ||
        (item.status === "active" && item.vehicleId === problem.vehicleId && item.driverId === problem.driverId),
      );
      return isProblemOpen(status) && route?.status === "active";
    });

    return {
      routes,
      problems,
      revisions,
      vehicles,
      finishedRoutes,
      activeRoutes,
      totalUsageMinutes,
      averageUsageMinutes,
      vehicleStats,
      driverStats,
      problemChart,
      routeChart,
      routeIssues,
      completedRevisions: revisions.filter((revision) => normalizeRevisionStatus(revision.status) === "concluida"),
      openProblems: problems.filter((problem) => isProblemOpen(problem.status)),
    };
  }, [fleetData, period, vehicleFilter]);

  const selectedVehicleLabel = vehicleFilter === "all"
    ? "Todos os veiculos"
    : `Veiculo ${fleetData.vehicles.find((vehicle) => vehicle.id === Number(vehicleFilter))?.numeroRegistro || vehicleFilter}`;

  const shouldShowRoutes = reportType === "all" || reportType === "routes" || reportType === "fleet";
  const shouldShowProblems = reportType === "all" || reportType === "problems";
  const shouldShowMaintenance = reportType === "all" || reportType === "maintenance";

  const handleExport = () => {
    const rows = reportData.routes.map((route) => {
      const vehicle = fleetData.vehicles.find((item) => item.id === route.vehicleId);
      const driver = fleetData.drivers.find((item) => item.id === route.driverId);
      return {
        tipo: "rota",
        veiculo: vehicle?.numeroRegistro || route.vehicleId,
        motorista: driver?.nome || route.driverId,
        status: ROUTE_STATUS_LABELS[route.status],
        inicio: route.startedAt,
        fim: route.finishedAt || "",
        tempo_minutos: getRouteMinutes(route),
      };
    });

    downloadCsv(`relatorio-frota-${period}.csv`, rows);
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Relatorios</h2>
          <p className="text-muted-foreground">
            Indicadores operacionais em tempo real da frota.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={reportData.routes.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exportar rotas CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Periodo</label>
              <Select value={period} onValueChange={(value: PeriodFilter) => setPeriod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Visao</label>
              <Select value={reportType} onValueChange={(value: ReportFilter) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REPORT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Veiculo</label>
              <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os veiculos</SelectItem>
                  {fleetData.vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                      Veiculo {vehicle.numeroRegistro}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{PERIOD_LABELS[period]}</Badge>
            <Badge variant="outline">{REPORT_LABELS[reportType]}</Badge>
            <Badge variant="outline">{selectedVehicleLabel}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-4">
        <StatsCard title="Rotas finalizadas" value={reportData.finishedRoutes.length} description={`${reportData.activeRoutes.length} em andamento`} icon={Route} />
        <StatsCard title="Tempo medio" value={formatDuration(reportData.averageUsageMinutes)} description="Por rota finalizada" icon={Clock} />
        <StatsCard title="Problemas abertos" value={reportData.openProblems.length} description={`${reportData.routeIssues.length} em rota ativa`} icon={AlertTriangle} variant={reportData.openProblems.length ? "warning" : "default"} />
        <StatsCard title="Revisoes concluidas" value={reportData.completedRevisions.length} description={`${reportData.revisions.length} registros no periodo`} icon={Wrench} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Rotas por mes
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {reportData.routeChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.routeChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Nenhuma rota encontrada para os filtros.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Problemas por categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {reportData.problemChart.some((item) => item.total > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.problemChart} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={76} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Nenhum problema encontrado para os filtros.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {shouldShowRoutes && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Veiculos mais utilizados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportData.vehicleStats.slice(0, 6).map((item) => (
                  <div key={item.vehicle.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">Veiculo {item.vehicle.numeroRegistro}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.finishedRoutes} finalizadas - {formatDuration(item.totalMinutes)} de uso
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Media: {formatDuration(item.averageMinutes)} por rota
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary">{item.routeCount} rotas</Badge>
                        {item.openIssues > 0 && <Badge variant="destructive">{item.openIssues} abertas</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
                {reportData.vehicleStats.length === 0 && (
                  <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                    Nenhum veiculo encontrado.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Motoristas mais ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportData.driverStats.slice(0, 6).map((item) => (
                  <div key={item.driver.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{item.driver.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          Registro {item.driver.numeroRegistro}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDuration(item.totalMinutes)} em rotas finalizadas
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary">{item.routeCount} rotas</Badge>
                        {item.issueCount > 0 && <Badge variant="outline">{item.issueCount} ocorrencias</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
                {reportData.driverStats.length === 0 && (
                  <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                    Nenhum motorista com atividade no periodo.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {shouldShowProblems && (
        <Card>
          <CardHeader>
            <CardTitle>Problemas em rota e ocorrencias recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportData.problems.slice(0, 8).map((problem) => {
                const vehicle = fleetData.vehicles.find((item) => item.id === problem.vehicleId);
                const driver = fleetData.drivers.find((item) => item.id === problem.driverId);
                const status = normalizeProblemStatus(problem.status);
                return (
                  <div key={problem.firestoreId || problem.id} className="rounded-lg border p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="font-medium">{problem.observacao}</div>
                        <div className="text-sm text-muted-foreground">
                          Veiculo {vehicle?.numeroRegistro || problem.vehicleId} - {driver?.nome || "Motorista nao encontrado"}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(problem.createdAt)}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={isProblemOpen(status) ? "destructive" : "secondary"}>{PROBLEM_STATUS_LABELS[status]}</Badge>
                        <Badge variant="outline">{problem.gravidade}</Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
              {reportData.problems.length === 0 && (
                <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                  Nenhuma ocorrencia encontrada para os filtros.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {shouldShowMaintenance && (
        <Card>
          <CardHeader>
            <CardTitle>Revisoes e manutencoes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportData.revisions.slice(0, 8).map((revision) => {
                const vehicle = fleetData.vehicles.find((item) => item.id === revision.vehicleId);
                const status = normalizeRevisionStatus(revision.status);
                return (
                  <div key={revision.firestoreId || revision.id} className="rounded-lg border p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="font-medium">Veiculo {vehicle?.numeroRegistro || revision.vehicleId}</div>
                        <div className="text-sm text-muted-foreground">
                          {revision.observacao || "Revisao registrada"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Proxima: {revision.dataProxima || "--"}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={status === "concluida" ? "secondary" : "default"}>{REVISION_STATUS_LABELS[status]}</Badge>
                        <Badge variant="outline">{revision.tipo}</Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
              {reportData.revisions.length === 0 && (
                <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                  Nenhuma revisao encontrada para os filtros.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Historico operacional
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reportData.routes
              .slice()
              .sort((a, b) => parseTime(b.startedAt || b.createdAt) - parseTime(a.startedAt || a.createdAt))
              .slice(0, 10)
              .map((route) => {
                const vehicle = fleetData.vehicles.find((item) => item.id === route.vehicleId);
                const driver = fleetData.drivers.find((item) => item.id === route.driverId);
                return (
                  <div key={route.firestoreId || route.id} className="rounded-lg border p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="font-medium">
                          Veiculo {vehicle?.numeroRegistro || route.vehicleId} - {driver?.nome || "Motorista nao encontrado"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDateTime(route.startedAt)} - {route.finishedAt ? formatDateTime(route.finishedAt) : "em andamento"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Tempo de uso: {route.finishedAt ? formatDuration(getRouteMinutes(route)) : "em andamento"}
                        </div>
                      </div>
                      <Badge variant={route.status === "active" ? "default" : "secondary"}>
                        {ROUTE_STATUS_LABELS[route.status]}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            {reportData.routes.length === 0 && (
              <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                Nenhuma rota encontrada para os filtros.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status atual da frota</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {reportData.vehicles.map((vehicle) => {
              const activeRoute = fleetData.routes.find((route) => route.vehicleId === vehicle.id && route.status === "active");
              const openIssues = fleetData.problems.filter((problem) => problem.vehicleId === vehicle.id && isProblemOpen(problem.status)).length;
              return (
                <div key={vehicle.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">Veiculo {vehicle.numeroRegistro}</div>
                      <div className="text-sm text-muted-foreground">{VEHICLE_STATUS_LABELS[vehicle.status]}</div>
                      {activeRoute && <div className="text-xs text-muted-foreground">Rota ativa desde {formatDateTime(activeRoute.startedAt)}</div>}
                    </div>
                    {openIssues > 0 ? (
                      <Badge variant="destructive">{openIssues} abertas</Badge>
                    ) : (
                      <Badge variant="secondary">Sem ocorrencias</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
