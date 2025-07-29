import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "./StatsCard";
import { getFleetData } from "@/utils/localStorage";
import { DashboardStats, FleetData } from "@/types/fleet";
import { 
  Car, 
  Users, 
  AlertTriangle, 
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  Wrench
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Dashboard = () => {
  const [data, setData] = useState<FleetData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const fleetData = getFleetData();
    setData(fleetData);

    // Calcular estatísticas
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const dashboardStats: DashboardStats = {
      totalVehicles: fleetData.vehicles.length,
      inOperation: fleetData.vehicles.filter(v => v.status === 'operacao').length,
      inGarage: fleetData.vehicles.filter(v => v.status === 'garagem').length,
      inMaintenance: fleetData.vehicles.filter(v => v.status === 'manutencao').length,
      overdueRevisions: fleetData.revisions.filter(r => new Date(r.dataProxima) < today).length,
      upcomingRevisions: fleetData.revisions.filter(r => {
        const nextDate = new Date(r.dataProxima);
        return nextDate >= today && nextDate <= nextWeek;
      }).length,
      openProblems: fleetData.problems.filter(p => p.status === 'aberto').length,
    };

    setStats(dashboardStats);
  }, []);

  if (!data || !stats) {
    return <div>Carregando...</div>;
  }

  // Ranking de veículos com mais problemas
  const vehicleProblems = data.vehicles.map(vehicle => {
    const problems = data.problems.filter(p => p.vehicleId === vehicle.id);
    return {
      vehicle,
      problemCount: problems.length,
      openProblems: problems.filter(p => p.status === 'aberto').length
    };
  }).sort((a, b) => b.problemCount - a.problemCount);

  // Revisões atrasadas e próximas
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const overdueRevisions = data.revisions.filter(r => new Date(r.dataProxima) < today);
  const upcomingRevisions = data.revisions.filter(r => {
    const nextDate = new Date(r.dataProxima);
    return nextDate >= today && nextDate <= nextWeek;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Visão geral da frota e operações
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total de Veículos"
          value={stats.totalVehicles}
          icon={Car}
          description="Frota total cadastrada"
        />
        <StatsCard
          title="Em Operação"
          value={stats.inOperation}
          icon={Activity}
          variant="success"
          description="Veículos ativos"
        />
        <StatsCard
          title="Problemas Abertos"
          value={stats.openProblems}
          icon={AlertTriangle}
          variant="warning"
          description="Requerem atenção"
        />
        <StatsCard
          title="Revisões Atrasadas"
          value={stats.overdueRevisions}
          icon={Clock}
          variant="destructive"
          description="Precisam ser feitas"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Ranking de Veículos com Problemas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Ranking: Veículos com Mais Problemas
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
                      <div className="font-medium">Veículo {item.vehicle.numeroRegistro}</div>
                      <div className="text-sm text-muted-foreground">
                        Status: {item.vehicle.status}
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

        {/* Alertas de Revisão */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Alertas de Revisão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Revisões Atrasadas */}
              {overdueRevisions.length > 0 && (
                <div>
                  <h4 className="font-medium text-destructive mb-2 flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    Atrasadas ({overdueRevisions.length})
                  </h4>
                  <div className="space-y-2">
                    {overdueRevisions.map((revision) => {
                      const vehicle = data.vehicles.find(v => v.id === revision.vehicleId);
                      return (
                        <div key={revision.id} className="p-2 bg-destructive/10 border border-destructive/20 rounded">
                          <div className="font-medium">Veículo {vehicle?.numeroRegistro}</div>
                          <div className="text-sm text-muted-foreground">
                            {revision.tipo} - Venceu em {new Date(revision.dataProxima).toLocaleDateString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Revisões Próximas */}
              {upcomingRevisions.length > 0 && (
                <div>
                  <h4 className="font-medium text-warning mb-2 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Próximas 7 dias ({upcomingRevisions.length})
                  </h4>
                  <div className="space-y-2">
                    {upcomingRevisions.map((revision) => {
                      const vehicle = data.vehicles.find(v => v.id === revision.vehicleId);
                      return (
                        <div key={revision.id} className="p-2 bg-warning/10 border border-warning/20 rounded">
                          <div className="font-medium">Veículo {vehicle?.numeroRegistro}</div>
                          <div className="text-sm text-muted-foreground">
                            {revision.tipo} - {new Date(revision.dataProxima).toLocaleDateString()}
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
                  Todas as revisões estão em dia
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status da Frota */}
      <Card>
        <CardHeader>
          <CardTitle>Status da Frota</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-success/10 border border-success/20 rounded-lg">
              <div className="text-2xl font-bold text-success">{stats.inOperation}</div>
              <div className="text-sm text-muted-foreground">Em Operação</div>
            </div>
            <div className="text-center p-4 bg-muted border rounded-lg">
              <div className="text-2xl font-bold">{stats.inGarage}</div>
              <div className="text-sm text-muted-foreground">Na Garagem</div>
            </div>
            <div className="text-center p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="text-2xl font-bold text-warning">{stats.inMaintenance}</div>
              <div className="text-sm text-muted-foreground">Em Manutenção</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};