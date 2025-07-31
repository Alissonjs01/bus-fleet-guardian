import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  History as HistoryIcon, 
  Clock, 
  MapPin, 
  AlertTriangle,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { MobileLayout } from '../components/MobileLayout';
import { mobileStorage } from '../utils/storage';
import { mobileAPI } from '../services/api';
import { TripHistory } from '../types/mobile';

interface HistoryProps {
  onBack: () => void;
}

export const History = ({ onBack }: HistoryProps) => {
  const [history, setHistory] = useState<TripHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const driver = mobileStorage.getCurrentDriver();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    if (!driver) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await mobileAPI.getHistorico(driver.numeroRegistro);
      
      if (response.success && response.data) {
        setHistory(response.data);
      } else {
        setError(response.message || 'Erro ao carregar histórico');
      }
    } catch (error) {
      // Dados simulados para demonstração
      const mockHistory: TripHistory[] = [
        {
          id: '1',
          vehicleNumber: '05',
          startTime: '2024-01-15T08:00:00Z',
          endTime: '2024-01-15T16:00:00Z',
          problems: [
            {
              id: 'p1',
              vehicleNumber: '05',
              driverNumber: driver?.numeroRegistro || '',
              categoria: 'mecanica',
              gravidade: 'media',
              observacao: 'Ruído estranho no motor durante aceleração',
              reportedAt: '2024-01-15T12:30:00Z',
            }
          ],
          distance: 120
        },
        {
          id: '2',
          vehicleNumber: '03',
          startTime: '2024-01-14T07:30:00Z',
          endTime: '2024-01-14T15:45:00Z',
          problems: [],
          distance: 98
        },
        {
          id: '3',
          vehicleNumber: '05',
          startTime: '2024-01-13T08:15:00Z',
          endTime: '2024-01-13T16:30:00Z',
          problems: [
            {
              id: 'p2',
              vehicleNumber: '05',
              driverNumber: driver?.numeroRegistro || '',
              categoria: 'limpeza',
              gravidade: 'baixa',
              observacao: 'Bancos precisam de limpeza profunda',
              reportedAt: '2024-01-13T15:00:00Z',
            }
          ],
          distance: 105
        }
      ];
      setHistory(mockHistory);
    } finally {
      setIsLoading(false);
    }
  };

  const getTripDuration = (start: string, end?: string) => {
    if (!end) return 'Em andamento';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getProblemSeverityColor = (gravidade: string) => {
    switch (gravidade) {
      case 'critica': return 'bg-red-500 text-white';
      case 'alta': return 'bg-orange-500 text-white';
      case 'media': return 'bg-yellow-500 text-white';
      case 'baixa': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStats = () => {
    const totalTrips = history.length;
    const totalProblems = history.reduce((acc, trip) => acc + trip.problems.length, 0);
    const totalDistance = history.reduce((acc, trip) => acc + (trip.distance || 0), 0);
    const avgDistance = totalTrips > 0 ? Math.round(totalDistance / totalTrips) : 0;

    return { totalTrips, totalProblems, totalDistance, avgDistance };
  };

  const stats = getStats();

  return (
    <MobileLayout 
      title="Histórico" 
      showBackButton 
      onBack={onBack}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Viagens</p>
                  <p className="text-xl font-bold">{stats.totalTrips}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Problemas</p>
                  <p className="text-xl font-bold">{stats.totalProblems}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Km Total</p>
                  <p className="text-xl font-bold">{stats.totalDistance}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Km Médio</p>
                  <p className="text-xl font-bold">{stats.avgDistance}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* History Tabs */}
        <Tabs defaultValue="trips" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trips">Viagens</TabsTrigger>
            <TabsTrigger value="problems">Problemas</TabsTrigger>
          </TabsList>

          <TabsContent value="trips" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="pt-4">
                      <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : history.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <HistoryIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma viagem encontrada</p>
                </CardContent>
              </Card>
            ) : (
              history.map((trip) => (
                <Card key={trip.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Veículo {trip.vehicleNumber}
                      </CardTitle>
                      <Badge variant="outline">
                        {trip.endTime ? 'Concluída' : 'Em andamento'}
                      </Badge>
                    </div>
                    <CardDescription>
                      {new Date(trip.startTime).toLocaleDateString('pt-BR')}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Duração:</span>
                        <span className="font-medium">
                          {getTripDuration(trip.startTime, trip.endTime)}
                        </span>
                      </div>
                      
                      {trip.distance && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Distância:</span>
                          <span className="font-medium">{trip.distance} km</span>
                        </div>
                      )}
                    </div>

                    {trip.problems.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">
                          Problemas ({trip.problems.length}):
                        </p>
                        <div className="space-y-2">
                          {trip.problems.map((problem) => (
                            <div key={problem.id} className="flex items-center gap-2">
                              <Badge 
                                className={getProblemSeverityColor(problem.gravidade)}
                                variant="secondary"
                              >
                                {problem.gravidade}
                              </Badge>
                              <span className="text-sm capitalize">
                                {problem.categoria}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="problems" className="space-y-4">
            {(() => {
              const allProblems = history.flatMap(trip => 
                trip.problems.map(problem => ({
                  ...problem,
                  tripDate: trip.startTime,
                  vehicleNumber: trip.vehicleNumber
                }))
              );

              return allProblems.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum problema reportado</p>
                  </CardContent>
                </Card>
              ) : (
                allProblems.map((problem) => (
                  <Card key={problem.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={getProblemSeverityColor(problem.gravidade)}
                            variant="secondary"
                          >
                            {problem.gravidade}
                          </Badge>
                          <span className="font-medium capitalize">
                            {problem.categoria}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Veículo {problem.vehicleNumber}
                        </span>
                      </div>
                      <CardDescription>
                        {new Date(problem.tripDate).toLocaleDateString('pt-BR')} - {' '}
                        {new Date(problem.reportedAt).toLocaleTimeString('pt-BR')}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <p className="text-sm">{problem.observacao}</p>
                    </CardContent>
                  </Card>
                ))
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
};