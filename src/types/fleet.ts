import type { DriverStatus } from "@/constants/driverStatus";
import type { VehicleType } from "@/constants/vehicleTypes";
import type { GeoPointFailure, GeoPointSnapshot } from "@/utils/geolocation";

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
  status: 'aberta' | 'em_andamento' | 'resolvida' | 'cancelada';
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
  location?: GeoPointSnapshot | null;
  locationError?: GeoPointFailure | null;
  routeId?: number;
  routeFirestoreId?: string;
}

export interface Revision {
  id: number;
  firestoreId?: string;
  companyId?: string;
  vehicleId: number;
  tipo: 'eletrica' | 'mecanica' | 'funilaria' | 'geral';
  status: 'agendada' | 'em_andamento' | 'concluida' | 'cancelada';
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
  startLocation?: GeoPointSnapshot | null;
  startLocationError?: GeoPointFailure | null;
  endLocation?: GeoPointSnapshot | null;
  endLocationError?: GeoPointFailure | null;
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
  startLocation?: GeoPointSnapshot | null;
  startLocationError?: GeoPointFailure | null;
  endLocation?: GeoPointSnapshot | null;
  endLocationError?: GeoPointFailure | null;
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
