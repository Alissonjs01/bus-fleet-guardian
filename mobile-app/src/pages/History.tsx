import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Clock, History as HistoryIcon, PlayCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useFleetData } from "@/hooks/useFleetData";
import { normalizeProblemStatus } from "@/services/fleetService";
import type { Driver, Problem, Route, Vehicle } from "@/types/fleet";
import { normalizeRegistration } from "@/utils/localStorage";
import { MobileLayout } from "../components/MobileLayout";
import { mobileStorage } from "../utils/storage";

interface HistoryProps {
  onBack: () => void;
}

type TimelineEventType = "route_start" | "route_end" | "problem";

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string;
  meta?: string;
  timestamp: string;
}

const PROBLEM_CATEGORY_LABELS: Record<Problem["categoria"], string> = {
  eletrica: "Pane eletrica",
  mecanica: "Pane mecanica",
  funilaria: "Funilaria",
  limpeza: "Limpeza",
  pneus: "Pneus",
  outros: "Outro problema",
};

const PROBLEM_STATUS_LABELS: Record<Problem["status"], string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  resolvida: "Resolvida",
  cancelada: "Cancelada",
};

function getTimeValue(value?: string) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const dateKey = date.toLocaleDateString("pt-BR");
  if (dateKey === today.toLocaleDateString("pt-BR")) return "Hoje";
  if (dateKey === yesterday.toLocaleDateString("pt-BR")) return "Ontem";
  return dateKey;
}

function getVehicleLabel(vehicle?: Vehicle, vehicleId?: number) {
  if (vehicle?.numeroRegistro) return `Veiculo ${vehicle.numeroRegistro}`;
  if (vehicleId) return `Veiculo ${vehicleId}`;
  return "Veiculo nao identificado";
}

function minuteKey(value: string) {
  const time = getTimeValue(value);
  if (!time) return "sem-data";
  return new Date(time).toISOString().slice(0, 16);
}

function problemDedupeKey(problem: Problem) {
  return [
    problem.driverId,
    problem.vehicleId,
    problem.categoria,
    problem.observacao.trim().toLowerCase(),
    minuteKey(problem.createdAt),
  ].join("|");
}

function findCurrentDriver(drivers: Driver[], sessionDriver: ReturnType<typeof mobileStorage.getCurrentDriver>) {
  if (!sessionDriver) return undefined;

  const sessionRegistration = normalizeRegistration(sessionDriver.numeroRegistro || "");
  return drivers.find((driver) => {
    if (sessionDriver.firestoreId && driver.firestoreId === sessionDriver.firestoreId) return true;

    const driverRegistration = normalizeRegistration(
      driver.registrationNumberNormalized || driver.registrationNumber || driver.numeroRegistro || "",
    );

    return driverRegistration === sessionRegistration;
  });
}

function buildTimelineEvents(routes: Route[], problems: Problem[], vehicles: Vehicle[], driver?: Driver) {
  if (!driver) return [];

  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const driverRoutes = routes.filter((route) => route.driverId === driver.id);
  const events: TimelineEvent[] = [];

  driverRoutes.forEach((route) => {
    const vehicle = vehicleById.get(route.vehicleId);
    const routeKey = route.firestoreId || String(route.id);

    if (route.startedAt) {
      events.push({
        id: `route-start-${routeKey}`,
        type: "route_start",
        title: "Rota iniciada",
        description: getVehicleLabel(vehicle, route.vehicleId),
        meta: route.status === "active" ? "Em andamento" : undefined,
        timestamp: route.startedAt,
      });
    }

    if (route.finishedAt) {
      events.push({
        id: `route-end-${routeKey}`,
        type: "route_end",
        title: "Rota finalizada",
        description: getVehicleLabel(vehicle, route.vehicleId),
        timestamp: route.finishedAt,
      });
    }
  });

  const seenProblems = new Set<string>();

  problems
    .filter((problem) => problem.driverId === driver.id)
    .forEach((problem) => {
      const dedupeKey = problemDedupeKey(problem);
      if (seenProblems.has(dedupeKey)) return;
      seenProblems.add(dedupeKey);

      const problemKey = problem.firestoreId || String(problem.id);
      const status = normalizeProblemStatus(problem.status);
      const category = PROBLEM_CATEGORY_LABELS[problem.categoria] || "Problema";
      const vehicle = vehicleById.get(problem.vehicleId);
      const detail = problem.observacao?.trim();

      events.push({
        id: `problem-${problemKey}`,
        type: "problem",
        title: "Problema reportado",
        description: detail ? `${category} - ${detail}` : category,
        meta: `${getVehicleLabel(vehicle, problem.vehicleId)} - ${PROBLEM_STATUS_LABELS[status]}`,
        timestamp: problem.createdAt,
      });
    });

  const uniqueEvents = new Map(events.map((event) => [event.id, event]));
  return Array.from(uniqueEvents.values()).sort((a, b) => getTimeValue(b.timestamp) - getTimeValue(a.timestamp));
}

