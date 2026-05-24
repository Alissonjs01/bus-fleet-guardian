import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Printer } from "lucide-react";
import { useFleetData } from "@/hooks/useFleetData";
import { isProblemOpen, normalizeProblemStatus, normalizeRevisionStatus } from "@/services/fleetService";
import type { FleetData, Problem, Revision, Route as FleetRoute, Vehicle } from "@/types/fleet";

type ReportType = "vehicles" | "drivers" | "routes" | "problems" | "maintenance";
type PeriodFilter = "today" | "last7" | "last30" | "custom";

const REPORT_LABELS: Record<ReportType, string> = {
  vehicles: "Veiculos",
  drivers: "Motoristas",
  routes: "Rotas",
  problems: "Problemas",
  maintenance: "Revisoes/manutencao",
};

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  today: "Hoje",
  last7: "Ultimos 7 dias",
  last30: "Ultimos 30 dias",
  custom: "Personalizado",
};

const VEHICLE_STATUS_LABELS: Record<Vehicle["status"], string> = {
  garagem: "Na garagem",
  fora_garagem: "Fora da garagem",
  liberado: "Liberado",
  operacao: "Em operacao",
  manutencao: "Em manutencao",
  pane_em_rota: "Pane em rota",
  aguardando_auxilio: "Aguardando auxilio",
};

