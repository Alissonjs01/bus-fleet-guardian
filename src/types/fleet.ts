import type { DriverStatus } from "@/constants/driverStatus";
import type { VehicleType } from "@/constants/vehicleTypes";

export interface Vehicle {
  id: number;
  firestoreId?: string;
  companyId?: string;
  numeroRegistro: string;
  tipo: VehicleType;
  vehicleType: VehicleType;
  status: 'operacao' | 'garagem' | 'manutencao';
  createdAt: string;
  updatedAt?: string;
}

export interface Driver {
  id: number;
  firestoreId?: string;
  companyId?: string;
  numeroRegistro: string;
  registrationNumber: string;
  registrationNumberNormalized?: string;
  nome: string;
  name: string;
  telefone?: string;
  phone?: string;
  document?: string;
  userId?: string;
  status?: DriverStatus;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface Problem {
  id: number;
  firestoreId?: string;
  companyId?: string;
  vehicleId: number;
  driverId: number;
  categoria: 'eletrica' | 'mecanica' | 'funilaria' | 'limpeza' | 'pneus' | 'outros';
  gravidade: 'baixa' | 'media' | 'alta' | 'critica';
  observacao: string;
  status: 'aberto' | 'resolvido';
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
}

export interface Revision {
  id: number;
  firestoreId?: string;
  companyId?: string;
  vehicleId: number;
  tipo: 'eletrica' | 'mecanica' | 'funilaria' | 'geral';
  dataRevisao: string;
  dataProxima: string;
  observacao?: string;
  responsavel?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Trip {
  id: number;
  firestoreId?: string;
  companyId?: string;
  vehicleId: number;
  driverId: number;
  saida: string;
  retorno?: string;
  problemas: Problem[];
  createdAt: string;
}

export interface Route {
  id: number;
  firestoreId?: string;
  companyId?: string;
  driverId: number;
  driverUserId?: string;
  vehicleId: number;
  status: 'active' | 'finished' | 'canceled';
  startedAt: string;
  finishedAt?: string;
  createdAt: string;
}

export interface FleetData {
  vehicles: Vehicle[];
  drivers: Driver[];
  problems: Problem[];
  revisions: Revision[];
  trips: Trip[];
  routes: Route[];
}

export interface DashboardStats {
  totalVehicles: number;
  inOperation: number;
  inGarage: number;
  inMaintenance: number;
  overdueRevisions: number;
  upcomingRevisions: number;
  openProblems: number;
  byVehicleType: Record<VehicleType, number>;
}
