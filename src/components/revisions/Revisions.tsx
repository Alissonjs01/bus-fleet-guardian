import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Filter, Download } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { getFleetData } from "@/utils/localStorage";
import { format } from "date-fns";

export const Revisions = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  
  const fleetData = getFleetData();
  
  // Estatísticas das revisões
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const overdueRevisions = fleetData.revisions.filter(r => new Date(r.dataProxima) < today);
  const upcomingRevisions = fleetData.revisions.filter(r => {
    const nextDate = new Date(r.dataProxima);
    return nextDate >= today && nextDate <= nextWeek;
  });
  const scheduledRevisions = fleetData.revisions.filter(r => new Date(r.dataProxima) > nextWeek);

  // Filtrar revisões
  const filteredRevisions = fleetData.revisions.filter(revision => {
    const vehicle = fleetData.vehicles.find(v => v.id === revision.vehicleId);
    const matchesSearch = vehicle?.numeroRegistro.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         revision.observacao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || revision.tipo === filterType;
    
    let matchesStatus = true;
    if (filterStatus === "overdue") {
      matchesStatus = new Date(revision.dataProxima) < today;
    } else if (filterStatus === "upcoming") {
      const nextDate = new Date(revision.dataProxima);
      matchesStatus = nextDate >= today && nextDate <= nextWeek;
    } else if (filterStatus === "scheduled") {
      matchesStatus = new Date(revision.dataProxima) > nextWeek;
    }
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadge = (dataProxima: string) => {
    const nextDate = new Date(dataProxima);
    const isOverdue = nextDate < today;
    const isUpcoming = nextDate >= today && nextDate <= nextWeek;
    
    if (isOverdue) {
      return <Badge variant="destructive">Atrasada</Badge>;
    } else if (isUpcoming) {
      return <Badge className="bg-warning text-warning-foreground">Próxima</Badge>;
    } else {
      return <Badge variant="secondary">Agendada</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    const types = {
      eletrica: "Elétrica",
      mecanica: "Mecânica", 
      funilaria: "Funilaria",
      geral: "Geral"
    };
    return types[type as keyof typeof types] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Revisões</h2>
          <p className="text-muted-foreground">
            Gerencie as revisões agendadas e em andamento dos veículos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Revisão
          </Button>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatsCard
          title="Agendadas"
          value={scheduledRevisions.length}
          description="Revisões marcadas"
          icon={Calendar}
        />
        <StatsCard
          title="Próximas"
          value={upcomingRevisions.length}
          description="Em até 7 dias"
          icon={Calendar}
          variant="warning"
        />
        <StatsCard
          title="Atrasadas"
          value={overdueRevisions.length}
          description="Revisões vencidas"
          icon={Calendar}
          variant="destructive"
        />
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por veículo ou observação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tipo de revisão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="eletrica">Elétrica</SelectItem>
              <SelectItem value="mecanica">Mecânica</SelectItem>
              <SelectItem value="funilaria">Funilaria</SelectItem>
              <SelectItem value="geral">Geral</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="overdue">Atrasadas</SelectItem>
              <SelectItem value="upcoming">Próximas</SelectItem>
              <SelectItem value="scheduled">Agendadas</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Lista de revisões */}
      <Card>
        <CardHeader>
          <CardTitle>Revisões ({filteredRevisions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRevisions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma revisão encontrada com os filtros aplicados.
              </div>
            ) : (
              filteredRevisions.map((revision) => {
                const vehicle = fleetData.vehicles.find(v => v.id === revision.vehicleId);
                return (
                  <div key={revision.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">Veículo {vehicle?.numeroRegistro}</h4>
                        {getStatusBadge(revision.dataProxima)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Tipo: {getTypeLabel(revision.tipo)}</span>
                        <span>Próxima: {format(new Date(revision.dataProxima), 'dd/MM/yyyy')}</span>
                        {revision.responsavel && <span>Responsável: {revision.responsavel}</span>}
                      </div>
                      {revision.observacao && (
                        <p className="text-sm text-muted-foreground">{revision.observacao}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                      <Button variant="outline" size="sm">
                        Histórico
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};