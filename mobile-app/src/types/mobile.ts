export interface MobileDriver {
  numeroRegistro: string;
  nome: string;
  isLoggedIn: boolean;
}

export interface TripSession {
  id: string;
  vehicleNumber: string;
  driverNumber: string;
  startTime: string;
  endTime?: string;
  isActive: boolean;
}

export interface ProblemReport {
  id: string;
  vehicleNumber: string;
  driverNumber: string;
  categoria: 'eletrica' | 'mecanica' | 'funilaria' | 'limpeza' | 'pneus' | 'outros';
  gravidade: 'baixa' | 'media' | 'alta' | 'critica';
  observacao: string;
  reportedAt: string;
  images?: string[];
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface TripHistory {
  id: string;
  vehicleNumber: string;
  startTime: string;
  endTime?: string;
  problems: ProblemReport[];
  distance?: number;
}