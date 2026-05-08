import type { DriverStatus } from '@/constants/driverStatus';

export type ProblemCategory = 'eletrica' | 'mecanica' | 'funilaria' | 'limpeza' | 'pneus' | 'outros';
export type ProblemSeverity = 'baixa' | 'media' | 'alta' | 'critica';

export interface MobileDriver {
  numeroRegistro: string;
  nome: string;
  firestoreId?: string;
  userId?: string;
  companyId?: string;
  status?: DriverStatus;
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
  categoria: ProblemCategory;
  gravidade: ProblemSeverity;
  observacao: string;
  reportedAt: string;
  images?: string[];
}

export type OfflineAction =
  | { type: 'saida'; data: { vehicleNumber: string; driverNumber: string }; timestamp: string }
  | { type: 'retorno'; data: { vehicleNumber: string; driverNumber: string; problems: ProblemReport[] }; timestamp: string }
  | { type: 'problema'; data: ProblemReport; timestamp: string };

export interface APIResponse<T = unknown> {
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
