import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Camera } from 'lucide-react';
import { MobileLayout } from '../components/MobileLayout';
import { mobileStorage } from '../utils/storage';
import { mobileAPI } from '../services/api';
import { ProblemReport as ProblemReportType } from '../types/mobile';

interface ProblemReportProps {
  onProblemReported: () => void;
  onBack: () => void;
}

const categorias = [
  { value: 'eletrica', label: 'Elétrica', icon: '⚡' },
  { value: 'mecanica', label: 'Mecânica', icon: '🔧' },
  { value: 'funilaria', label: 'Funilaria', icon: '🛠️' },
  { value: 'limpeza', label: 'Limpeza', icon: '🧽' },
  { value: 'pneus', label: 'Pneus', icon: '🛞' },
  { value: 'outros', label: 'Outros', icon: '❓' },
];

const gravidades = [
  { value: 'baixa', label: 'Baixa', color: 'bg-blue-500' },
  { value: 'media', label: 'Média', color: 'bg-yellow-500' },
  { value: 'alta', label: 'Alta', color: 'bg-orange-500' },
  { value: 'critica', label: 'Crítica', color: 'bg-red-500' },
];

export const ProblemReport = ({ onProblemReported, onBack }: ProblemReportProps) => {
  const [categoria, setCategoria] = useState('');
  const [gravidade, setGravidade] = useState('');
  const [observacao, setObservacao] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const currentTrip = mobileStorage.getCurrentTrip();
  const driver = mobileStorage.getCurrentDriver();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoria || !gravidade || !observacao.trim()) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    if (!currentTrip || !driver) {
      setError('Dados da viagem não encontrados');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const problemData: Omit<ProblemReportType, 'id' | 'reportedAt'> = {
        vehicleNumber: currentTrip.vehicleNumber,
        driverNumber: driver.numeroRegistro,
        categoria: categoria as any,
        gravidade: gravidade as any,
        observacao: observacao.trim(),
      };

      const response = await mobileAPI.reportarProblema(problemData);
      
      if (response.success) {
        // Limpar formulário
        setCategoria('');
        setGravidade('');
        setObservacao('');
        onProblemReported();
      } else {
        setError(response.message || 'Erro ao reportar problema');
      }
    } catch (error) {
      // Salvar localmente se offline
      const problem: ProblemReportType = {
        id: `problem_${Date.now()}`,
        vehicleNumber: currentTrip.vehicleNumber,
        driverNumber: driver.numeroRegistro,
        categoria: categoria as any,
        gravidade: gravidade as any,
        observacao: observacao.trim(),
        reportedAt: new Date().toISOString(),
      };
      
      mobileStorage.addPendingProblem(problem);
      mobileStorage.addToOfflineQueue({
        type: 'problema',
        data: problem,
        timestamp: new Date().toISOString(),
      });
      
      setCategoria('');
      setGravidade('');
      setObservacao('');
      onProblemReported();
    } finally {
      setIsLoading(false);
    }
  };

  const getGravidadeColor = (value: string) => {
    const grav = gravidades.find(g => g.value === value);
    return grav?.color || 'bg-gray-500';
  };

  return (
    <MobileLayout 
      title="Reportar Problema" 
      showBackButton 
      onBack={onBack}
    >
      <div className="space-y-6">
        {/* Trip Info */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex justify-between text-sm">
              <span>Veículo: <strong>{currentTrip?.vehicleNumber}</strong></span>
              <span>Motorista: <strong>{driver?.numeroRegistro}</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Problem Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Detalhes do Problema
            </CardTitle>
            <CardDescription>
              Preencha as informações sobre o problema encontrado
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Categoria */}
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria *</Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Gravidade */}
              <div className="space-y-2">
                <Label htmlFor="gravidade">Gravidade *</Label>
                <Select value={gravidade} onValueChange={setGravidade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a gravidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {gravidades.map((grav) => (
                      <SelectItem key={grav.value} value={grav.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${grav.color}`} />
                          <span>{grav.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview da Gravidade */}
              {gravidade && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Gravidade selecionada:</span>
                  <Badge className={`${getGravidadeColor(gravidade)} text-white`}>
                    {gravidades.find(g => g.value === gravidade)?.label}
                  </Badge>
                </div>
              )}

              {/* Observação */}
              <div className="space-y-2">
                <Label htmlFor="observacao">Descrição do Problema *</Label>
                <Textarea
                  id="observacao"
                  placeholder="Descreva detalhadamente o problema encontrado..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <div className="text-xs text-muted-foreground text-right">
                  {observacao.length}/500 caracteres
                </div>
              </div>

              {/* Foto (placeholder) */}
              <div className="space-y-2">
                <Label>Foto (Opcional)</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-20 border-dashed"
                  disabled
                >
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Adicionar foto (em breve)
                    </span>
                  </div>
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Reportar Problema'
                  )}
                </Button>

                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={onBack}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-medium">💡 Dicas:</p>
              <p>• Seja específico na descrição</p>
              <p>• Use gravidade "Crítica" para problemas de segurança</p>
              <p>• Problemas serão enviados ao supervisor imediatamente</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
};