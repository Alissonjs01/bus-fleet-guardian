import { useNavigate } from "react-router-dom";
import { BarChart3, Bus, Lock, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { mobileStorage } from "../../mobile-app/src/utils/storage";

export default function MobileEntry() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasDriverSession = mobileStorage.isLoggedIn();
  const canOpenExpress = !!user && ["admin", "gestor", "lider_garagem"].includes(user.role);

  const openExpress = () => {
    if (canOpenExpress) {
      navigate("/gestor-express");
      return;
    }

    navigate("/login", { state: { from: "/gestor-express" } });
  };

  return (
    <div className="min-h-screen bg-background p-4 text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-5 py-8">
        <div className="space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Smartphone className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sistema de Frota</h1>
          <p className="text-sm text-muted-foreground">
            Escolha como vai usar o sistema neste aparelho.
          </p>
        </div>

        <div className="space-y-3">
          <Card className="rounded-md">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Bus className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold">Operacao do motorista</h2>
                  <p className="text-sm text-muted-foreground">
                    Iniciar rota, encerrar operacao e criar relatorio pelo celular ou dispositivo do veiculo.
                  </p>
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={() => navigate("/mobile")}>
                {hasDriverSession ? "Continuar operacao" : "Entrar como motorista"}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-md">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-info/10 text-info">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold">Gestor Express</h2>
                  <p className="text-sm text-muted-foreground">
                    Visualizacao compacta para acompanhar operacao, alertas e veiculos em campo.
                  </p>
                </div>
              </div>
              <Button className="w-full" size="lg" variant="outline" onClick={openExpress}>
                {canOpenExpress ? "Abrir Gestor Express" : "Login do gestor"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {!canOpenExpress && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Gestor Express usa o mesmo login e permissoes do painel.
          </div>
        )}
      </div>
    </div>
  );
}
