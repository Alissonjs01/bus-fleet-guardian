import { Activity, Bus, Clock, ShieldCheck, Wrench } from "lucide-react";

export default function Maintenance() {
  return (
    <main className="maintenance-screen min-h-screen overflow-hidden bg-background text-foreground">
      <div className="maintenance-grid" />
      <div className="maintenance-scan" />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-5 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-primary/35 bg-primary/15 text-primary shadow-lg shadow-primary/10">
            <Bus className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-medium uppercase tracking-[0.24em] text-primary">
              Sistema de Frota
            </div>
            <div className="text-xs text-muted-foreground">Ambiente operacional</div>
          </div>
        </div>

        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-sm text-warning">
            <span className="h-2 w-2 animate-pulse rounded-full bg-warning" />
            Em manutencao programada
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Estamos ajustando o sistema.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              O acesso esta temporariamente pausado enquanto aplicamos melhorias operacionais e revisamos a plataforma.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatusCard icon={Wrench} label="Status" value="Atualizacao em andamento" />
            <StatusCard icon={ShieldCheck} label="Dados" value="Ambiente protegido" />
            <StatusCard icon={Clock} label="Retorno" value="Em breve" />
          </div>
        </div>

        <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground">
          <Activity className="h-4 w-4 animate-pulse text-primary" />
          <span>Monitoramento ativo durante a manutencao.</span>
        </div>
      </section>
    </main>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wrench;
  label: string;
  value: string;
}) {
  return (
    <div className="maintenance-card rounded-md border border-border/70 bg-card/75 p-4 backdrop-blur-xl">
      <Icon className="mb-4 h-5 w-5 text-primary" />
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-medium">{value}</div>
    </div>
  );
}
