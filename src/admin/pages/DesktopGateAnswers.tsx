import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { CheckCircle, KeyRound, Loader2, Monitor, Trash2, XCircle } from "lucide-react";
import { AdminLayout } from "@/admin/components/AdminLayout";
import { useAdminAuth } from "@/admin/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/integrations/firebase/client";
import { formatDateTime } from "@/utils/dateFormat";
import { useToast } from "@/hooks/use-toast";

interface ManagerAccessRequest {
  id: string;
  email: string;
  accessKey: string;
  answer: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
  reviewedAt?: string;
  userAgent?: string;
  deviceInfo?: {
    platform?: string;
    language?: string;
    screen?: string;
    viewport?: string;
    online?: boolean;
  };
}

function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return undefined;
}

export default function DesktopGateAnswers() {
  const { requireAuth, isLoading: authLoading, isAuthenticated } = useAdminAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ManagerAccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const answersQuery = query(collection(db, "managerAccessRequests"), orderBy("createdAt", "desc"));
    return onSnapshot(
      answersQuery,
      (snapshot) => {
        setLoadError("");
        setRequests(snapshot.docs.map((item) => {
          const data = item.data();
          return {
            id: item.id,
            email: String(data.email || ""),
            accessKey: String(data.accessKey || ""),
            answer: String(data.answer || data.accessKey || ""),
            status: data.status === "approved" || data.status === "rejected" ? data.status : "pending",
            createdAt: toIso(data.createdAt),
            reviewedAt: toIso(data.reviewedAt),
            userAgent: data.userAgent ? String(data.userAgent) : undefined,
            deviceInfo: data.deviceInfo,
          };
        }));
        setIsLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar solicitacoes do gestor:", error);
        setLoadError("Nao foi possivel carregar as solicitacoes. Verifique o acesso admin e as regras do Firestore.");
        setIsLoading(false);
      },
    );
  }, [isAuthenticated]);

  const updateStatus = async (requestId: string, status: ManagerAccessRequest["status"]) => {
    setSavingId(requestId);
    try {
      await updateDoc(doc(db, "managerAccessRequests", requestId), {
        status,
        reviewedAt: serverTimestamp(),
      });
    } finally {
      setSavingId(null);
    }
  };

  const deleteRequest = async (requestId: string) => {
    setDeletingId(requestId);
    try {
      await deleteDoc(doc(db, "managerAccessRequests", requestId));
      toast({ title: "Solicitacao apagada", description: "Registro removido definitivamente do Firestore." });
    } catch (error) {
      toast({
        title: "Erro ao apagar",
        description: error instanceof Error ? error.message : "Nao foi possivel apagar esta solicitacao.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const deleteAllRequests = async () => {
    if (requests.length === 0 || isDeletingAll) return;
    if (!confirm(`Apagar definitivamente ${requests.length} solicitacao(oes) antigas do gestor?`)) return;

    setIsDeletingAll(true);
    try {
      await Promise.all(requests.map((request) => deleteDoc(doc(db, "managerAccessRequests", request.id))));
      toast({ title: "Solicitacoes limpas", description: "Todos os registros antigos foram removidos do Firestore." });
    } catch (error) {
      toast({
        title: "Erro ao limpar",
        description: error instanceof Error ? error.message : "Nao foi possivel limpar todas as solicitacoes.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  const getStatusBadge = (status: ManagerAccessRequest["status"]) => {
    if (status === "approved") return <Badge className="bg-success text-success-foreground">Aprovada</Badge>;
    if (status === "rejected") return <Badge variant="destructive">Rejeitada</Badge>;
    return <Badge variant="secondary">Pendente</Badge>;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Solicitacoes de Acesso</h1>
            <p className="text-muted-foreground">Historico antigo da tela de solicitacao do gestor, com limpeza definitiva do banco.</p>
          </div>
          <Button variant="destructive" onClick={deleteAllRequests} disabled={requests.length === 0 || isDeletingAll}>
            {isDeletingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Limpar tudo
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5" />
              Solicitacoes registradas ({requests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : loadError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {loadError}
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                Nenhuma solicitacao registrada ainda
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div key={request.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">E-mail informado</div>
                        <div className="mt-1 text-xl font-semibold">{request.email || "Nao informado"}</div>
                        <div className="mt-2 text-sm text-muted-foreground">Codigo enviado</div>
                        <div className="mt-1 font-mono text-base text-foreground">{request.answer || "Nao informada"}</div>
                        <div className="mt-3 flex flex-wrap gap-2">{getStatusBadge(request.status)}</div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          Criada: {request.createdAt ? formatDateTime(request.createdAt) : "Data pendente"}
                        </div>
                        {request.reviewedAt && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            Revisada: {formatDateTime(request.reviewedAt)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 text-sm text-muted-foreground md:max-w-xl md:text-right">
                        <div className="flex items-center gap-2 text-foreground">
                          <Monitor className="h-4 w-4" />
                          Dispositivo
                        </div>
                        <div className="mt-2 grid gap-1 md:justify-items-end">
                          <span>Plataforma: {request.deviceInfo?.platform || "Nao informado"}</span>
                          <span>Tela: {request.deviceInfo?.screen || "Nao informado"}</span>
                          <span>Viewport: {request.deviceInfo?.viewport || "Nao informado"}</span>
                          <span>Idioma: {request.deviceInfo?.language || "Nao informado"}</span>
                          <span className="max-w-xl truncate">User agent: {request.userAgent || "Nao informado"}</span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 md:justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(request.id, "approved")}
                            disabled={savingId === request.id}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(request.id, "rejected")}
                            disabled={savingId === request.id}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Rejeitar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteRequest(request.id)}
                            disabled={deletingId === request.id || isDeletingAll}
                          >
                            {deletingId === request.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Apagar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
