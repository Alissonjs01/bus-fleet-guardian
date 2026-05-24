import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Loader2, Radio, Search, ShieldAlert, Wifi } from "lucide-react";
import { AdminLayout } from "@/admin/components/AdminLayout";
import { useAdminAuth } from "@/admin/hooks/useAdminAuth";
import { subscribeOperationalEvents, type OperationalEvent } from "@/admin/services/adminService";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/utils/dateFormat";

const TYPE_LABELS: Record<OperationalEvent["type"] | "all", string> = {
  all: "Todos",
  route_start: "Rotas iniciadas",
  route_end: "Rotas finalizadas",
  issue: "Ocorrencias",
  vehicle_release: "Liberacoes",
  vehicle_maintenance: "Manutencao",
  login: "Login",
  session: "Sessoes",
  access: "Acessos",
};

function eventIcon(type: OperationalEvent["type"]) {
  if (type === "issue" || type === "vehicle_maintenance") return AlertTriangle;
  if (type === "route_start" || type === "route_end") return Activity;
  if (type === "login" || type === "session") return Wifi;
  if (type === "access") return ShieldAlert;
  return CheckCircle2;
}

function toneClass(tone: OperationalEvent["tone"]) {
  return {
    success: "border-success/30 bg-success/10 text-success",
    warning: "border-warning/30 bg-warning/10 text-warning",
    destructive: "border-destructive/30 bg-destructive/10 text-destructive",
    info: "border-info/30 bg-info/10 text-info",
    muted: "border-white/10 bg-muted/20 text-muted-foreground",
  }[tone];
}

const ActivityLogs = () => {
  const { requireAuth, isLoading: authLoading, isAuthenticated } = useAdminAuth();
  const [events, setEvents] = useState<OperationalEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<OperationalEvent["type"] | "all">("all");

  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    return subscribeOperationalEvents(setEvents);
  }, [isAuthenticated]);

  const filteredEvents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return events
      .filter((event) => typeFilter === "all" || event.type === typeFilter)
      .filter((event) => !term || `${event.title} ${event.detail || ""}`.toLowerCase().includes(term));
  }, [events, searchTerm, typeFilter]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090d]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="rounded-2xl border border-white/10 bg-card/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                Auditoria em tempo real
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Logs operacionais</h1>
              <p className="mt-2 text-muted-foreground">
                Timeline limpa com rotas, ocorrencias, liberacoes, manutencao, login e sessoes.
              </p>
            </div>
            <Badge className="w-fit bg-primary text-primary-foreground">{filteredEvents.length} evento(s)</Badge>
          </div>
        </section>

        <Card className="border-white/10 bg-card/70">
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_240px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar na timeline..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="border-white/10 bg-background/50 pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={(value: OperationalEvent["type"] | "all") => setTypeFilter(value)}>
                <SelectTrigger className="border-white/10 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEvents.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-background/30 p-10 text-center text-muted-foreground">
                Nenhum evento encontrado para os filtros atuais.
              </div>
            ) : (
              <div className="relative space-y-3 before:absolute before:bottom-3 before:left-5 before:top-3 before:w-px before:bg-white/10">
                {filteredEvents.map((event) => {
                  const Icon = eventIcon(event.type);
                  return (
                    <div key={event.id} className="relative flex gap-4 rounded-xl border border-white/10 bg-background/40 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25">
                      <div className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${toneClass(event.tone)}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="font-medium">{event.title}</div>
                          <div className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</div>
                        </div>
                        {event.detail && <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p>}
                        <Badge variant="outline" className="mt-3">{TYPE_LABELS[event.type]}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ActivityLogs;
