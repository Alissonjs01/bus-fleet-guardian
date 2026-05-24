import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Key,
  Loader2,
  Monitor,
  Power,
  Radio,
  Shield,
  Sparkles,
  UserCog,
  Users,
  Wifi,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/admin/components/AdminLayout";
import { useAdminAuth } from "@/admin/hooks/useAdminAuth";
import { subscribeAccessUsers } from "@/admin/services/accessService";
import {
  subscribeLicenses,
  subscribeOperationalEvents,
  subscribeUserSessions,
  terminateUserSession,
  type OperationalEvent,
  type UserSession,
} from "@/admin/services/adminService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFleetData } from "@/hooks/useFleetData";
import { db } from "@/integrations/firebase/client";
import type { AppUser } from "@/types/auth";
import type { License } from "@/types/license";
import { formatDateTime } from "@/utils/dateFormat";

interface ManagerAccessRequest {
  id: string;
  email: string;
  answer: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
}

function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return undefined;
}

function isSessionOnline(session: UserSession) {
  if (session.status !== "online" || !session.lastSeenAt) return false;
  return Date.now() - new Date(session.lastSeenAt).getTime() < 90000;
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    admin: "Admin",
    gestor: "Gestor",
    lider_garagem: "Lider de garagem",
    motorista: "Motorista",
  };
  return labels[role] || role || "Usuario";
}

function relativeActivity(value?: string) {
  if (!value) return "sem atividade";
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 60000) return "agora";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return formatDateTime(value);
}

