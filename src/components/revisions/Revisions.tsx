import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Plus, Filter, CheckCircle, XCircle, Edit, Trash2 } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Revision } from "@/types/fleet";
import { useFleetData } from "@/hooks/useFleetData";
import { deleteRevision, isRevisionActive, normalizeRevisionStatus, upsertRevision } from "@/services/fleetService";
import { formatDate } from "@/utils/dateFormat";
import { useToast } from "@/hooks/use-toast";

const REVISION_STATUS_LABELS: Record<Revision["status"], string> = {
  agendada: "Agendada",
  em_andamento: "Em andamento",
  concluida: "Concluida",
  cancelada: "Cancelada",
};

const emptyForm = {
  vehicleId: "",
  tipo: "geral" as Revision["tipo"],
  status: "agendada" as Revision["status"],
  dataProxima: "",
  responsavel: "",
  observacao: "",
};

export const Revisions = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isEditing, setIsEditing] = useState(false);
  const [editingRevision, setEditingRevision] = useState<Revision | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const { data: fleetData, loading, companyId } = useFleetData();
  const { toast } = useToast();

  const today = useMemo(() => new Date(), []);
  const nextWeek = useMemo(() => new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), [today]);

  const activeRevisions = useMemo(
    () => fleetData.revisions.filter((revision) => isRevisionActive(revision.status)),
    [fleetData.revisions],
  );

  const overdueRevisions = activeRevisions.filter((revision) => new Date(revision.dataProxima) < today);
  const upcomingRevisions = activeRevisions.filter((revision) => {
    const nextDate = new Date(revision.dataProxima);
    return nextDate >= today && nextDate <= nextWeek;
  });
  const scheduledRevisions = activeRevisions.filter((revision) => normalizeRevisionStatus(revision.status) === "agendada");

  const filteredRevisions = useMemo(() => {
    return fleetData.revisions.filter((revision) => {
      const vehicle = fleetData.vehicles.find((item) => item.id === revision.vehicleId);
      const status = normalizeRevisionStatus(revision.status);
      const matchesSearch = !searchTerm.trim() ||
        vehicle?.numeroRegistro.toLowerCase().includes(searchTerm.toLowerCase()) ||
        revision.observacao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        revision.responsavel?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === "all" || revision.tipo === filterType;

      let matchesStatus = true;
      if (filterStatus === "overdue") {
        matchesStatus = isRevisionActive(status) && new Date(revision.dataProxima) < today;
      } else if (filterStatus === "upcoming") {
        const nextDate = new Date(revision.dataProxima);
        matchesStatus = isRevisionActive(status) && nextDate >= today && nextDate <= nextWeek;
      } else if (filterStatus !== "all") {
        matchesStatus = status === filterStatus;
      }

      return matchesSearch && matchesType && matchesStatus;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [fleetData.revisions, fleetData.vehicles, filterStatus, filterType, nextWeek, searchTerm, today]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingRevision(null);
    setIsEditing(false);
  };

  const handleEdit = (revision: Revision) => {
    setEditingRevision(revision);
    setFormData({
      vehicleId: String(revision.vehicleId),
      tipo: revision.tipo,
      status: normalizeRevisionStatus(revision.status),
      dataProxima: revision.dataProxima ? revision.dataProxima.slice(0, 10) : "",
      responsavel: revision.responsavel || "",
      observacao: revision.observacao || "",
    });
    setIsEditing(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    const vehicleId = Number(formData.vehicleId);
    if (!vehicleId || !formData.dataProxima) {
      toast({
        title: "Erro",
        description: "Informe o veiculo e a data da revisao",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const status = normalizeRevisionStatus(formData.status);
      const revision: Revision = {
        id: editingRevision?.id || Math.max(0, ...fleetData.revisions.map((item) => item.id)) + 1,
        firestoreId: editingRevision?.firestoreId,
        companyId,
        vehicleId,
        tipo: formData.tipo,
        status,
        dataRevisao: status === "concluida" ? (editingRevision?.dataRevisao || new Date().toISOString()) : (editingRevision?.dataRevisao || ""),
        dataProxima: new Date(`${formData.dataProxima}T12:00:00`).toISOString(),
        responsavel: formData.responsavel || undefined,
        observacao: formData.observacao || undefined,
        createdAt: editingRevision?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await upsertRevision(companyId, revision);
      toast({
        title: "Sucesso",
        description: isEditing ? "Revisao atualizada com sucesso" : "Revisao cadastrada com sucesso",
      });
      resetForm();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Nao foi possivel gravar a revisao no Firestore",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (revision: Revision, status: Revision["status"]) => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      await upsertRevision(companyId, {
        ...revision,
        status,
        dataRevisao: status === "concluida" ? new Date().toISOString() : revision.dataRevisao,
        updatedAt: new Date().toISOString(),
      });
      toast({
        title: "Sucesso",
        description: "Status da revisao atualizado",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Nao foi possivel atualizar a revisao no Firestore",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (revision: Revision) => {
    if (!confirm("Tem certeza que deseja excluir esta revisao?")) return;
    setIsSaving(true);

    try {
      await deleteRevision(revision);
      toast({
        title: "Sucesso",
        description: "Revisao excluida com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: error instanceof Error ? error.message : "Nao foi possivel excluir a revisao no Firestore",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (revision: Revision) => {
    const status = normalizeRevisionStatus(revision.status);
    const nextDate = new Date(revision.dataProxima);
    const isOverdue = isRevisionActive(status) && nextDate < today;
    const isUpcoming = isRevisionActive(status) && nextDate >= today && nextDate <= nextWeek;

    if (status === "concluida") return <Badge variant="secondary">Concluida</Badge>;
    if (status === "cancelada") return <Badge variant="outline">Cancelada</Badge>;
    if (status === "em_andamento") return <Badge className="bg-warning text-warning-foreground">Em andamento</Badge>;
    if (isOverdue) return <Badge variant="destructive">Atrasada</Badge>;
    if (isUpcoming) return <Badge className="bg-warning text-warning-foreground">Proxima</Badge>;
    return <Badge variant="secondary">Agendada</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const types = {
      eletrica: "Eletrica",
      mecanica: "Mecanica",
      funilaria: "Funilaria",
      geral: "Geral",
    };
    return types[type as keyof typeof types] || type;
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Revisoes</h2>
          <p className="text-muted-foreground">
            Gerencie as revisoes agendadas e em andamento dos veiculos.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatsCard title="Agendadas" value={scheduledRevisions.length} description="Revisoes marcadas" icon={Calendar} />
        <StatsCard title="Proximas" value={upcomingRevisions.length} description="Em ate 7 dias" icon={Calendar} variant="warning" />
        <StatsCard title="Atrasadas" value={overdueRevisions.length} description="Revisoes vencidas" icon={Calendar} variant="destructive" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {isEditing ? "Editar Revisao" : "Nova Revisao"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="vehicleId">Veiculo *</Label>
                <Select value={formData.vehicleId} onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o veiculo" />
                  </SelectTrigger>
                  <SelectContent>
                    {fleetData.vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                        {vehicle.numeroRegistro}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Select value={formData.tipo} onValueChange={(value: Revision["tipo"]) => setFormData({ ...formData, tipo: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Geral</SelectItem>
                    <SelectItem value="mecanica">Mecanica</SelectItem>
                    <SelectItem value="eletrica">Eletrica</SelectItem>
                    <SelectItem value="funilaria">Funilaria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dataProxima">Data agendada *</Label>
                <Input
                  id="dataProxima"
                  type="date"
                  value={formData.dataProxima}
                  onChange={(event) => setFormData({ ...formData, dataProxima: event.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: Revision["status"]) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendada">Agendada</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="concluida">Concluida</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="responsavel">Responsavel</Label>
                <Input
                  id="responsavel"
                  value={formData.responsavel}
                  onChange={(event) => setFormData({ ...formData, responsavel: event.target.value })}
                  placeholder="Nome do responsavel"
                />
              </div>

              <div>
                <Label htmlFor="observacao">Observacao</Label>
                <Textarea
                  id="observacao"
                  value={formData.observacao}
                  onChange={(event) => setFormData({ ...formData, observacao: event.target.value })}
                  placeholder="Detalhes da revisao"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={isSaving}>
                  {isSaving ? "Salvando..." : isEditing ? "Atualizar" : "Cadastrar"}
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

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Input
                placeholder="Buscar por veiculo, responsavel ou observacao..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de revisao" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="eletrica">Eletrica</SelectItem>
                  <SelectItem value="mecanica">Mecanica</SelectItem>
                  <SelectItem value="funilaria">Funilaria</SelectItem>
                  <SelectItem value="geral">Geral</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="agendada">Agendadas</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluidas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                  <SelectItem value="overdue">Atrasadas</SelectItem>
                  <SelectItem value="upcoming">Proximas</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revisoes ({filteredRevisions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredRevisions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma revisao encontrada com os filtros aplicados.
                  </div>
                ) : (
                  filteredRevisions.map((revision) => {
                    const status = normalizeRevisionStatus(revision.status);
                    const vehicle = fleetData.vehicles.find((item) => item.id === revision.vehicleId);

                    return (
                      <div key={revision.firestoreId || revision.id} className="flex flex-col gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold">Veiculo {vehicle?.numeroRegistro || "Nao encontrado"}</h4>
                            {getStatusBadge(revision)}
                            <Badge variant="outline">{REVISION_STATUS_LABELS[status]}</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span>Tipo: {getTypeLabel(revision.tipo)}</span>
                            <span>Agendada: {formatDate(revision.dataProxima)}</span>
                            {revision.dataRevisao && <span>Concluida: {formatDate(revision.dataRevisao)}</span>}
                            {revision.responsavel && <span>Responsavel: {revision.responsavel}</span>}
                          </div>
                          {revision.observacao && (
                            <p className="text-sm text-muted-foreground">{revision.observacao}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          {status !== "concluida" && status !== "cancelada" && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleStatusChange(revision, "concluida")} disabled={isSaving}>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Concluir
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleStatusChange(revision, "cancelada")} disabled={isSaving}>
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancelar
                              </Button>
                            </>
                          )}
                          <Button variant="outline" size="sm" onClick={() => handleEdit(revision)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(revision)} disabled={isSaving}>
                            <Trash2 className="h-4 w-4" />
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
      </div>
    </div>
  );
};
