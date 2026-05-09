import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
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

interface DesktopGateProps {
  onRealLogin: () => void;
}

export function DesktopGate({ onRealLogin }: DesktopGateProps) {
  const [email, setEmail] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const sanitizeAccessKey = (value: string) => value.replace(/\s+/g, "").replace(/[^a-zA-Z0-9_.@-]/g, "");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !accessKey.trim()) {
      setError("Preencha email e chave de liberacao");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await addDoc(collection(db, "managerAccessRequests"), {
        email: email.trim().toLowerCase(),
        accessKey: accessKey.trim(),
        status: "pending",
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
      setAccessKey("");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/80 bg-card/95 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            {submitted ? <ShieldCheck className="h-7 w-7 text-primary" /> : <KeyRound className="h-7 w-7 text-primary" />}
          </div>
          <CardTitle className="text-2xl">
            {submitted ? "Solicitacao enviada" : "Solicitacao de acesso"}
          </CardTitle>
          <CardDescription>
            {submitted ? "Aguarde liberacao do suporte." : "Informe os dados para solicitar acesso"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {submitted ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/70 bg-muted/30 p-5 text-center text-sm text-muted-foreground">
                O suporte recebeu sua solicitacao e ira liberar o acesso em breve. Voce recebera um email com o codigo de acesso assim que estiver aprovado.
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={onRealLogin}>
                Entrar com conta existente
              </Button>
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
                <Label htmlFor="desktop-gate-key">Digite sua chave</Label>
                <Input
                  id="desktop-gate-key"
                  type="password"
                  value={accessKey}
                  onChange={(event) => setAccessKey(sanitizeAccessKey(event.target.value))}
                  onPaste={(event) => {
                    event.preventDefault();
                    setAccessKey(sanitizeAccessKey(event.clipboardData.getData("text")));
                  }}
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
                  "Solicitar acesso"
                )}
              </Button>

              <Button type="button" variant="ghost" className="w-full" onClick={onRealLogin} disabled={isSaving}>
                Entrar com conta existente
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
