import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertTriangle, Plus } from 'lucide-react';
import { MobileLayout } from '../components/MobileLayout';
import { mobileStorage } from '../utils/storage';
import { mobileAPI } from '../services/api';
import { ProblemReport } from '../types/mobile';

interface TripEndProps {
  onTripEnded: () => void;
  onReportProblem: () => void;
  onBack: () => void;
}

export const TripEnd = ({ onTripEnded, onReportProblem, onBack }: TripEndProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const currentTrip = mobileStorage.getCurrentTrip();
  const pendingProblems = mobileStorage.getPendingProblems();
  const driver = mobileStorage.getCurrentDriver();

  const handleEndTrip = async () => {
    if (!currentTrip || !driver) {
      setError('Dados da viagem não encontrados');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await mobileAPI.registrarRetorno(
        currentTrip.vehicleNumber,
        driver.numeroRegistro,
        pendingProblems
      );
      
      if (response.success) {
        // Limpar dados locais
        mobileStorage.clearCurrentTrip();
        mobileStorage.clearPendingProblems();
        onTripEnded();
      } else {
        setError(response.message || 'Erro ao registrar retorno');
      }
    } catch (error) {
      setError('Erro de conexão. Dados salvos localmente.');
      
      // Salvar offline
      mobileStorage.addToOfflineQueue({
        type: 'retorno',
        data: {
          vehicleNumber: currentTrip.vehicleNumber,
          driverNumber: driver.numeroRegistro,
          problems: pendingProblems,
        },
        timestamp: new Date().toISOString(),
      });
      
      // Finalizar viagem mesmo offline
      mobileStorage.clearCurrentTrip();
      mobileStorage.clearPendingProblems();
      onTripEnded();
    } finally {
      setIsLoading(false);
    }
  };

  const getTripDuration = () => {
    if (!currentTrip) return '';
    const start = new Date(currentTrip.startTime);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getProblemSeverityColor = (gravidade: string) => {
    switch (gravidade) {
      case 'critica': return 'bg-red-500';
      case 'alta': return 'bg-orange-500';
      case 'media': return 'bg-yellow-500';
      case 'baixa': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <MobileLayout 
      title="Finalizar Viagem" 
      showBackButton 
      onBack={onBack}
    >
      <div className="space-y-6">
        {/* Trip Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Resumo da Viagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Veículo:</span>
                <p className="font-medium">{currentTrip?.vehicleNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Duração:</span>
                <p className="font-medium">{getTripDuration()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Motorista:</span>
                <p className="font-medium">{driver?.numeroRegistro}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Início:</span>
                <p className="font-medium">
                  {currentTrip && new Date(currentTrip.startTime).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Problems Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Problemas Reportados
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={onReportProblem}
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            <CardDescription>
              {pendingProblems.length === 0 
                ? 'Nenhum problema reportado nesta viagem'
                : `${pendingProblems.length} problema(s) reportado(s)`
              }
            </CardDescription>
          </CardHeader>
          
          {pendingProblems.length > 0 && (
            <CardContent>
              <div className="space-y-3">
                {pendingProblems.map((problem, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={`${getProblemSeverityColor(problem.gravidade)} text-white`}
                          variant="secondary"
                        >
                          {problem.gravidade}
                        </Badge>
                        <span className="text-sm font-medium capitalize">
                          {problem.categoria}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(problem.reportedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {problem.observacao}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={handleEndTrip}
            className="w-full" 
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finalizando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Finalizar Viagem
              </>
            )}
          </Button>

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={onBack}
            disabled={isLoading}
          >
            Voltar
          </Button>
        </div>

        {/* Status Info */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Os dados serão sincronizados automaticamente</p>
              <p>• Problemas críticos são priorizados no sistema</p>
              <p>• O histórico ficará disponível no painel</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
};