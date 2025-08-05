import { ProblemReport, TripSession, TripHistory, APIResponse } from '../types/mobile';

// Configuração da API - será substituída pela URL real do servidor
const API_BASE_URL = 'http://192.168.1.100:3000'; // Exemplo de IP local

class MobileAPIService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<APIResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Error:', error);
      // Simulação para desenvolvimento
      return this.simulateResponse<T>(endpoint, options);
    }
  }

  // Simulação para desenvolvimento - remover quando APIs reais estiverem prontas
  private simulateResponse<T>(endpoint: string, options: RequestInit): APIResponse<T> {
    console.log('Simulando requisição:', endpoint, options);
    
    switch (endpoint) {
      case '/login':
        return { success: true, data: { nome: 'Carlos Silva' } as T };
      case '/saida':
        return { success: true, message: 'Saída registrada com sucesso' };
      case '/retorno':
        return { success: true, message: 'Retorno registrado com sucesso' };
      case '/problema':
        return { success: true, message: 'Problema reportado com sucesso' };
      default:
        if (endpoint.startsWith('/historico/')) {
          const mockHistory = [
            {
              id: '1',
              vehicleNumber: '05',
              startTime: '2024-01-15T08:00:00Z',
              endTime: '2024-01-15T16:00:00Z',
              problems: [],
              distance: 120
            }
          ];
          return { success: true, data: mockHistory as T };
        }
        return { success: false, message: 'Endpoint não encontrado' };
    }
  }

  async login(numeroRegistro: string): Promise<APIResponse<{ nome: string }>> {
    return this.makeRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ numeroRegistro }),
    });
  }

  async registrarSaida(vehicleNumber: string, driverNumber: string): Promise<APIResponse> {
    return this.makeRequest('/saida', {
      method: 'POST',
      body: JSON.stringify({
        vehicleNumber,
        driverNumber,
        timestamp: new Date().toISOString(),
      }),
    });
  }

  async registrarRetorno(vehicleNumber: string, driverNumber: string, problems: ProblemReport[]): Promise<APIResponse> {
    return this.makeRequest('/retorno', {
      method: 'POST',
      body: JSON.stringify({
        vehicleNumber,
        driverNumber,
        timestamp: new Date().toISOString(),
        problems,
      }),
    });
  }

  async reportarProblema(problem: Omit<ProblemReport, 'id' | 'reportedAt'>): Promise<APIResponse> {
    return this.makeRequest('/problema', {
      method: 'POST',
      body: JSON.stringify({
        ...problem,
        reportedAt: new Date().toISOString(),
      }),
    });
  }

  async getHistorico(numeroRegistro: string): Promise<APIResponse<TripHistory[]>> {
    return this.makeRequest(`/historico/${numeroRegistro}`);
  }

  async syncData(): Promise<APIResponse> {
    return this.makeRequest('/sync', {
      method: 'POST',
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
      }),
    });
  }
}

export const mobileAPI = new MobileAPIService();