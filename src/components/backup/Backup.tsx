import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  HardDrive, 
  Download, 
  Upload, 
  RotateCcw, 
  Shield, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Database
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { createBackup, restoreBackup, getFleetData } from "@/utils/localStorage";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export const Backup = () => {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const { toast } = useToast();
  
  const fleetData = getFleetData();
  
  // Dados fictícios de backups
  const mockBackups = [
    {
      id: "backup_2024-07-31",
      date: "2024-07-31T14:30:00Z",
      size: "2.1 MB",
      type: "automatic",
      status: "success",
      records: 156
    },
    {
      id: "backup_2024-07-31_manual",
      date: "2024-07-31T10:15:00Z", 
      size: "2.1 MB",
      type: "manual",
      status: "success",
      records: 156
    },
    {
      id: "backup_2024-07-30",
      date: "2024-07-30T14:30:00Z",
      size: "2.0 MB", 
      type: "automatic",
      status: "success",
      records: 152
    },
    {
      id: "backup_2024-07-29",
      date: "2024-07-29T14:30:00Z",
      size: "1.9 MB",
      type: "automatic", 
      status: "success",
      records: 148
    },
    {
      id: "backup_2024-07-28",
      date: "2024-07-28T14:30:00Z",
      size: "1.8 MB",
      type: "automatic",
      status: "warning",
      records: 145
    }
  ];

  // Estatísticas
  const totalRecords = fleetData.vehicles.length + fleetData.drivers.length + 
                      fleetData.problems.length + fleetData.revisions.length;
  const lastBackupDate = mockBackups[0]?.date;
  const successfulBackups = mockBackups.filter(b => b.status === "success").length;

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      // Simula criação de backup
      await new Promise(resolve => setTimeout(resolve, 2000));
      const backupKey = createBackup();
      toast({
        title: "Backup criado com sucesso!",
        description: `Backup salvo como: ${backupKey}`,
      });
    } catch (error) {
      toast({
        title: "Erro ao criar backup",
        description: "Não foi possível criar o backup. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestore = async (backupId: string) => {
    setIsRestoring(true);
    try {
      // Simula restauração
      await new Promise(resolve => setTimeout(resolve, 3000));
      const success = restoreBackup(backupId);
      if (success) {
        toast({
          title: "Backup restaurado com sucesso!",
          description: "Os dados foram restaurados para o estado do backup selecionado.",
        });
      } else {
        throw new Error("Falha na restauração");
      }
    } catch (error) {
      toast({
        title: "Erro na restauração",
        description: "Não foi possível restaurar o backup. Verifique o arquivo.",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-success text-success-foreground">Sucesso</Badge>;
      case "warning":
        return <Badge className="bg-warning text-warning-foreground">Aviso</Badge>;
      default:
        return <Badge variant="destructive">Erro</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    return type === "automatic" ? "Automático" : "Manual";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Backup</h2>
          <p className="text-muted-foreground">
            Gerencie backups automáticos e restaurações do sistema.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            disabled={isRestoring}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar Backup
          </Button>
          <Button 
            size="sm"
            onClick={handleCreateBackup}
            disabled={isCreatingBackup || isRestoring}
          >
            <Download className="h-4 w-4 mr-2" />
            {isCreatingBackup ? "Criando..." : "Backup Manual"}
          </Button>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatsCard
          title="Registros Totais"
          value={totalRecords}
          description="Dados para backup"
          icon={Database}
        />
        <StatsCard
          title="Último Backup"
          value={lastBackupDate ? format(new Date(lastBackupDate), 'dd/MM/yyyy') : "-"}
          description="Backup mais recente"
          icon={Clock}
        />
        <StatsCard
          title="Backups Bem-sucedidos"
          value={successfulBackups}
          description="Dos últimos 5"
          icon={Shield}
        />
      </div>

      {/* Configurações de Backup Automático */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Configurações de Backup Automático
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Backup Automático Ativo:</strong> Os dados são salvos automaticamente a cada 12 horas.
              Próximo backup programado para: {format(new Date(Date.now() + 6 * 60 * 60 * 1000), 'dd/MM/yyyy às HH:mm')}.
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Frequência</h4>
              <p className="text-sm text-muted-foreground">A cada 12 horas</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Localização</h4>
              <p className="text-sm text-muted-foreground">localStorage (Temporário)</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Retenção</h4>
              <p className="text-sm text-muted-foreground">30 dias</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Compressão</h4>
              <p className="text-sm text-muted-foreground">JSON compactado</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Backups */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Backups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockBackups.map((backup) => (
              <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(backup.status)}
                    <h4 className="font-semibold">
                      Backup {format(new Date(backup.date), 'dd/MM/yyyy')}
                    </h4>
                    {getStatusBadge(backup.status)}
                    <Badge variant="outline">{getTypeLabel(backup.type)}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Hora: {format(new Date(backup.date), 'HH:mm')}</span>
                    <span>Tamanho: {backup.size}</span>
                    <span>Registros: {backup.records}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={isCreatingBackup || isRestoring}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRestore(backup.id)}
                    disabled={isCreatingBackup || isRestoring}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {isRestoring ? "Restaurando..." : "Restaurar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Informações Importantes */}
      <Card>
        <CardHeader>
          <CardTitle>⚠️ Importante - Implementação Futura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Esta é uma simulação para demonstração.</strong> 
              Na implementação final com Electron, os backups serão salvos em:
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Localização no Windows:</h4>
              <code className="text-xs bg-muted p-2 rounded block">
                C:\Users\[Usuario]\AppData\Local\SistemaFrota\backups\
              </code>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Formato do arquivo:</h4>
              <code className="text-xs bg-muted p-2 rounded block">
                backup_YYYY-MM-DD_HH-mm.json
              </code>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold">Funcionalidades a implementar:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Backup automático em servidor Node.js local</li>
              <li>• Salvamento em arquivo físico (dados.json)</li>
              <li>• Restauração completa do sistema</li>
              <li>• Exportação para USB/rede</li>
              <li>• Verificação de integridade dos backups</li>
              <li>• Notificações de backup bem-sucedido/falhado</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};