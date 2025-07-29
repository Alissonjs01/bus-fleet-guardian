export interface Vehicle {
  id: number;
  numeroRegistro: string;
  status: 'operacao' | 'garagem' | 'manutencao';
  createdAt: string;
}

export interface Driver {
  id: number;
  numeroRegistro: string;
  nome: string;
  telefone?: string;
  createdAt: string;
}

export interface Problem {
  id: number;
  vehicleId: number;
  driverId: number;
  categoria: 'eletrica' | 'mecanica' | 'funilaria' | 'limpeza' | 'pneus' | 'outros';
  gravidade: 'baixa' | 'media' | 'alta' | 'critica';
  observacao: string;
  status: 'aberto' | 'resolvido';
  createdAt: string;
  resolvedAt?: string;
}

export interface Revision {
  id: number;
  vehicleId: number;
  tipo: 'eletrica' | 'mecanica' | 'funilaria' | 'geral';
  dataRevisao: string;
  dataProxima: string;
  observacao?: string;
  responsavel?: string;
  createdAt: string;
}

export interface Trip {
  id: number;
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