function groupEvents(events: TimelineEvent[]) {
  return events.reduce<Array<{ day: string; events: TimelineEvent[] }>>((groups, event) => {
    const day = formatDay(event.timestamp);
    const group = groups.find((item) => item.day === day);

    if (group) {
      group.events.push(event);
    } else {
      groups.push({ day, events: [event] });
    }

    return groups;
  }, []);
}

function eventIcon(type: TimelineEventType) {
  if (type === "route_start") return <PlayCircle className="h-4 w-4 text-success" />;
  if (type === "route_end") return <CheckCircle2 className="h-4 w-4 text-primary" />;
  return <AlertTriangle className="h-4 w-4 text-warning" />;
}

function eventBadgeVariant(type: TimelineEventType) {
  if (type === "problem") return "destructive" as const;
  if (type === "route_end") return "secondary" as const;
  return "outline" as const;
}

export const History = ({ onBack }: HistoryProps) => {
  const sessionDriver = mobileStorage.getCurrentDriver();
  const { data, loading } = useFleetData(sessionDriver?.companyId || "demo-company");

  const driver = useMemo(
    () => findCurrentDriver(data.drivers, sessionDriver),
    [data.drivers, sessionDriver],
  );

  const events = useMemo(
    () => buildTimelineEvents(data.routes, data.problems, data.vehicles, driver),
    [data.problems, data.routes, data.vehicles, driver],
  );

  const groupedEvents = useMemo(() => groupEvents(events), [events]);

  return (
    <MobileLayout title="Historico" showBackButton onBack={onBack}>
      <div className="space-y-4">
        {!sessionDriver && (
          <Alert variant="destructive">
            <AlertDescription>Informe o registro do motorista novamente para ver o historico.</AlertDescription>
          </Alert>
        )}

        {sessionDriver && !loading && !driver && (
          <Alert variant="destructive">
            <AlertDescription>Cadastro do motorista nao encontrado no banco.</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <HistoryIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Atividades recentes</h2>
                <p className="text-sm text-muted-foreground">
                  Inicio de rota, problemas reportados e finalizacoes registradas no sistema.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <Card key={item}>
                <CardContent className="pt-4">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 w-1/3 rounded bg-muted" />
                    <div className="h-3 w-3/4 rounded bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : groupedEvents.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <HistoryIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="font-medium">Nenhuma atividade encontrada</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Quando uma rota for iniciada, finalizada ou um problema for reportado, tudo aparece aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {groupedEvents.map((group) => (
              <section key={group.day} className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {group.day}
                </div>

                <div className="space-y-3">
                  {group.events.map((event) => (
                    <Card key={event.id}>
                      <CardContent className="pt-4">
                        <div className="flex gap-3">
                          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                            {eventIcon(event.type)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-semibold leading-tight">{event.title}</h3>
                                <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                              </div>
                              <span className="shrink-0 text-sm font-medium">{formatTime(event.timestamp)}</span>
                            </div>

                            {event.meta && (
                              <Badge className="mt-3" variant={eventBadgeVariant(event.type)}>
                                {event.meta}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};
