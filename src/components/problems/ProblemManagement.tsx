import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Problem, FleetData } from "@/types/fleet";
import { getFleetData, saveFleetData } from "@/utils/localStorage";
import { AlertTriangle, CheckCircle, Clock, User, Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const ProblemManagement = () => {
  const [data, setData] = useState<FleetData | null>(null);
  const [filter, setFilter] = useState({
    status: 'todos',
    categoria: 'todas',
    gravidade: 'todas'
  });
  const { toast } = useToast();

  useEffect(() => {
    const fleetData = getFleetData();
    setData(fleetData);
  }, []);

  const handleResolve = (problem: Problem) => {
    if (!data) return;

    const newData = { ...data };
    const index = newData.problems.findIndex(p => p.id === problem.id);
    
    if (index !== -1) {
      newData.problems[index] = {
        ...problem,
        status: 'resolvido',
        resolvedAt: new Date().toISOString()
      };
      
      saveFleetData(newData);
      setData(newData);
      
      toast({
        title: "Sucesso",
        description: "Problema marcado como resolvido"
      });
    }
  };

  const getGravidadeColor = (gravidade: Problem['gravidade']) => {
    switch (gravidade) {
      case 'baixa': return 'secondary';
      case 'media': return 'warning';
      case 'alta': return 'destructive';
      case 'critica': return 'destructive';
    }
  };

  const getCategoriaIcon = (categoria: Problem['categoria']) => {
    return <AlertTriangle className="h-4 w-4" />;
  };

  if (!data) {
    return <div>Carregando...</div>;
  }

  // Filtrar problemas
  let filteredProblems = data.problems;

  if (filter.status !== 'todos') {
    filteredProblems = filteredProblems.filter(p => p.status === filter.status);
  }

  if (filter.categoria !== 'todas') {
    filteredProblems = filteredProblems.filter(p => p.categoria === filter.categoria);
  }

  if (filter.gravidade !== 'todas') {
    filteredProblems = filteredProblems.filter(p => p.gravidade === filter.gravidade);
  }

  // Ordenar por data (mais recentes primeiro) e depois por gravidade
  filteredProblems = filteredProblems.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'aberto' ? -1 : 1;
    }
    const gravityOrder = { 'critica': 4, 'alta': 3, 'media': 2, 'baixa': 1 };
    if (gravityOrder[a.gravidade] !== gravityOrder[b.gravidade]) {
      return gravityOrder[b.gravidade] - gravityOrder[a.gravidade];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Controle de Problemas</h2>
        <p className="text-muted-foreground">
          Gerenciamento dos problemas relatados pelos motoristas
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={filter.status} onValueChange={(value) => 
                setFilter({ ...filter, status: value })
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aberto">Abertos</SelectItem>
                  <SelectItem value="resolvido">Resolvidos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Categoria</label>
              <Select value={filter.categoria} onValueChange={(value) => 
                setFilter({ ...filter, categoria: value })
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="eletrica">Elétrica</SelectItem>
                  <SelectItem value="mecanica">Mecânica</SelectItem>
                  <SelectItem value="funilaria">Funilaria</SelectItem>
                  <SelectItem value="limpeza">Limpeza</SelectItem>
                  <SelectItem value="pneus">Pneus</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Gravidade</label>
              <Select value={filter.gravidade} onValueChange={(value) => 
                setFilter({ ...filter, gravidade: value })
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Problemas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Problemas ({filteredProblems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredProblems.map((problem) => {
              const vehicle = data.vehicles.find(v => v.id === problem.vehicleId);
              const driver = data.drivers.find(d => d.id === problem.driverId);

              return (
                <div key={problem.id} className={`p-4 border rounded-lg ${
                  problem.status === 'aberto' ? 'border-l-4 border-l-destructive' : 'border-l-4 border-l-success'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getCategoriaIcon(problem.categoria)}
                        <Badge variant={getGravidadeColor(problem.gravidade) as any}>
                          {problem.gravidade.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {problem.categoria}
                        </Badge>
                        <Badge variant={problem.status === 'aberto' ? 'destructive' : 'secondary'}>
                          {problem.status === 'aberto' ? 'Aberto' : 'Resolvido'}
                        </Badge>
                      </div>

                      <p className="font-medium mb-2">{problem.observacao}</p>

                      <div className="grid gap-2 md:grid-cols-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          Veículo: {vehicle?.numeroRegistro || 'Não encontrado'}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Motorista: {driver?.nome || 'Não encontrado'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Relatado: {new Date(problem.createdAt).toLocaleString()}
                        </div>
                        {problem.resolvedAt && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Resolvido: {new Date(problem.resolvedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {problem.status === 'aberto' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(problem)}
                        className="ml-4"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolver
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredProblems.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                {filter.status === 'todos' 
                  ? "Nenhum problema encontrado" 
                  : `Nenhum problema ${filter.status} encontrado`
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informação sobre recebimento de dados */}
      <Card>
        <CardHeader>
          <CardTitle>📱 Integração com App do Motorista</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Como os problemas chegam:</strong> Os motoristas relatam problemas pelo app 
              do celular que envia os dados via POST /retorno para o servidor local.
            </p>
            <p>
              <strong>Dados recebidos:</strong> categoria, gravidade, observação, número do motorista, 
              número do veículo, data/hora.
            </p>
            <p>
              <strong>Implementação atual:</strong> Dados simulados no localStorage. 
              Migrar para servidor Node.js + dados.json.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};