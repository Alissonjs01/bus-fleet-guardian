import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Driver, FleetData } from "@/types/fleet";
import { getFleetData, saveFleetData } from "@/utils/localStorage";
import { Users, Plus, Edit, Trash2, Phone, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const DriverManagement = () => {
  const [data, setData] = useState<FleetData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    numeroRegistro: "",
    nome: "",
    telefone: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    const fleetData = getFleetData();
    setData(fleetData);
  }, []);

  const resetForm = () => {
    setFormData({ numeroRegistro: "", nome: "", telefone: "" });
    setIsEditing(false);
    setEditingDriver(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    if (!formData.numeroRegistro.trim() || !formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "Número de registro e nome são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Verificar se já existe um motorista com este número
    const existingDriver = data.drivers.find(d => 
      d.numeroRegistro === formData.numeroRegistro && 
      (!editingDriver || d.id !== editingDriver.id)
    );

    if (existingDriver) {
      toast({
        title: "Erro",
        description: "Já existe um motorista com este número de registro",
        variant: "destructive"
      });
      return;
    }

    const newData = { ...data };

    if (isEditing && editingDriver) {
      // Editar motorista existente
      const index = newData.drivers.findIndex(d => d.id === editingDriver.id);
      if (index !== -1) {
        newData.drivers[index] = {
          ...editingDriver,
          numeroRegistro: formData.numeroRegistro,
          nome: formData.nome,
          telefone: formData.telefone || undefined
        };
      }
      toast({
        title: "Sucesso",
        description: "Motorista atualizado com sucesso"
      });
    } else {
      // Criar novo motorista
      const newDriver: Driver = {
        id: Math.max(0, ...newData.drivers.map(d => d.id)) + 1,
        numeroRegistro: formData.numeroRegistro,
        nome: formData.nome,
        telefone: formData.telefone || undefined,
        createdAt: new Date().toISOString()
      };
      newData.drivers.push(newDriver);
      toast({
        title: "Sucesso",
        description: "Motorista cadastrado com sucesso"
      });
    }

    saveFleetData(newData);
    setData(newData);
    resetForm();
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      numeroRegistro: driver.numeroRegistro,
      nome: driver.nome,
      telefone: driver.telefone || ""
    });
    setIsEditing(true);
  };

  const handleDelete = (driver: Driver) => {
    if (!data) return;
    
    // Verificar se o motorista tem problemas ou viagens
    const hasProblems = data.problems.some(p => p.driverId === driver.id);
    const hasTrips = data.trips.some(t => t.driverId === driver.id);
    
    if (hasProblems || hasTrips) {
      toast({
        title: "Erro",
        description: "Não é possível excluir motorista com histórico de problemas ou viagens",
        variant: "destructive"
      });
      return;
    }
    
    if (confirm(`Tem certeza que deseja excluir o motorista ${driver.nome}?`)) {
      const newData = {
        ...data,
        drivers: data.drivers.filter(d => d.id !== driver.id)
      };
      saveFleetData(newData);
      setData(newData);
      toast({
        title: "Sucesso",
        description: "Motorista excluído com sucesso"
      });
    }
  };

  if (!data) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Gestão de Motoristas</h2>
        <p className="text-muted-foreground">
          Cadastro e controle dos motoristas
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {isEditing ? 'Editar Motorista' : 'Novo Motorista'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="numeroRegistro">Número de Registro *</Label>
                <Input
                  id="numeroRegistro"
                  placeholder="Ex: M001"
                  value={formData.numeroRegistro}
                  onChange={(e) => setFormData({ ...formData, numeroRegistro: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Usado como login no app do motorista
                </p>
              </div>

              <div>
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  placeholder="Nome do motorista"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="telefone">Telefone (opcional)</Label>
                <Input
                  id="telefone"
                  placeholder="(11) 99999-9999"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
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

        {/* Lista de Motoristas */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Motoristas Cadastrados ({data.drivers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.drivers.map((driver) => {
                const activeProblems = data.problems.filter(p => 
                  p.driverId === driver.id && p.status === 'aberto'
                ).length;
                
                const totalProblems = data.problems.filter(p => p.driverId === driver.id).length;

                return (
                  <div key={driver.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <User className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{driver.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          Registro: {driver.numeroRegistro}
                        </div>
                        {driver.telefone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {driver.telefone}
                          </div>
                        )}
                        <div className="flex gap-2 mt-1">
                          {activeProblems > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {activeProblems} problema{activeProblems !== 1 ? 's' : ''} ativo{activeProblems !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          {totalProblems > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {totalProblems} total
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(driver)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(driver)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {data.drivers.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum motorista cadastrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informação sobre a comunicação */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Comunicação com App do Motorista</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Implementação futura:</strong> O sistema rodará um servidor Node.js local 
              (ex: 192.168.1.100:3000) que receberá dados dos celulares via Wi-Fi.
            </p>
            <p>
              <strong>Endpoints planejados:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>POST /saida → registra saída de veículo</li>
              <li>POST /retorno → registra retorno e problemas</li>
              <li>POST /motorista → cadastra motorista</li>
              <li>GET /historico/:numero → retorna histórico</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};