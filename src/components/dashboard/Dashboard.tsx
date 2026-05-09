import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "./StatsCard";
import { DashboardStats } from "@/types/fleet";
import { VEHICLE_TYPE_OPTIONS, normalizeVehicleType } from "@/constants/vehicleTypes";
import { useFleetData } from "@/hooks/useFleetData";
import {
  Car,
  AlertTriangle,
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/dateFormat";

export const Dashboard = () => {
  const { data, loading } = useFleetData();

  const stats = useMemo<DashboardStats>(() => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      totalVehicles: data.vehicles.length,
      inOperation: data.vehicles.filter((vehicle) => vehicle.status === "operacao").length,
      inGarage: data.vehicles.filter((vehicle) => vehicle.status === "garagem").length,
      inMaintenance: data.vehicles.filter((vehicle) => vehicle.status === "manutencao").length,
      overdueRevisions: data.revisions.filter((revision) => new Date(revision.dataProxima) < today).length,
      upcomingRevisions: data.revisions.filter((revision) => {
        const nextDate = new Date(revision.dataProxima);
        return nextDate >= today && nextDate <= nextWeek;
      }).length,
      openProblems: data.problems.filter((problem) => problem.status === "aberto").length,
      byVehicleType: VEHICLE_TYPE_OPTIONS.reduce((acc, option) => {
        acc[option.value] = data.vehicles.filter(
          (vehicle) => normalizeVehicleType(vehicle.vehicleType || vehicle.tipo) === option.value,
        ).length;
        return acc;
      }, {} as DashboardStats["byVehicleType"]),
    };
  }, [data]);

  if (loading) {
    return <div>Carregando...</div>;
  }

  const vehicleProblems = data.vehicles.map((vehicle) => {
    const problems = data.problems.filter((problem) => problem.vehicleId === vehicle.id);
    return {
      vehicle,
      problemCount: problems.length,
      openProblems: problems.filter((problem) => problem.status === "aberto").length,
    };
  }).sort((a, b) => b.problemCount - a.problemCount);

  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const overdueRevisions = data.revisions.filter((revision) => new Date(revision.dataProxima) < today);
  const upcomingRevisions = data.revisions.filter((revision) => {
    const nextDate = new Date(revision.dataProxima);
    return nextDate >= today && nextDate <= nextWeek;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Painel de Controle</h2>
        <p className="text-muted-foreground">
          Visao geral da frota e operacoes
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {VEHICLE_TYPE_OPTIONS.map((option) => (
          <Card key={option.value}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{option.pluralLabel}</p>
                  <p className="text-2xl font-bold">{stats.byVehicleType[option.value] || 0}</p>
                </div>
                <span className="text-2xl">{option.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total de Veiculos"
          value={stats.totalVehicles}
          icon={Car}
          description="Frota total cadastrada"
        />
        <StatsCard
          title="Em Operacao"
          value={stats.inOperation}
          icon={Activity}
          variant="success"
          description="Veiculos ativos"
        />
        <StatsCard
          title="Problemas Abertos"
          value={stats.openProblems}
          icon={AlertTriangle}
          variant="warning"
          description="Requerem atencao"
        />
        <StatsCard
          title="Revisoes Atrasadas"
          value={stats.overdueRevisions}
          icon={Clock}
          variant="destructive"
          description="Precisam ser feitas"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Ranking: Veiculos com Mais Problemas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vehicleProblems.slice(0, 5).map((item, index) => (
                <div key={item.vehicle.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-muted-foreground">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-medium">Veiculo {item.vehicle.numeroRegistro}</div>
                      <div className="text-sm text-muted-foreground">
                        Status: {item.vehicle.status === "operacao" ? "Em Operacao" :
                          item.vehicle.status === "garagem" ? "Na Garagem" : "Em Manutencao"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-destructive">
                      {item.problemCount} problemas
                    </div>
                    {item.openProblems > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {item.openProblems} abertos
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {vehicleProblems.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  Nenhum problema registrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Alertas de Revisao
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overdueRevisions.length > 0 && (
                <div>
                  <h4 className="font-medium text-destructive mb-2 flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    Atrasadas ({overdueRevisions.length})
                  </h4>
                  <div className="space-y-2">
                    {overdueRevisions.map((revision) => {
                      const vehicle = data.vehicles.find((item) => item.id === revision.vehicleId);
                      return (
                        <div key={revision.id} className="p-2 bg-destructive/10 border border-destructive/20 rounded">
                          <div className="font-medium">Veiculo {vehicle?.numeroRegistro}</div>
                          <div className="text-sm text-muted-foreground">
                            {revision.tipo} - Venceu em {formatDate(revision.dataProxima)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {upcomingRevisions.length > 0 && (
                <div>
                  <h4 className="font-medium text-warning mb-2 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Proximas 7 dias ({upcomingRevisions.length})
                  </h4>
                  <div className="space-y-2">
                    {upcomingRevisions.map((revision) => {
                      const vehicle = data.vehicles.find((item) => item.id === revision.vehicleId);
                      return (
                        <div key={revision.id} className="p-2 bg-warning/10 border border-warning/20 rounded">
                          <div className="font-medium">Veiculo {vehicle?.numeroRegistro}</div>
                          <div className="text-sm text-muted-foreground">
                            {revision.tipo} - {formatDate(revision.dataProxima)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {overdueRevisions.length === 0 && upcomingRevisions.length === 0 && (
                <div className="text-center text-muted-foreground py-4 flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Todas as revisoes estao em dia
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status da Frota</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-success/10 border border-success/20 rounded-lg">
              <div className="text-2xl font-bold text-success">{stats.inOperation}</div>
              <div className="text-sm text-muted-foreground">Em Operacao</div>
            </div>
            <div className="text-center p-4 bg-muted border rounded-lg">
              <div className="text-2xl font-bold">{stats.inGarage}</div>
              <div className="text-sm text-muted-foreground">Na Garagem</div>
            </div>
            <div className="text-center p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="text-2xl font-bold text-warning">{stats.inMaintenance}</div>
              <div className="text-sm text-muted-foreground">Em Manutencao</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
