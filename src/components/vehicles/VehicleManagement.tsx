import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Vehicle, FleetData } from "@/types/fleet";
import { getFleetData, saveFleetData } from "@/utils/localStorage";
import { Car, Plus, Edit, Trash2, Activity, Wrench, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const VehicleManagement = () => {
  const [data, setData] = useState<FleetData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    numeroRegistro: "",
    tipo: "onibus" as Vehicle['tipo'],
    status: "garagem" as Vehicle['status']
  });
  const [typeFilter, setTypeFilter] = useState<Vehicle['tipo'] | 'todos'>('todos');
  const { toast } = useToast();

  useEffect(() => {
    const fleetData = getFleetData();
    setData(fleetData);
  }, []);

  const resetForm = () => {
    setFormData({ numeroRegistro: "", tipo: "onibus", status: "garagem" });
    setIsEditing(false);
    setEditingVehicle(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    if (!formData.numeroRegistro.trim()) {
      toast({
        title: "Erro",
        description: "Número de registro é obrigatório",
        variant: "destructive"
      });
      return;
    }

    // Verificar se já existe um veículo com este número
    const existingVehicle = data.vehicles.find(v => 
      v.numeroRegistro === formData.numeroRegistro && 
      (!editingVehicle || v.id !== editingVehicle.id)
    );

    if (existingVehicle) {
      toast({
        title: "Erro",
        description: "Já existe um veículo com este número de registro",
        variant: "destructive"
      });
      return;
    }

    const newData = { ...data };

    if (isEditing && editingVehicle) {
      // Editar veículo existente
      const index = newData.vehicles.findIndex(v => v.id === editingVehicle.id);
      if (index !== -1) {
        newData.vehicles[index] = {
          ...editingVehicle,
          numeroRegistro: formData.numeroRegistro,
          tipo: formData.tipo,
          status: formData.status
        };
      }
      toast({
        title: "Sucesso",
        description: "Veículo atualizado com sucesso"
      });
    } else {
      // Criar novo veículo
      const newVehicle: Vehicle = {
        id: Math.max(0, ...newData.vehicles.map(v => v.id)) + 1,
        numeroRegistro: formData.numeroRegistro,
        tipo: formData.tipo,
        status: formData.status,
        createdAt: new Date().toISOString()
      };
      newData.vehicles.push(newVehicle);
      toast({
        title: "Sucesso",
        description: "Veículo cadastrado com sucesso"
      });
    }

    saveFleetData(newData);
    setData(newData);
    resetForm();
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      numeroRegistro: vehicle.numeroRegistro,
      tipo: vehicle.tipo,
      status: vehicle.status
    });
    setIsEditing(true);
  };

  const handleDelete = (vehicle: Vehicle) => {
    if (!data) return;
    
    if (confirm(`Tem certeza que deseja excluir o veículo ${vehicle.numeroRegistro}?`)) {
      const newData = {
        ...data,
        vehicles: data.vehicles.filter(v => v.id !== vehicle.id)
      };
      saveFleetData(newData);
      setData(newData);
      toast({
        title: "Sucesso",
        description: "Veículo excluído com sucesso"
      });
    }
  };

  if (!data) {
    return <div>Carregando...</div>;
  }

  const getStatusIcon = (status: Vehicle['status']) => {
    switch (status) {
      case 'operacao': return <Activity className="h-4 w-4 text-success" />;
      case 'manutencao': return <Wrench className="h-4 w-4 text-warning" />;
      case 'garagem': return <Home className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: Vehicle['status']) => {
    switch (status) {
      case 'operacao': return 'success';
      case 'manutencao': return 'warning';
      case 'garagem': return 'secondary';
    }
  };

  const getStatusLabel = (status: Vehicle['status']) => {
    switch (status) {
      case 'operacao': return 'Em Operação';
      case 'manutencao': return 'Em Manutenção';
      case 'garagem': return 'Na Garagem';
    }
  };

  const getVehicleTypeIcon = (tipo: Vehicle['tipo']) => {
    switch (tipo) {
      case 'micro_onibus': return '🚐';
      case 'onibus': return '🚌';
      case 'articulado': return '🚍';
    }
  };

  const getVehicleTypeLabel = (tipo: Vehicle['tipo']) => {
    switch (tipo) {
      case 'micro_onibus': return 'Micro Ônibus';
      case 'onibus': return 'Ônibus';
      case 'articulado': return 'Articulado';
    }
  };

  const filteredVehicles = typeFilter === 'todos' 
    ? data.vehicles 
    : data.vehicles.filter(vehicle => vehicle.tipo === typeFilter);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Gestão de Veículos</h2>
        <p className="text-muted-foreground">
          Cadastro e controle da frota
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {isEditing ? 'Editar Veículo' : 'Novo Veículo'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="numeroRegistro">Número de Registro</Label>
                <Input
                  id="numeroRegistro"
                  placeholder="Ex: 05"
                  value={formData.numeroRegistro}
                  onChange={(e) => setFormData({ ...formData, numeroRegistro: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="tipo">Tipo de Veículo</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(['micro_onibus', 'onibus', 'articulado'] as const).map((tipo) => (
                    <Button
                      key={tipo}
                      type="button"
                      variant={formData.tipo === tipo ? "default" : "outline"}
                      className="flex flex-col items-center gap-1 h-auto py-3"
                      onClick={() => setFormData({ ...formData, tipo })}
                    >
                      <span className="text-lg">{getVehicleTypeIcon(tipo)}</span>
                      <span className="text-xs">{getVehicleTypeLabel(tipo)}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: Vehicle['status']) => 
                  setFormData({ ...formData, status: value })
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="garagem">Na Garagem</SelectItem>
                    <SelectItem value="operacao">Em Operação</SelectItem>
                    <SelectItem value="manutencao">Em Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {isEditing ? 'Atualizar' : 'Cadastrar'}
                </Button>
                {isEditing && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Lista de Veículos */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Veículos Cadastrados ({filteredVehicles.length})
              </div>
              <Select value={typeFilter} onValueChange={(value: Vehicle['tipo'] | 'todos') => setTypeFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="micro_onibus">🚐 Micro Ônibus</SelectItem>
                  <SelectItem value="onibus">🚌 Ônibus</SelectItem>
                  <SelectItem value="articulado">🚍 Articulado</SelectItem>
                </SelectContent>
              </Select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredVehicles.map((vehicle) => {
                const problems = data.problems.filter(p => 
                  p.vehicleId === vehicle.id && p.status === 'aberto'
                ).length;

                return (
                  <div key={vehicle.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getVehicleTypeIcon(vehicle.tipo)}</span>
                      {getStatusIcon(vehicle.status)}
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          Veículo {vehicle.numeroRegistro}
                          <span className="text-sm text-muted-foreground">
                            ({getVehicleTypeLabel(vehicle.tipo)})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getStatusColor(vehicle.status) as any}>
                            {getStatusLabel(vehicle.status)}
                          </Badge>
                          {problems > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {problems} problema{problems !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(vehicle)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(vehicle)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {filteredVehicles.length === 0 && data.vehicles.length > 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum veículo encontrado para este filtro
                </div>
              )}
              {data.vehicles.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum veículo cadastrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