const ROUTE_STATUS_LABELS: Record<FleetRoute["status"], string> = {
  active: "Em andamento",
  finished: "Concluida",
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

function startOfDay(date = new Date()) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getDateRange(period: PeriodFilter, customStart: string, customEnd: string) {
  const now = new Date();
  if (period === "custom") {
    const start = customStart ? startOfDay(new Date(customStart)).getTime() : 0;
    const end = customEnd ? new Date(`${customEnd}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER;
    return { start, end };
  }

  const start = startOfDay(now);
  if (period === "last7") start.setDate(start.getDate() - 7);
  if (period === "last30") start.setDate(start.getDate() - 30);
  return { start: start.getTime(), end: Number.MAX_SAFE_INTEGER };
}

function isWithinRange(value: string | undefined, start: number, end: number) {
  const time = parseTime(value);
  if (!time) return false;
  return time >= start && time <= end;
}

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "--";
  return date.toLocaleDateString("pt-BR");
}

function formatTime(value?: string) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "--:--";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "--";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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
  return `${hours}h${String(rest).padStart(2, "0")}`;
}

function getVehicle(data: FleetData, vehicleId: number) {
  return data.vehicles.find((vehicle) => vehicle.id === vehicleId);
}

function getDriver(data: FleetData, driverId: number) {
  return data.drivers.find((driver) => driver.id === driverId);
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function printReport(report: string) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head>
        <title>Relatorio operacional</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #111; }
          pre { white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.45; font-size: 13px; }
        </style>
      </head>
      <body><pre>${escapeHtml(report)}</pre></body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function buildHeader(title: string, periodLabel: string) {
  return [
    "RELATORIO OPERACIONAL",
    title.toUpperCase(),
    `Gerado em: ${formatDateTime(new Date().toISOString())}`,
    `Periodo: ${periodLabel}`,
    "",
  ];
}

function buildRoutesReport(data: FleetData, routes: FleetRoute[], periodLabel: string) {
  const lines = buildHeader("Rotas", periodLabel);
  lines.push(`Total de rotas: ${routes.length}`, "");

  routes.forEach((route, index) => {
    const vehicle = getVehicle(data, route.vehicleId);
    const driver = getDriver(data, route.driverId);
    const routeProblems = data.problems.filter((problem) =>
      problem.routeFirestoreId === route.firestoreId ||
      problem.routeId === route.id ||
      (problem.vehicleId === route.vehicleId && problem.driverId === route.driverId && isWithinRange(problem.createdAt, parseTime(route.startedAt), route.finishedAt ? parseTime(route.finishedAt) : Number.MAX_SAFE_INTEGER)),
    );

    lines.push(`${index + 1}. Rota`);
    lines.push(`Veiculo: ${vehicle?.numeroRegistro || route.vehicleId}`);
    lines.push(`Motorista: ${driver?.nome || route.driverId}`);
    lines.push(`Inicio da rota: ${formatTime(route.startedAt)} (${formatDate(route.startedAt)})`);
    lines.push(`Fim da rota: ${route.finishedAt ? `${formatTime(route.finishedAt)} (${formatDate(route.finishedAt)})` : "Em andamento"}`);
    lines.push(`Tempo de uso: ${route.finishedAt ? formatDuration(getRouteMinutes(route)) : "Em andamento"}`);
    lines.push(`Status final: ${ROUTE_STATUS_LABELS[route.status]}`);
    lines.push("Ocorrencias:");
    if (routeProblems.length === 0) {
      lines.push("- Nenhuma ocorrencia registrada");
    } else {
      routeProblems.forEach((problem) => {
        lines.push(`- ${problem.observacao} as ${formatTime(problem.createdAt)} (${PROBLEM_STATUS_LABELS[normalizeProblemStatus(problem.status)]})`);
      });
    }
    lines.push("");
  });

  if (routes.length === 0) lines.push("Nenhuma rota encontrada para os filtros selecionados.");
  return lines.join("\n");
}

function buildVehiclesReport(data: FleetData, vehicles: Vehicle[], routes: FleetRoute[], periodLabel: string) {
  const lines = buildHeader("Veiculos", periodLabel);
  lines.push(`Total de veiculos: ${vehicles.length}`, "");

  vehicles.forEach((vehicle) => {
    const vehicleRoutes = routes.filter((route) => route.vehicleId === vehicle.id);
    const finishedRoutes = vehicleRoutes.filter((route) => route.status === "finished");
    const totalMinutes = finishedRoutes.reduce((sum, route) => sum + getRouteMinutes(route), 0);
    const problems = data.problems.filter((problem) => problem.vehicleId === vehicle.id);

    lines.push(`Veiculo: ${vehicle.numeroRegistro}`);
    lines.push(`Status atual: ${VEHICLE_STATUS_LABELS[vehicle.status]}`);
    lines.push(`Rotas no periodo: ${vehicleRoutes.length}`);
    lines.push(`Rotas concluidas: ${finishedRoutes.length}`);
    lines.push(`Tempo total de uso: ${formatDuration(totalMinutes)}`);
    lines.push(`Ocorrencias vinculadas: ${problems.length}`);
    lines.push("");
  });

  if (vehicles.length === 0) lines.push("Nenhum veiculo encontrado para os filtros selecionados.");
  return lines.join("\n");
}

function buildDriversReport(data: FleetData, routes: FleetRoute[], periodLabel: string) {
  const lines = buildHeader("Motoristas", periodLabel);
  const drivers = data.drivers.filter((driver) => routes.some((route) => route.driverId === driver.id));
  lines.push(`Motoristas com atividade: ${drivers.length}`, "");

  drivers.forEach((driver) => {
    const driverRoutes = routes.filter((route) => route.driverId === driver.id);
    const finishedRoutes = driverRoutes.filter((route) => route.status === "finished");
    const totalMinutes = finishedRoutes.reduce((sum, route) => sum + getRouteMinutes(route), 0);
    const problems = data.problems.filter((problem) => problem.driverId === driver.id);

    lines.push(`Motorista: ${driver.nome}`);
    lines.push(`Registro: ${driver.numeroRegistro}`);
    lines.push(`Status atual: ${driver.status || "Nao informado"}`);
    lines.push(`Rotas no periodo: ${driverRoutes.length}`);
    lines.push(`Rotas concluidas: ${finishedRoutes.length}`);
    lines.push(`Tempo total em rota: ${formatDuration(totalMinutes)}`);
    lines.push(`Ocorrencias vinculadas: ${problems.length}`);
    lines.push("");
  });

  if (drivers.length === 0) lines.push("Nenhum motorista com atividade para os filtros selecionados.");
  return lines.join("\n");
}

function buildProblemsReport(data: FleetData, problems: Problem[], periodLabel: string) {
  const lines = buildHeader("Problemas", periodLabel);
  lines.push(`Total de ocorrencias: ${problems.length}`, "");

  problems.forEach((problem, index) => {
    const vehicle = getVehicle(data, problem.vehicleId);
    const driver = getDriver(data, problem.driverId);
    const status = normalizeProblemStatus(problem.status);

    lines.push(`${index + 1}. Ocorrencia`);
    lines.push(`Veiculo: ${vehicle?.numeroRegistro || problem.vehicleId}`);
    lines.push(`Motorista: ${driver?.nome || problem.driverId}`);
    lines.push(`Tipo: ${problem.categoria}`);
    lines.push(`Prioridade: ${problem.gravidade}`);
    lines.push(`Status: ${PROBLEM_STATUS_LABELS[status]}`);
    lines.push(`Horario: ${formatDateTime(problem.createdAt)}`);
    lines.push(`Descricao: ${problem.observacao}`);
    lines.push("");
  });

  if (problems.length === 0) lines.push("Nenhuma ocorrencia encontrada para os filtros selecionados.");
  return lines.join("\n");
}

function buildMaintenanceReport(data: FleetData, revisions: Revision[], periodLabel: string) {
  const lines = buildHeader("Revisoes/manutencao", periodLabel);
  lines.push(`Total de registros: ${revisions.length}`, "");

  revisions.forEach((revision, index) => {
    const vehicle = getVehicle(data, revision.vehicleId);
    const status = normalizeRevisionStatus(revision.status);

    lines.push(`${index + 1}. Revisao`);
    lines.push(`Veiculo: ${vehicle?.numeroRegistro || revision.vehicleId}`);
    lines.push(`Tipo: ${revision.tipo}`);
    lines.push(`Status: ${REVISION_STATUS_LABELS[status]}`);
    lines.push(`Data da revisao: ${revision.dataRevisao || "--"}`);
    lines.push(`Proxima revisao: ${revision.dataProxima || "--"}`);
    lines.push(`Responsavel: ${revision.responsavel || "--"}`);
    lines.push(`Observacao: ${revision.observacao || "--"}`);
    lines.push("");
  });

  if (revisions.length === 0) lines.push("Nenhuma revisao encontrada para os filtros selecionados.");
  return lines.join("\n");
}

export const Reports = () => {
  const { data: fleetData, loading } = useFleetData();
  const [reportType, setReportType] = useState<ReportType>("routes");
  const [period, setPeriod] = useState<PeriodFilter>("today");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [onlyFinishedRoutes, setOnlyFinishedRoutes] = useState(false);
  const [onlyCompletedRevisions, setOnlyCompletedRevisions] = useState(false);
  const [generatedReport, setGeneratedReport] = useState("");

  const filteredData = useMemo(() => {
    const range = getDateRange(period, customStart, customEnd);
    const vehicleId = vehicleFilter === "all" ? null : Number(vehicleFilter);
    const driverId = driverFilter === "all" ? null : Number(driverFilter);
    const vehicleMatches = (value: number) => vehicleId === null || value === vehicleId;
    const driverMatches = (value: number) => driverId === null || value === driverId;

    const routes = fleetData.routes
      .filter((route) => vehicleMatches(route.vehicleId))
      .filter((route) => driverMatches(route.driverId))
      .filter((route) => isWithinRange(route.startedAt || route.createdAt, range.start, range.end))
      .filter((route) => !onlyFinishedRoutes || route.status === "finished")
      .sort((a, b) => parseTime(b.startedAt || b.createdAt) - parseTime(a.startedAt || a.createdAt));

    const problems = fleetData.problems
      .filter((problem) => vehicleMatches(problem.vehicleId))
      .filter((problem) => driverMatches(problem.driverId))
      .filter((problem) => isWithinRange(problem.createdAt, range.start, range.end))
      .filter((problem) => !onlyCritical || problem.gravidade === "critica")
      .sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt));

    const revisions = fleetData.revisions
      .filter((revision) => vehicleMatches(revision.vehicleId))
      .filter((revision) => isWithinRange(revision.createdAt || revision.dataRevisao || revision.dataProxima, range.start, range.end))
      .filter((revision) => !onlyCompletedRevisions || normalizeRevisionStatus(revision.status) === "concluida")
      .sort((a, b) => parseTime(b.createdAt || b.dataRevisao) - parseTime(a.createdAt || a.dataRevisao));

    const vehicles = fleetData.vehicles.filter((vehicle) => vehicleMatches(vehicle.id));

    return { routes, problems, revisions, vehicles };
  }, [customEnd, customStart, driverFilter, fleetData, onlyCompletedRevisions, onlyCritical, onlyFinishedRoutes, period, vehicleFilter]);

  const periodLabel = period === "custom" && (customStart || customEnd)
    ? `${customStart || "inicio"} ate ${customEnd || "hoje"}`
    : PERIOD_LABELS[period];

  const handleGenerate = () => {
    const builders: Record<ReportType, () => string> = {
      vehicles: () => buildVehiclesReport(fleetData, filteredData.vehicles, filteredData.routes, periodLabel),
      drivers: () => buildDriversReport(fleetData, filteredData.routes, periodLabel),
      routes: () => buildRoutesReport(fleetData, filteredData.routes, periodLabel),
      problems: () => buildProblemsReport(fleetData, filteredData.problems, periodLabel),
      maintenance: () => buildMaintenanceReport(fleetData, filteredData.revisions, periodLabel),
    };

    setGeneratedReport(builders[reportType]());
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Relatorios</h2>
        <p className="text-muted-foreground">
          Gere relatorios operacionais com dados reais da frota.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerar relatorio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Tipo de relatorio</Label>
              <Select value={reportType} onValueChange={(value: ReportType) => setReportType(value)}>
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

            <div className="space-y-2">
              <Label>Periodo</Label>
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

            <div className="space-y-2">
              <Label>Veiculo</Label>
              <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os veiculos</SelectItem>
                  {fleetData.vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                      Veiculo {vehicle.numeroRegistro}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {period === "custom" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Data inicial</Label>
                <Input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data final</Label>
                <Input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Motorista</Label>
              <Select value={driverFilter} onValueChange={setDriverFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os motoristas</SelectItem>
                  {fleetData.drivers.map((driver) => (
                    <SelectItem key={driver.id} value={String(driver.id)}>
                      {driver.nome} ({driver.numeroRegistro})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Filtros opcionais</Label>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <Checkbox checked={onlyCritical} onCheckedChange={(value) => setOnlyCritical(Boolean(value))} />
                  Apenas problemas criticos
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={onlyFinishedRoutes} onCheckedChange={(value) => setOnlyFinishedRoutes(Boolean(value))} />
                  Apenas rotas concluidas
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={onlyCompletedRevisions} onCheckedChange={(value) => setOnlyCompletedRevisions(Boolean(value))} />
                  Apenas revisoes concluidas
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{REPORT_LABELS[reportType]}</Badge>
              <Badge variant="outline">{periodLabel}</Badge>
            </div>
            <Button onClick={handleGenerate}>
              <FileText className="mr-2 h-4 w-4" />
              Gerar relatorio
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Previa do relatorio</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!generatedReport}
                onClick={() => downloadText(`relatorio-${reportType}.txt`, generatedReport)}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar TXT
              </Button>
              <Button variant="outline" size="sm" disabled={!generatedReport} onClick={() => printReport(generatedReport)}>
                <Printer className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {generatedReport ? (
            <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/20 p-4 text-sm leading-relaxed text-foreground">
              {generatedReport}
            </pre>
          ) : (
            <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              Escolha os filtros e clique em Gerar relatorio.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