function MetricCard({ title, value, detail, icon: Icon, tone = "primary" }: {
  title: string;
  value: string | number;
  detail: string;
  icon: typeof Shield;
  tone?: "primary" | "success" | "warning" | "destructive" | "info";
}) {
  const toneClass = {
    primary: "text-primary bg-primary/10 border-primary/20",
    success: "text-success bg-success/10 border-success/20",
    warning: "text-warning bg-warning/10 border-warning/20",
    destructive: "text-destructive bg-destructive/10 border-destructive/20",
    info: "text-info bg-info/10 border-info/20",
  }[tone];

  return (
    <Card className="group overflow-hidden border-white/10 bg-card/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${toneClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EventDot({ event }: { event: OperationalEvent }) {
  const className = {
    success: "bg-success shadow-[0_0_18px_rgba(34,197,94,0.45)]",
    warning: "bg-warning shadow-[0_0_18px_rgba(245,158,11,0.45)]",
    destructive: "bg-destructive shadow-[0_0_18px_rgba(239,68,68,0.45)]",
    info: "bg-info shadow-[0_0_18px_rgba(59,130,246,0.45)]",
    muted: "bg-muted-foreground",
  }[event.tone];
  return <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${className}`} />;
}

const AdminDashboard = () => {
  const { requireAuth, isLoading: authLoading, isAuthenticated } = useAdminAuth();
  const { data: fleetData, loading: fleetLoading } = useFleetData();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [events, setEvents] = useState<OperationalEvent[]>([]);
  const [requests, setRequests] = useState<ManagerAccessRequest[]>([]);
  const [savingRequestId, setSavingRequestId] = useState<string | null>(null);
  const [terminatingSessionId, setTerminatingSessionId] = useState<string | null>(null);

  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const unsubscribers = [
      subscribeAccessUsers(setUsers),
      subscribeLicenses(setLicenses),
      subscribeUserSessions(setSessions),
      subscribeOperationalEvents(setEvents),
      onSnapshot(query(collection(db, "managerAccessRequests"), orderBy("createdAt", "desc")), (snapshot) => {
        setRequests(snapshot.docs.map((item) => {
          const data = item.data();
          return {
            id: item.id,
            email: String(data.email || ""),
            answer: String(data.answer || data.accessKey || ""),
            status: data.status === "approved" || data.status === "rejected" ? data.status : "pending",
            createdAt: toIso(data.createdAt),
          };
        }));
      }),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [isAuthenticated]);

  const updateRequestStatus = async (requestId: string, status: ManagerAccessRequest["status"]) => {
    setSavingRequestId(requestId);
    try {
      await updateDoc(doc(db, "managerAccessRequests", requestId), {
        status,
        reviewedAt: serverTimestamp(),
      });
    } finally {
      setSavingRequestId(null);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    setTerminatingSessionId(sessionId);
    try {
      await terminateUserSession(sessionId);
    } finally {
      setTerminatingSessionId(null);
    }
  };

  const onlineSessions = sessions.filter(isSessionOnline);
  const activeUsers = users.filter((user) => user.status === "active").length;
  const activeLicenses = licenses.filter((license) => license.status === "active").length;
  const pendingRequests = requests.filter((request) => request.status === "pending");
  const openProblems = fleetData.problems.filter((problem) => ["aberta", "em_andamento"].includes(problem.status)).length;
  const vehiclesAttention = fleetData.vehicles.filter((vehicle) => ["manutencao", "pane_em_rota", "aguardando_auxilio"].includes(vehicle.status)).length;

  const sessionsByUser = useMemo(() => {
    return users.map((user) => {
      const userSessions = sessions.filter((session) => session.userId === user.id);
      const online = userSessions.filter(isSessionOnline);
      const last = [...userSessions].sort((a, b) => new Date(b.lastSeenAt || b.createdAt || 0).getTime() - new Date(a.lastSeenAt || a.createdAt || 0).getTime())[0];
      return { user, sessions: userSessions, online, last };
    }).sort((a, b) => b.online.length - a.online.length || new Date(b.last?.lastSeenAt || 0).getTime() - new Date(a.last?.lastSeenAt || 0).getTime());
  }, [sessions, users]);

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
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-card/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                Central admin em tempo real
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Central de comando</h1>
              <p className="mt-3 text-muted-foreground">
                Controle de acessos, sessoes ativas, auditoria operacional e sinais criticos do sistema.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:min-w-96">
              <div className="rounded-xl border border-white/10 bg-background/40 p-3">
                <div className="text-xs">Firestore</div>
                <div className="mt-1 flex items-center gap-2 font-medium text-primary">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  sincronizando
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-background/40 p-3">
                <div className="text-xs">Sessoes online</div>
                <div className="mt-1 font-medium text-foreground">{onlineSessions.length} agora</div>
              </div>
            </div>
          </div>
        </section>

        {fleetLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard title="Usuarios" value={activeUsers} detail={`${users.length} cadastrados`} icon={Users} />
              <MetricCard title="Online agora" value={onlineSessions.length} detail={`${sessions.length} sessoes registradas`} icon={Wifi} tone="success" />
              <MetricCard title="Acessos ativos" value={activeLicenses} detail={`${licenses.length} chaves totais`} icon={Key} tone="info" />
              <MetricCard title="Solicitacoes" value={pendingRequests.length} detail="aguardando revisao" icon={Monitor} tone={pendingRequests.length ? "warning" : "success"} />
              <MetricCard title="Frota em atencao" value={vehiclesAttention} detail={`${openProblems} ocorrencia(s) aberta(s)`} icon={AlertTriangle} tone={vehiclesAttention ? "destructive" : "success"} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="border-white/10 bg-card/70">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Timeline operacional
                  </CardTitle>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/admin/logs">Abrir logs</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {events.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-background/30 p-8 text-center text-muted-foreground">
                      Nenhuma atividade operacional registrada ainda.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {events.slice(0, 12).map((event) => (
                        <div key={event.id} className="flex gap-3 rounded-xl border border-white/10 bg-background/40 p-3 transition-colors hover:border-primary/25">
                          <EventDot event={event} />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{event.title}</div>
                            {event.detail && <div className="mt-1 truncate text-xs text-muted-foreground">{event.detail}</div>}
                          </div>
                          <div className="shrink-0 text-xs text-muted-foreground">{relativeActivity(event.createdAt)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wifi className="h-5 w-5 text-primary" />
                    Usuarios e sessoes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sessionsByUser.slice(0, 8).map(({ user, online, last, sessions: userSessions }) => (
                    <div key={user.id} className="rounded-xl border border-white/10 bg-background/40 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{user.name}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">{roleLabel(user.role)}</Badge>
                            <span className={online.length ? "text-success" : ""}>{online.length ? "Online agora" : `Ultima atividade: ${relativeActivity(last?.lastSeenAt || user.lastLoginAt)}`}</span>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {last ? `${last.os || "Dispositivo"} - ${last.browser || "Navegador"}` : "Nenhuma sessao registrada"}
                          </div>
                        </div>
                        <Badge className={online.length > 1 ? "bg-warning text-warning-foreground" : online.length ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
                          {online.length || userSessions.length} sessao{(online.length || userSessions.length) === 1 ? "" : "es"}
                        </Badge>
                      </div>
                      {online.slice(0, 2).map((session) => (
                        <div key={session.id} className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-background/50 px-3 py-2 text-xs">
                          <span>{session.os || "Dispositivo"} - {session.browser || "Navegador"}</span>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" disabled={terminatingSessionId === session.id} onClick={() => handleTerminateSession(session.id)}>
                            <Power className="mr-1 h-3.5 w-3.5" />
                            Encerrar
                          </Button>
                        </div>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
              <Card className="border-white/10 bg-card/70">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" />
                    Solicitacoes de acesso
                  </CardTitle>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/admin/manager-access">Ver todas</Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingRequests.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-background/30 p-6 text-center text-sm text-muted-foreground">Nenhuma solicitacao pendente.</div>
                  ) : pendingRequests.slice(0, 4).map((request) => (
                    <div key={request.id} className="rounded-xl border border-white/10 bg-background/40 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="font-medium">{request.email || "Email nao informado"}</div>
                          <div className="mt-1 font-mono text-sm text-primary">{request.answer || "Sem resposta"}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" disabled={savingRequestId === request.id} onClick={() => updateRequestStatus(request.id, "approved")}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Aprovar
                          </Button>
                          <Button size="sm" variant="outline" disabled={savingRequestId === request.id} onClick={() => updateRequestStatus(request.id, "rejected")}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Rejeitar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Operacao
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    ["Veiculos", fleetData.vehicles.length],
                    ["Motoristas", fleetData.drivers.length],
                    ["Rotas", fleetData.routes.length],
                    ["Ocorrencias", fleetData.problems.length],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between rounded-xl border border-white/10 bg-background/40 p-3">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className="border-white/10 bg-card/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Acoes rapidas
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <Button asChild variant="outline" className="justify-start">
                  <Link to="/admin/licenses"><Key className="mr-2 h-4 w-4" />Gerenciar acessos</Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link to="/admin/manager-access"><Monitor className="mr-2 h-4 w-4" />Revisar solicitacoes</Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link to="/admin/logs"><Clock className="mr-2 h-4 w-4" />Auditoria completa</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
