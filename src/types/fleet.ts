export interface Vehicle {
  id: number;
  firestoreId?: string;
  companyId?: string;
  numeroRegistro: string;
  tipo: 'micro_onibus' | 'onibus' | 'articulado';
  status: 'operacao' | 'garagem' | 'manutencao';
  createdAt: string;
  updatedAt?: string;
}

export interface Driver {
  id: number;
  firestoreId?: string;
  companyId?: string;
  numeroRegistro: string;
  nome: string;
  telefone?: string;
  status?: 'active' | 'blocked' | 'inactive';
  createdAt: string;
  updatedAt?: string;
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

export interface FleetData {
  vehicles: Vehicle[];
  drivers: Driver[];
  problems: Problem[];
  revisions: Revision[];
  trips: Trip[];
}

export interface DashboardStats {
  totalVehicles: number;
  inOperation: number;
  inGarage: number;
  inMaintenance: number;
  overdueRevisions: number;
  upcomingRevisions: number;
  openProblems: number;
}
