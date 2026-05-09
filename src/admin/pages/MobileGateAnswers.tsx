import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Footprints, Loader2, Smartphone } from "lucide-react";
import { AdminLayout } from "@/admin/components/AdminLayout";
import { useAdminAuth } from "@/admin/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/integrations/firebase/client";
import { formatDateTime } from "@/utils/dateFormat";

interface MobileGateAnswer {
  id: string;
  question: string;
  answerCm: number;
  createdAt?: string;
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

export default function MobileGateAnswers() {
  const { requireAuth, isLoading: authLoading, isAuthenticated } = useAdminAuth();
  const [answers, setAnswers] = useState<MobileGateAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const answersQuery = query(collection(db, "mobileGateAnswers"), orderBy("createdAt", "desc"));
    return onSnapshot(
      answersQuery,
      (snapshot) => {
        setAnswers(snapshot.docs.map((item) => {
          const data = item.data();
          return {
            id: item.id,
            question: String(data.question || ""),
            answerCm: Number(data.answerCm || 0),
            createdAt: toIso(data.createdAt),
            userAgent: data.userAgent ? String(data.userAgent) : undefined,
            deviceInfo: data.deviceInfo,
          };
        }));
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
  }, [isAuthenticated]);

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
        <div>
          <h1 className="text-2xl font-bold text-foreground">Respostas Mobile</h1>
          <p className="text-muted-foreground">Respostas da tela temporaria de entrada do mobile</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Footprints className="h-5 w-5" />
              Medidas respondidas ({answers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : answers.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                Nenhuma resposta registrada ainda
              </div>
            ) : (
              <div className="space-y-3">
                {answers.map((answer) => (
                  <div key={answer.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">{answer.question}</div>
                        <div className="mt-1 text-3xl font-bold">{answer.answerCm} cm</div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {answer.createdAt ? formatDateTime(answer.createdAt) : "Data pendente"}
                        </div>
                      </div>

                      <div className="min-w-0 text-sm text-muted-foreground md:max-w-xl">
                        <div className="flex items-center gap-2 text-foreground">
                          <Smartphone className="h-4 w-4" />
                          Dispositivo
                        </div>
                        <div className="mt-2 grid gap-1">
                          <span>Plataforma: {answer.deviceInfo?.platform || "Nao informado"}</span>
                          <span>Tela: {answer.deviceInfo?.screen || "Nao informado"}</span>
                          <span>Viewport: {answer.deviceInfo?.viewport || "Nao informado"}</span>
                          <span>Idioma: {answer.deviceInfo?.language || "Nao informado"}</span>
                          <span className="truncate">User agent: {answer.userAgent || "Nao informado"}</span>
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
