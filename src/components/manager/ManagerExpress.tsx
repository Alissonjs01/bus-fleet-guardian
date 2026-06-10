import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  Clock,
  KeyRound,
  MapPin,
  Route,
  Search,
  ShieldAlert,
  Smartphone,
  Warehouse,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFleetExpressData } from "@/hooks/useFleetExpressData";
import { isProblemOpen } from "@/services/fleetService";
import type { Driver, Problem, Route as FleetRoute, Vehicle } from "@/types/fleet";
import { formatDateTime } from "@/utils/dateFormat";
import { getMapUrl } from "@/utils/geolocation";

function statusLabel(status: Vehicle["status"]) {
  switch (status) {
    case "garagem": return "Garagem";
    case "fora_garagem": return "Disponivel na Rua";
    case "liberado": return "Liberado";
    case "operacao": return "Em Rota";
    case "manutencao": return "Manutencao";
    case "pane_em_rota": return "Pane em rota";
    case "aguardando_auxilio": return "Aguardando auxilio";
  }
}

function statusClass(status: Vehicle["status"]) {
  switch (status) {
    case "garagem": return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
    case "fora_garagem": return "bg-sky-500/15 text-sky-700 border-sky-500/30";
    case "liberado": return "bg-indigo-500/15 text-indigo-700 border-indigo-500/30";
    case "operacao": return "bg-primary/15 text-primary border-primary/30";
    case "manutencao": return "bg-amber-500/15 text-amber-700 border-amber-500/30";
    case "pane_em_rota":
    case "aguardando_auxilio":
      return "bg-destructive/15 text-destructive border-destructive/30";
  }
}

function findDriver(route: FleetRoute | undefined, drivers: Driver[]) {
  if (!route) return undefined;
  return drivers.find((driver) => driver.id === route.driverId);
}

function vehicleSort(a: Vehicle, b: Vehicle) {
  return a.numeroRegistro.localeCompare(b.numeroRegistro, "pt-BR", { numeric: true });
}

function problemPriority(problem: Problem) {
  const order = { critica: 4, alta: 3, media: 2, baixa: 1 };
  return order[problem.gravidade] || 0;
}

