import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, FileText, BarChart3, TrendingUp, Filter } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { getFleetData } from "@/utils/localStorage";
import { format } from "date-fns";

export const Reports = () => {
  const [dateRange, setDateRange] = useState("last30");
  const [reportType, setReportType] = useState("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  
  const fleetData = getFleetData();
  
  // Estatísticas dos relatórios
  const totalReports = fleetData.problems.length + fleetData.revisions.length;
  const openProblems = fleetData.problems.filter(p => p.status === "aberto").length;
  const completedRevisions = fleetData.revisions.length;
  
  // Dados fictícios para relatórios
  const mockReports = [
    {
      id: 1,
      title: "Relatório de Problemas - Julho 2024",
      type: "problemas",
      date: "2024-07-31",
      vehicle: "05",
      status: "Concluído",
      size: "2.3 MB"
    },
    {
      id: 2,
      title: "Relatório de Revisões - Julho 2024", 
      type: "revisoes",
      date: "2024-07-31",
      vehicle: "Todos",
      status: "Concluído",
      size: "1.8 MB"
    },
    {
      id: 3,
      title: "Relatório Mensal - Junho 2024",
      type: "geral",
      date: "2024-06-30",
      vehicle: "Todos",
      status: "Concluído",
      size: "4.1 MB"
    },
    {
      id: 4,
      title: "Análise de Desempenho - Q2 2024",
      type: "desempenho",
      date: "2024-06-30",
      vehicle: "Todos", 
      status: "Concluído",
      size: "3.2 MB"
    }
  ];

  const getTypeLabel = (type: string) => {
    const types = {
      problemas: "Problemas",
      revisoes: "Revisões",
      geral: "Geral",
      desempenho: "Desempenho"
    };
    return types[type as keyof typeof types] || type;
  };

  const getTypeBadge = (type: string) => {
    const variants = {
      problemas: "destructive",
      revisoes: "default",
      geral: "secondary",
      desempenho: "outline"
    };
    return <Badge variant={variants[type as keyof typeof variants] as any}>{getTypeLabel(type)}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Relatórios</h2>
          <p className="text-muted-foreground">
            Visualize e exporte relatórios detalhados da frota.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros Avançados
          </Button>
          <Button size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Gerar Relatório
          </Button>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatsCard
          title="Total de Relatórios"
          value={totalReports}
          description="Dados disponíveis"
          icon={FileText}
        />
        <StatsCard
          title="Problemas Ativos"
          value={openProblems}
          description="Aguardando resolução"
          icon={BarChart3}
          variant="warning"
        />
        <StatsCard
          title="Revisões Completas"
          value={completedRevisions}
          description="Histórico disponível"
          icon={TrendingUp}
        />
      </div>

      {/* Filtros de Relatório */}
      <Card>
        <CardHeader>
          <CardTitle>Gerar Novo Relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7">Últimos 7 dias</SelectItem>
                  <SelectItem value="last30">Últimos 30 dias</SelectItem>
                  <SelectItem value="last90">Últimos 90 dias</SelectItem>
                  <SelectItem value="custom">Período customizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Relatório</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Relatório Completo</SelectItem>
                  <SelectItem value="problemas">Apenas Problemas</SelectItem>
                  <SelectItem value="revisoes">Apenas Revisões</SelectItem>
                  <SelectItem value="desempenho">Análise de Desempenho</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Veículo</label>
              <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os veículos</SelectItem>
                  {fleetData.vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                      Veículo {vehicle.numeroRegistro}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Gerar PDF
            </Button>
            <Button variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Relatórios Existentes */}
      <Card>
        <CardHeader>
          <CardTitle>Relatórios Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{report.title}</h4>
                    {getTypeBadge(report.type)}
                    <Badge variant="outline">{report.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Data: {format(new Date(report.date), 'dd/MM/yyyy')}</span>
                    <span>Veículo: {report.vehicle}</span>
                    <span>Tamanho: {report.size}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm">
                    Visualizar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráficos e Análises */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Problemas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['elétrica', 'mecânica', 'funilaria', 'limpeza', 'pneus'].map((categoria, index) => {
                const count = fleetData.problems.filter(p => p.categoria === categoria).length;
                const percentage = totalReports > 0 ? (count / totalReports) * 100 : 0;
                return (
                  <div key={categoria} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{categoria}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tendência Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho'].map((mes, index) => {
                const count = Math.floor(Math.random() * 20) + 5; // Dados fictícios
                return (
                  <div key={mes} className="flex items-center justify-between">
                    <span className="text-sm">{mes}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div 
                          className="bg-chart-1 h-2 rounded-full" 
                          style={{ width: `${(count / 25) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};