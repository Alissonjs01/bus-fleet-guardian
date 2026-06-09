import { useMemo, useState } from "react";
import { AlertTriangle, Car, ClipboardList, KeyRound, MessageSquarePlus, Route, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useFleetData } from "@/hooks/useFleetData";
import { useToast } from "@/hooks/use-toast";
import {
  addOperationalNoteToProblem,
  isProblemOpen,
  releaseVehicleToDriver,
  returnReleasedVehicleToGarage,
  sendVehicleToMaintenance,
} from "@/services/fleetService";
import type { Driver, Problem, Vehicle } from "@/types/fleet";

function statusLabel(status: Vehicle["status"]) {
  switch (status) {
    case "garagem": return "Garagem";
    case "fora_garagem": return "Disponivel na Rua";
    case "liberado": return "Liberado";
    case "operacao": return "Em Rota";
    case "manutencao": return "Manutencao";
    case "pane_em_rota": return "Pane em rota";
    case "aguardando_auxilio": return "Aguardando auxilio";
  }
}

function statusClass(status: Vehicle["status"]) {
  switch (status) {
    case "garagem": return "bg-success text-success-foreground";
    case "fora_garagem": return "bg-muted text-foreground";
    case "liberado": return "bg-info text-info-foreground";
    case "operacao": return "bg-primary text-primary-foreground";
    case "manutencao": return "bg-warning text-warning-foreground";
    case "pane_em_rota": return "bg-destructive text-destructive-foreground";
    case "aguardando_auxilio": return "bg-warning text-warning-foreground";
  }
}

function vehicleSort(a: Vehicle, b: Vehicle) {
  return a.numeroRegistro.localeCompare(b.numeroRegistro, "pt-BR", { numeric: true });
}