export function ManagerExpress() {
  const { data, loading, pendingWrites } = useFleetExpressData();
  const [search, setSearch] = useState("");

  const activeRoutesByVehicle = useMemo(() => {
    return new Map(data.routes.map((route) => [route.vehicleId, route]));
  }, [data.routes]);

  const grouped = useMemo(() => {
    const vehicles = [...data.vehicles].sort(vehicleSort);
    const openProblems = data.problems
      .filter((problem) => isProblemOpen(problem.status))
      .sort((a, b) => {
        const priorityDelta = problemPriority(b) - problemPriority(a);
        if (priorityDelta !== 0) return priorityDelta;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    return {
      inRoute: vehicles.filter((vehicle) => vehicle.status === "operacao"),
      released: vehicles.filter((vehicle) => vehicle.status === "liberado"),
      street: vehicles.filter((vehicle) => vehicle.status === "fora_garagem"),
      garage: vehicles.filter((vehicle) => vehicle.status === "garagem"),
      maintenance: vehicles.filter((vehicle) => vehicle.status === "manutencao"),
      emergencyVehicles: vehicles.filter((vehicle) => vehicle.status === "pane_em_rota" || vehicle.status === "aguardando_auxilio"),
      openProblems,
      criticalProblems: openProblems.filter((problem) => problem.gravidade === "critica" || problem.gravidade === "alta"),
    };
  }, [data.problems, data.vehicles]);

  const quickResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];

    return data.vehicles
      .filter((vehicle) => (
        vehicle.numeroRegistro.toLowerCase().includes(term)
        || statusLabel(vehicle.status).toLowerCase().includes(term)
        || String(vehicle.releasedToDriverName || "").toLowerCase().includes(term)
      ))
      .sort(vehicleSort)
      .slice(0, 8);
  }, [data.vehicles, search]);

  const stats = [
    { label: "Alertas", value: grouped.criticalProblems.length + grouped.emergencyVehicles.length, icon: ShieldAlert, tone: "text-destructive" },
    { label: "Em rota", value: grouped.inRoute.length, icon: Route, tone: "text-primary" },
    { label: "Liberados", value: grouped.released.length, icon: KeyRound, tone: "text-indigo-600" },
    { label: "Na rua", value: grouped.street.length, icon: MapPin, tone: "text-sky-600" },
    { label: "Garagem", value: grouped.garage.length, icon: Warehouse, tone: "text-emerald-600" },
    { label: "Ocorrencias", value: grouped.openProblems.length, icon: AlertTriangle, tone: "text-amber-600" },
  ];

  if (loading) {
    return <div>Carregando Gestor Express...</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-8">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gestor Express</h2>
            <p className="text-sm text-muted-foreground">Operacao compacta em tempo real.</p>
          </div>
          <Badge variant="outline" className="shrink-0">
            {pendingWrites ? "Sincronizando" : "Ao vivo"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="rounded-md">
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <div className="text-xl font-bold">{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </div>
                <Icon className={`h-5 w-5 ${item.tone}`} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-md">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar veiculo, status ou motorista"
              className="pl-9"
            />
          </div>
          {search.trim() && (
            <div className="mt-3 space-y-2">
              {quickResults.map((vehicle) => {
                const route = activeRoutesByVehicle.get(vehicle.id);
                const driver = findDriver(route, data.drivers);
                return (
                  <VehicleLine key={vehicle.firestoreId || vehicle.id} vehicle={vehicle} route={route} driver={driver} />
                );
              })}
              {quickResults.length === 0 && (
                <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Nenhum veiculo encontrado.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {(grouped.emergencyVehicles.length > 0 || grouped.criticalProblems.length > 0) && (
        <Card className="rounded-md border-destructive/40">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Alertas criticos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {grouped.emergencyVehicles.map((vehicle) => {
              const route = activeRoutesByVehicle.get(vehicle.id);
              const driver = findDriver(route, data.drivers);
              return <VehicleLine key={vehicle.firestoreId || vehicle.id} vehicle={vehicle} route={route} driver={driver} compact />;
            })}
            {grouped.criticalProblems.slice(0, 5).map((problem) => {
              const vehicle = data.vehicles.find((item) => item.id === problem.vehicleId);
              const route = activeRoutesByVehicle.get(problem.vehicleId);
              const driver = findDriver(route, data.drivers) || data.drivers.find((item) => item.id === problem.driverId);
              return (
                <ProblemLine
                  key={problem.firestoreId || problem.id}
                  problem={problem}
                  vehicle={vehicle}
                  driver={driver}
                />
              );
            })}
          </CardContent>
        </Card>
      )}

      <Section title="Veiculos em rota" icon={Route} count={grouped.inRoute.length}>
        {grouped.inRoute.slice(0, 12).map((vehicle) => {
          const route = activeRoutesByVehicle.get(vehicle.id);
          const driver = findDriver(route, data.drivers);
          return <VehicleLine key={vehicle.firestoreId || vehicle.id} vehicle={vehicle} route={route} driver={driver} />;
        })}
      </Section>

      <Section title="Liberados" icon={KeyRound} count={grouped.released.length}>
        {grouped.released.slice(0, 12).map((vehicle) => (
          <VehicleLine key={vehicle.firestoreId || vehicle.id} vehicle={vehicle} driverName={vehicle.releasedToDriverName || vehicle.releasedToDriverNumber || "Motorista nao informado"} />
        ))}
      </Section>

      <Section title="Disponiveis na rua" icon={MapPin} count={grouped.street.length}>
        {grouped.street.slice(0, 12).map((vehicle) => (
          <VehicleLine key={vehicle.firestoreId || vehicle.id} vehicle={vehicle} />
        ))}
      </Section>

      <Section title="Garagem" icon={Warehouse} count={grouped.garage.length}>
        {grouped.garage.slice(0, 12).map((vehicle) => (
          <VehicleLine key={vehicle.firestoreId || vehicle.id} vehicle={vehicle} />
        ))}
      </Section>

      <Section title="Ocorrencias abertas" icon={AlertTriangle} count={grouped.openProblems.length}>
        {grouped.openProblems.slice(0, 10).map((problem) => {
          const vehicle = data.vehicles.find((item) => item.id === problem.vehicleId);
          const route = activeRoutesByVehicle.get(problem.vehicleId);
          const driver = findDriver(route, data.drivers) || data.drivers.find((item) => item.id === problem.driverId);
          return <ProblemLine key={problem.firestoreId || problem.id} problem={problem} vehicle={vehicle} driver={driver} />;
        })}
      </Section>

      <Card className="rounded-md">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-5 w-5" />
            Dispositivos ativos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0">
          {data.vehicleDevices.slice(0, 8).map((device) => (
            <div key={device.deviceId} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{device.deviceName || device.deviceId}</div>
                <div className="truncate text-xs text-muted-foreground">{device.vehicleLabel || "Sem veiculo vinculado"}</div>
              </div>
              <Badge variant="outline" className="shrink-0">Ativo</Badge>
            </div>
          ))}
          {data.vehicleDevices.length === 0 && <EmptyLine text="Nenhum dispositivo ativo." />}
        </CardContent>
      </Card>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: typeof Car;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-md">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
          </span>
          <Badge variant="outline">{count}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {count > 0 ? children : <EmptyLine text="Nada para exibir agora." />}
      </CardContent>
    </Card>
  );
}

function VehicleLine({
  vehicle,
  route,
  driver,
  driverName,
  compact = false,
}: {
  vehicle: Vehicle;
  route?: FleetRoute;
  driver?: Driver;
  driverName?: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">Veiculo {vehicle.numeroRegistro}</span>
          </div>
          {!compact && (
            <div className="mt-1 truncate text-xs text-muted-foreground">
              {driver?.nome || driverName || "Sem motorista vinculado"}
              {route?.startedAt ? ` - inicio ${formatDateTime(route.startedAt)}` : ""}
            </div>
          )}
        </div>
        <Badge variant="outline" className={`shrink-0 ${statusClass(vehicle.status)}`}>
          {statusLabel(vehicle.status)}
        </Badge>
      </div>
    </div>
  );
}

function ProblemLine({
  problem,
  vehicle,
  driver,
}: {
  problem: Problem;
  vehicle?: Vehicle;
  driver?: Driver;
}) {
  const hasLocation = typeof problem.location?.latitude === "number" && typeof problem.location?.longitude === "number";

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium">{problem.observacao}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground">
            Veiculo {vehicle?.numeroRegistro || problem.vehicleId} - {driver?.nome || "motorista nao identificado"}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDateTime(problem.createdAt)}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge variant={problem.gravidade === "critica" || problem.gravidade === "alta" ? "destructive" : "outline"}>
            {problem.gravidade}
          </Badge>
          {hasLocation && problem.location && (
            <a className="text-xs text-primary underline-offset-4 hover:underline" href={getMapUrl(problem.location)} target="_blank" rel="noreferrer">
              Mapa
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      <CheckCircle2 className="h-4 w-4" />
      {text}
    </div>
  );
}
