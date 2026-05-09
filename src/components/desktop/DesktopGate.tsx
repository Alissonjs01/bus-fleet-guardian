import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/integrations/firebase/client";

function getDeviceInfo() {
  return {
    platform: navigator.platform || "unknown",
    language: navigator.language || "unknown",
    screen: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    online: navigator.onLine,
  };
}

export function DesktopGate() {
  const [email, setEmail] = useState("");
  const [secretInput, setSecretInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !secretInput.trim()) {
      setError("Preencha email e codigo temporario");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await addDoc(collection(db, "desktopGateAnswers"), {
        email: email.trim().toLowerCase(),
        answered: true,
        secretProvided: true,
        secretLength: secretInput.length,
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent,
        deviceInfo: getDeviceInfo(),
      });
      setSubmitted(true);
    } catch (saveError) {
      console.error("Erro ao salvar resposta temporaria do desktop gate:", saveError);
      setSubmitted(true);
    } finally {
      setIsSaving(false);
      setSecretInput("");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/80 bg-card/95 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            {submitted ? <ShieldCheck className="h-7 w-7 text-primary" /> : <Lock className="h-7 w-7 text-primary" />}
          </div>
          <CardTitle className="text-2xl">
            {submitted ? "Aguardando liberacao do suporte." : "Validacao de Acesso"}
          </CardTitle>
          <CardDescription>
            {submitted ? "Sua solicitacao foi registrada para analise." : "Informe os dados para continuar"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {submitted ? (
            <div className="rounded-lg border border-border/70 bg-muted/30 p-5 text-center text-sm text-muted-foreground">
              O suporte recebeu sua solicitacao e liberara o acesso quando estiver tudo certo.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="space-y-2">
                <Label htmlFor="desktop-gate-email">Digite seu e-mail</Label>
                <Input
                  id="desktop-gate-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSaving}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desktop-gate-secret">Digite seu codigo temporario</Label>
                <Input
                  id="desktop-gate-secret"
                  type="password"
                  value={secretInput}
                  onChange={(event) => setSecretInput(event.target.value)}
                  disabled={isSaving}
                  autoComplete="off"
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  "Continuar"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