export function GarageOperations() {
  const { user } = useAuth();
  const { data, loading, companyId } = useFleetData();
  const { toast } = useToast();
  const [releaseVehicle, setReleaseVehicle] = useState<Vehicle | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [noteProblem, setNoteProblem] = useState<Problem | null>(null);
  const [operationalNote, setOperationalNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const activeDrivers = useMemo(
    () => data.drivers.filter((driver) => driver.status === "active").sort((a, b) => a.nome.localeCompare(b.nome)),
    [data.drivers],
  );

  const grouped = useMemo(() => ({
    disponiveis: data.vehicles.filter((vehicle) => vehicle.status === "garagem" || vehicle.status === "fora_garagem").sort(vehicleSort),
    garagem: data.vehicles.filter((vehicle) => vehicle.status === "garagem").sort(vehicleSort),
    foraGaragem: data.vehicles.filter((vehicle) => vehicle.status === "fora_garagem").sort(vehicleSort),
    liberado: data.vehicles.filter((vehicle) => vehicle.status === "liberado").sort(vehicleSort),
    rota: data.vehicles.filter((vehicle) => vehicle.status === "operacao").sort(vehicleSort),
    manutencao: data.vehicles.filter((vehicle) => ["manutencao", "pane_em_rota", "aguardando_auxilio"].includes(vehicle.status)).sort(vehicleSort),
  }), [data.vehicles]);

  const openProblems = useMemo(
    () => data.problems.filter((problem) => isProblemOpen(problem.status)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [data.problems],
  );

  const handleRelease = async () => {
    if (!releaseVehicle || !user || isSaving) return;
    const driver = data.drivers.find((item) => String(item.id) === selectedDriverId);
    if (!driver) {
      toast({ title: "Selecione um motorista", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await releaseVehicleToDriver(companyId, releaseVehicle, driver, user, releaseNotes);
      toast({ title: "Veiculo liberado", description: `Chave liberada para ${driver.nome}.` });
      setReleaseVehicle(null);
      setSelectedDriverId("");
      setReleaseNotes("");
    } catch (error) {
      toast({
        title: "Erro ao liberar",
        description: error instanceof Error ? error.message : "Nao foi possivel liberar o veiculo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReturnToGarage = async (vehicle: Vehicle) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await returnReleasedVehicleToGarage(companyId, vehicle);
      toast({ title: "Liberacao cancelada", description: `Veiculo ${vehicle.numeroRegistro} voltou para ${vehicle.releasedFromStatus === "fora_garagem" ? "fora da garagem" : "garagem"}.` });
    } catch (error) {
      toast({
        title: "Erro ao retornar",
        description: error instanceof Error ? error.message : "Nao foi possivel atualizar o veiculo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteProblem || !user || !operationalNote.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await addOperationalNoteToProblem(companyId, noteProblem, {
        text: operationalNote.trim(),
        authorId: user.id,
        authorName: user.name,
        authorRole: user.role,
      });
      toast({ title: "Observacao registrada" });
      setNoteProblem(null);
      setOperationalNote("");
    } catch (error) {
      toast({
        title: "Erro ao registrar observacao",
        description: error instanceof Error ? error.message : "Nao foi possivel atualizar a ocorrencia.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendToMaintenance = async (vehicle?: Vehicle) => {
    if (!vehicle || isSaving) return;
    setIsSaving(true);
    try {
      await sendVehicleToMaintenance(companyId, vehicle);
      toast({ title: "Veiculo enviado para manutencao", description: `Veiculo ${vehicle.numeroRegistro} retirado da operacao.` });
    } catch (error) {
      toast({
        title: "Erro ao atualizar veiculo",
        description: error instanceof Error ? error.message : "Nao foi possivel enviar o veiculo para manutencao.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div>Carregando garagem...</div>;

  const statCards = [
    { label: "Disponiveis", value: grouped.disponiveis.length, icon: Car },
    { label: "Liberados", value: grouped.liberado.length, icon: KeyRound },
    { label: "Em Rota", value: grouped.rota.length, icon: Route },
    { label: "Manutencao", value: grouped.manutencao.length, icon: Wrench },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Operacao da Garagem</h2>
        <p className="text-muted-foreground">Liberacao de chaves, disponibilidade e ocorrencias em tempo real.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <div className="text-2xl font-bold">{item.value}</div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
                <Icon className="h-5 w-5 text-primary" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Liberar chave</CardTitle>
            <CardDescription>Veiculos em garagem ou disponiveis na rua podem ser reservados para um motorista.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {grouped.disponiveis.map((vehicle) => (
              <div key={vehicle.firestoreId || vehicle.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">Veiculo {vehicle.numeroRegistro}</div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{vehicle.currentKm?.toLocaleString("pt-BR") || "--"} km</span>
                    <Badge variant="outline" className="text-xs">{statusLabel(vehicle.status)}</Badge>
                  </div>
                </div>
                <Button size="sm" onClick={() => setReleaseVehicle(vehicle)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Liberar
                </Button>
              </div>
            ))}
            {grouped.disponiveis.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">Nenhum veiculo disponivel.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Veiculos liberados</CardTitle>
            <CardDescription>Aguardando motorista iniciar a rota no mobile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {grouped.liberado.map((vehicle) => (
              <div key={vehicle.firestoreId || vehicle.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">Veiculo {vehicle.numeroRegistro}</div>
                    <div className="text-sm text-muted-foreground">
                      Motorista: {vehicle.releasedToDriverName || vehicle.releasedToDriverNumber || "Nao informado"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Liberado por {vehicle.releasedBy || "garagem"}
                    </div>
                    {vehicle.releaseNotes && <div className="mt-2 text-sm">{vehicle.releaseNotes}</div>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleReturnToGarage(vehicle)} disabled={isSaving}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ))}
            {grouped.liberado.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma chave liberada.</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Car className="h-5 w-5" /> Status operacional</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {data.vehicles.sort(vehicleSort).map((vehicle) => (
              <div key={vehicle.firestoreId || vehicle.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">Veiculo {vehicle.numeroRegistro}</div>
                    <div className="text-xs text-muted-foreground">{vehicle.currentKm?.toLocaleString("pt-BR") || "--"} km</div>
                  </div>
                  <Badge className={statusClass(vehicle.status)}>{statusLabel(vehicle.status)}</Badge>
                </div>
                {vehicle.status === "liberado" && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {vehicle.releasedToDriverName || vehicle.releasedToDriverNumber}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Ocorrencias em aberto</CardTitle>
          <CardDescription>Registre acompanhamento operacional para o gestor ver em tempo real.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {openProblems.map((problem) => {
            const vehicle = data.vehicles.find((item) => item.id === problem.vehicleId);
            const driver = data.drivers.find((item) => item.id === problem.driverId);
            return (
              <div key={problem.firestoreId || problem.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="font-medium">{problem.observacao}</div>
                    <div className="text-sm text-muted-foreground">
                      Veiculo {vehicle?.numeroRegistro || problem.vehicleId} - {driver?.nome || "motorista nao encontrado"}
                    </div>
                    {!!problem.operationalNotes?.length && (
                      <div className="mt-2 space-y-1 text-sm">
                        {problem.operationalNotes.slice(-2).map((note) => (
                          <div key={note.id} className="rounded-md bg-muted/55 px-3 py-2">
                            <span className="font-medium">{note.authorName || "Operacao"}:</span> {note.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {vehicle && vehicle.status !== "manutencao" && (
                      <Button size="sm" variant="outline" onClick={() => handleSendToMaintenance(vehicle)} disabled={isSaving}>
                        <Wrench className="mr-2 h-4 w-4" />
                        Manutencao
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setNoteProblem(problem)}>
                      <MessageSquarePlus className="mr-2 h-4 w-4" />
                      Observacao
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {openProblems.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma ocorrencia aberta.</div>}
        </CardContent>
      </Card>

      <Dialog open={!!releaseVehicle} onOpenChange={(open) => !open && setReleaseVehicle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liberar veiculo {releaseVehicle?.numeroRegistro}</DialogTitle>
            <DialogDescription>Selecione o motorista que recebeu a chave.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motorista</Label>
              <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motorista" />
                </SelectTrigger>
                <SelectContent>
                  {activeDrivers.map((driver) => (
                    <SelectItem key={driver.firestoreId || driver.id} value={String(driver.id)}>
                      {driver.nome} - {driver.numeroRegistro}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="release-notes">Observacao</Label>
              <Textarea id="release-notes" value={releaseNotes} onChange={(event) => setReleaseNotes(event.target.value)} placeholder="Ex: chave entregue, vistoria ok..." />
            </div>
            <Button className="w-full" onClick={handleRelease} disabled={isSaving}>
              {isSaving ? "Liberando..." : "Confirmar liberacao"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!noteProblem} onOpenChange={(open) => !open && setNoteProblem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar observacao operacional</DialogTitle>
            <DialogDescription>Ex: Equipe acionada, guincho enviado, motorista aguardando.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea value={operationalNote} onChange={(event) => setOperationalNote(event.target.value)} placeholder="Digite a atualizacao operacional..." />
            <Button className="w-full" onClick={handleAddNote} disabled={isSaving || !operationalNote.trim()}>
              {isSaving ? "Salvando..." : "Registrar observacao"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
