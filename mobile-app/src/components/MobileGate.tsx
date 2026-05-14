import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Footprints, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { db } from "@/integrations/firebase/client";

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

function getFootReaction(answerCm: number) {
  if (answerCm <= 14) {
    return {
      face: ":|",
      title: "Na media",
      text: "Nada suspeito por aqui. Sistema quase convencido.",
    };
  }

  if (answerCm <= 17) {
    return {
      face: ":o",
      title: "Agora impoe respeito",
      text: "Esse tamanho ja chega fazendo presenca na garagem.",
    };
  }

  return {
    face: "O_O",
    title: "Nivel derrubar manga",
    text: "Confirmando se isso e pe ou ferramenta de alcance rural.",
  };
}

export function MobileGate({ onComplete }: MobileGateProps) {
  const [answerCm, setAnswerCm] = useState(14);
  const [isSaving, setIsSaving] = useState(false);
  const [statusText, setStatusText] = useState("");
  const reaction = getFootReaction(answerCm);

  const handleConfirm = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setStatusText(`${reaction.title}... Validando biometria.`);

    try {
      await addDoc(collection(db, "mobileGateAnswers"), {
        question: "Qual tamanho do seu pe?",
        answerCm,
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent,
        deviceInfo: getDeviceInfo(),
      });
    } catch {
      // A brincadeira nao deve impedir o app real se a rede oscilar.
    } finally {
      window.setTimeout(() => {
        setIsSaving(false);
        onComplete();
      }, 900);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <Card className="w-full border-border bg-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Footprints className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Verificacao Mobile</CardTitle>
            <CardDescription>Qual tamanho do seu pe?</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="rounded-lg border border-border bg-background p-5 text-center">
              <div className="text-5xl font-bold">{answerCm} cm</div>
            </div>

            <Slider
              min={10}
              max={20}
              step={1}
              value={[answerCm]}
              onValueChange={(value) => setAnswerCm(value[0] || 14)}
              disabled={isSaving}
            />

            <div className="rounded-lg border border-border bg-muted/40 p-4 text-center">
              <div className="text-3xl font-bold">{reaction.face}</div>
              <div className="mt-1 font-semibold">{reaction.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{reaction.text}</div>
            </div>

            {statusText && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {statusText}
              </div>
            )}

            <Button className="w-full" size="lg" onClick={handleConfirm} disabled={isSaving}>
              {isSaving ? "Confirmando..." : "Confirmar medida"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
