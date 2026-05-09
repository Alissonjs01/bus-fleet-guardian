import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Footprints, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { db } from "@/integrations/firebase/client";
import { MOBILE_GATE_CONFIG } from "../config/mobileGateConfig";

interface MobileGateProps {
  onComplete: () => void;
}

function getDeviceInfo() {
  return {
    platform: navigator.platform || "unknown",
    language: navigator.language || "unknown",
    screen: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    online: navigator.onLine,
  };
}

export function MobileGate({ onComplete }: MobileGateProps) {
  const [answerCm, setAnswerCm] = useState(14);
  const [isSaving, setIsSaving] = useState(false);

  const handleConfirm = async () => {
    setIsSaving(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      await addDoc(collection(db, "mobileGateAnswers"), {
        question: MOBILE_GATE_CONFIG.question,
        answerCm,
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent,
        deviceInfo: getDeviceInfo(),
      });
      localStorage.setItem(MOBILE_GATE_CONFIG.storageKey, "true");
      onComplete();
    } catch (error) {
      console.error("Erro ao salvar resposta temporaria do mobile gate:", error);
      localStorage.setItem(MOBILE_GATE_CONFIG.storageKey, "true");
      onComplete();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-semibold">Sistema de Frota</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            Check-in
          </div>
        </div>
      </header>

      <main className="p-4">
        <div className="mx-auto mt-10 max-w-md">
          <Card className="border-border/80 bg-card/95 shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Footprints className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl">{MOBILE_GATE_CONFIG.question}</CardTitle>
              <CardDescription>
                Responda para liberar o acesso mobile
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="rounded-lg border border-border/70 bg-muted/30 p-5 text-center">
                <div className="text-5xl font-bold tracking-tight">{answerCm} cm</div>
                <div className="mt-2 text-sm text-muted-foreground">medida informada</div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="foot-size">Tamanho</Label>
                  <span className="text-sm text-muted-foreground">10 cm - 20 cm</span>
                </div>
                <input
                  id="foot-size"
                  type="range"
                  min="10"
                  max="20"
                  step="1"
                  value={answerCm}
                  onChange={(event) => setAnswerCm(Number(event.target.value))}
                  disabled={isSaving}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                />
              </div>

              <Button className="w-full" size="lg" onClick={handleConfirm} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando biometria...
                  </>
                ) : (
                  "Confirmar medida"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
