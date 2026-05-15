import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HardDrive, ShieldCheck } from "lucide-react";

export const Backup = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Backup</h2>
        <p className="text-muted-foreground">
          Area de seguranca e recuperacao dos dados do sistema.
        </p>
      </div>

      <Card>
        <CardContent className="flex min-h-[360px] flex-col items-center justify-center gap-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <HardDrive className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-center">
              <Badge variant="secondary" className="gap-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                Em producao
              </Badge>
            </div>
            <h3 className="text-2xl font-semibold">Backup aparecera em breve</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Esta area esta sendo preparada para backup, restauracao e protecao dos dados da frota.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
