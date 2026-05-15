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
  Radio,
  Shield,
  Sparkles,
  UserCog,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/admin/components/AdminLayout";
import { useAdminAuth } from "@/admin/hooks/useAdminAuth";
import { subscribeAccessUsers } from "@/admin/services/accessService";
import { getActivityLogs, subscribeLicenses } from "@/admin/services/adminService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFleetData } from "@/hooks/useFleetData";
import { db } from "@/integrations/firebase/client";
import type { AppUser } from "@/types/auth";
import type { ActivityLog, License } from "@/types/license";
import { formatDateTime } from "@/utils/dateFormat";

interface ManagerAccessRequest {
  id: string;
  email: string;
  answer: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
  userAgent?: string;
}

function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return undefined;
}

function AdminStatusBadge({ status }: { status: string }) {
  if (status === "active" || status === "approved") {
    return <Badge className="bg-success text-success-foreground">Ativo</Badge>;
  }
  if (status === "blocked" || status === "rejected") {
    return <Badge variant="destructive">Bloqueado</Badge>;
  }
  if (status === "expired") {
    return <Badge className="bg-warning text-warning-foreground">Expirado</Badge>;
  }
  return <Badge variant="secondary">Pendente</Badge>;
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = "primary",
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: typeof Shield;
  tone?: "primary" | "success" | "warning" | "destructive";
}) {
  const toneClass = {
    primary: "text-primary bg-primary/10 border-primary/20",
    success: "text-success bg-success/10 border-success/20",
    warning: "text-warning bg-warning/10 border-warning/20",
    destructive: "text-destructive bg-destructive/10 border-destructive/20",
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

const AdminDashboard = () => {
  const { requireAuth, isLoading: authLoading, isAuthenticated } = useAdminAuth();
  const { data: fleetData, loading: fleetLoading } = useFleetData();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [requests, setRequests] = useState<ManagerAccessRequest[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingRequestId, setSavingRequestId] = useState<string | null>(null);

  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  useEffect(() => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    const unsubscribers = [
      subscribeAccessUsers((nextUsers) => setUsers(nextUsers)),
      subscribeLicenses((nextLicenses) => setLicenses(nextLicenses)),
      onSnapshot(
        query(collection(db, "managerAccessRequests"), orderBy("createdAt", "desc")),
        (snapshot) => {
          setRequests(snapshot.docs.map((item) => {
            const data = item.data();
            return {
              id: item.id,
              email: String(data.email || ""),
              answer: String(data.answer || data.accessKey || ""),
              status: data.status === "approved" || data.status === "rejected" ? data.status : "pending",
              createdAt: toIso(data.createdAt),
              userAgent: data.userAgent ? String(data.userAgent) : undefined,
            };
          }));
        },
      ),
    ];

    getActivityLogs().then((result) => {
      setLogs((result.logs || []).slice(0, 6));
      setIsLoading(false);
    }).catch(() => setIsLoading(false));

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

  const pendingRequests = requests.filter((request) => request.status === "pending");
  const activeUsers = users.filter((user) => user.status === "active").length;
  const blockedUsers = users.filter((user) => user.status === "blocked").length;
  const activeLicenses = licenses.filter((license) => license.status === "active").length;
  const blockedLicenses = licenses.filter((license) => license.status === "blocked" || license.status === "expired").length;
  const openProblems = fleetData.problems.filter((problem) => ["aberta", "em_andamento"].includes(problem.status)).length;
  const vehiclesAttention = fleetData.vehicles.filter((vehicle) => ["manutencao", "pane_em_rota", "aguardando_auxilio"].includes(vehicle.status)).length;

  const recentUsers = useMemo(() => users.slice(0, 5), [users]);
  const recentLicenses = useMemo(() => licenses.slice(0, 5), [licenses]);

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
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                Central admin em tempo real
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Central de comando</h1>
              <p className="mt-3 text-muted-foreground">
                Controle geral de acessos, solicitacoes, status operacional e sinais importantes do Firebase.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:min-w-80">
              <div className="rounded-xl border border-white/10 bg-background/40 p-3">
                <div className="text-xs">Firestore</div>
                <div className="mt-1 flex items-center gap-2 font-medium text-primary">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  sincronizando em tempo real
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-background/40 p-3">
                <div className="text-xs">Modo</div>
                <div className="mt-1 font-medium text-foreground">controle geral</div>
              </div>
            </div>
          </div>
        </section>

        {isLoading || fleetLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="Solicitacoes pendentes" value={pendingRequests.length} detail="Aguardando sua liberacao" icon={Monitor} tone={pendingRequests.length > 0 ? "warning" : "success"} />
              <MetricCard title="Gestores ativos" value={activeUsers} detail={`${blockedUsers} bloqueado(s)`} icon={UserCog} tone="primary" />
              <MetricCard title="Acessos ativos" value={activeLicenses} detail={`${blockedLicenses} bloqueado(s)/expirado(s)`} icon={Key} tone="success" />
              <MetricCard title="Frota em atencao" value={vehiclesAttention} detail={`${openProblems} ocorrencia(s) aberta(s)`} icon={AlertTriangle} tone={vehiclesAttention > 0 ? "destructive" : "success"} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
              <Card className="border-white/10 bg-card/70">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" />
                    Solicitacoes de gestor
                  </CardTitle>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/admin/manager-access">Ver todas</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {pendingRequests.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-background/30 p-8 text-center text-muted-foreground">
                      Nenhuma solicitacao pendente agora.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingRequests.slice(0, 5).map((request) => (
                        <div key={request.id} className="rounded-xl border border-white/10 bg-background/40 p-4 transition-colors hover:border-primary/25">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                              <div className="font-medium">{request.email || "Email nao informado"}</div>
                              <div className="mt-1 font-mono text-sm text-primary">{request.answer || "Sem resposta"}</div>
                              <div className="mt-2 text-xs text-muted-foreground">
                                {request.createdAt ? formatDateTime(request.createdAt) : "Data pendente"}
                              </div>
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
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Status operacional
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

            <div className="grid gap-6 xl:grid-cols-3">
              <Card className="border-white/10 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCog className="h-5 w-5 text-primary" />
                    Usuarios recentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentUsers.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nenhum gestor cadastrado.</div>
                  ) : recentUsers.map((user) => (
                    <div key={user.id} className="rounded-xl border border-white/10 bg-background/40 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{user.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                        </div>
                        <AdminStatusBadge status={user.status} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" />
                    Acessos recentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentLicenses.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nenhuma chave registrada.</div>
                  ) : recentLicenses.map((license) => (
                    <div key={license.id} className="rounded-xl border border-white/10 bg-background/40 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-mono text-xs">{license.displayCode || license.key}</div>
                          <div className="text-xs text-muted-foreground">expira {license.expires_at ? formatDateTime(license.expires_at) : "sem data"}</div>
                        </div>
                        <AdminStatusBadge status={license.status} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Logs importantes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {logs.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nenhum log encontrado.</div>
                  ) : logs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-white/10 bg-background/40 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {log.action || "acao"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(log.created_at)}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className="border-white/10 bg-card/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Configuracoes rapidas
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <Button asChild variant="outline" className="justify-start">
                  <Link to="/admin/licenses"><Key className="mr-2 h-4 w-4" />Criar acesso gestor</Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link to="/admin/manager-access"><Monitor className="mr-2 h-4 w-4" />Revisar solicitacoes</Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link to="/admin/logs"><Activity className="mr-2 h-4 w-4" />Ver logs</Link>
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
