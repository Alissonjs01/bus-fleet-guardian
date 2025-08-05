import { FleetData } from '@/types/fleet';

const STORAGE_KEY = 'fleet-management-data';

// TODO: Migrar para servidor Node.js + dados.json quando implementar Electron
export const getFleetData = (): FleetData => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return getInitialData();
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    return getInitialData();
  }
};

export const saveFleetData = (data: FleetData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
  }
};

// TODO: Implementar backup automático a cada 12h quando migrar para Electron
export const createBackup = (): string => {
  const data = getFleetData();
  const backup = {
    ...data,
    backupDate: new Date().toISOString(),
    version: '1.0.0'
  };
  
  // Simula criação de backup (localStorage por enquanto)
  const backupKey = `backup_${new Date().toISOString().split('T')[0]}`;
  localStorage.setItem(backupKey, JSON.stringify(backup));
  
  return backupKey;
};

export const restoreBackup = (backupKey: string): boolean => {
  try {
    const backup = localStorage.getItem(backupKey);
    if (!backup) return false;
    
    const data = JSON.parse(backup);
    // Remove metadata do backup
    delete data.backupDate;
    delete data.version;
    
    saveFleetData(data);
    return true;
  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    return false;
  }
};

const getInitialData = (): FleetData => ({
  vehicles: [
    { id: 1, numeroRegistro: "05", tipo: "onibus", status: "operacao", createdAt: "2024-01-15T08:00:00Z" },
    { id: 2, numeroRegistro: "12", tipo: "micro_onibus", status: "garagem", createdAt: "2024-01-20T09:30:00Z" },
    { id: 3, numeroRegistro: "08", tipo: "articulado", status: "manutencao", createdAt: "2024-02-01T10:15:00Z" },
    { id: 4, numeroRegistro: "15", tipo: "onibus", status: "operacao", createdAt: "2024-02-10T11:00:00Z" },
  ],
  drivers: [
    { id: 1, numeroRegistro: "M001", nome: "Carlos Silva", telefone: "(11) 99999-1111", createdAt: "2024-01-10T08:00:00Z" },
    { id: 2, numeroRegistro: "M002", nome: "João Santos", telefone: "(11) 99999-2222", createdAt: "2024-01-12T09:00:00Z" },
    { id: 3, numeroRegistro: "M003", nome: "Pedro Lima", createdAt: "2024-01-18T10:00:00Z" },
  ],
  problems: [
    {
      id: 1,
      vehicleId: 1,
      driverId: 1,
      categoria: "eletrica",
      gravidade: "alta",
      observacao: "Problema no sistema de ar condicionado",
      status: "aberto",
      createdAt: "2024-07-25T14:30:00Z"
    },
    {
      id: 2,
      vehicleId: 3,
      driverId: 2,
      categoria: "mecanica",
      gravidade: "critica",
      observacao: "Freios fazendo ruído estranho",
      status: "aberto",
      createdAt: "2024-07-26T10:15:00Z"
    },
    {
      id: 3,
      vehicleId: 2,
      driverId: 3,
      categoria: "funilaria",
      gravidade: "baixa",
      observacao: "Arranhão na lateral direita",
      status: "resolvido",
      createdAt: "2024-07-20T16:45:00Z",
      resolvedAt: "2024-07-22T09:00:00Z"
    }
  ],
  revisions: [
    {
      id: 1,
      vehicleId: 1,
      tipo: "geral",
      dataRevisao: "2024-06-15",
      dataProxima: "2024-08-15",
      observacao: "Revisão completa realizada",
      responsavel: "Oficina Central",
      createdAt: "2024-06-15T08:00:00Z"
    },
    {
      id: 2,
      vehicleId: 2,
      tipo: "mecanica",
      dataRevisao: "2024-05-20",
      dataProxima: "2024-07-20",
      observacao: "Troca de óleo e filtros",
      responsavel: "Mecânico João",
      createdAt: "2024-05-20T10:30:00Z"
    },
    {
      id: 3,
      vehicleId: 3,
      tipo: "eletrica",
      dataRevisao: "2024-04-10",
      dataProxima: "2024-07-10",
      observacao: "Verificação do sistema elétrico",
      responsavel: "Eletricista Mario",
      createdAt: "2024-04-10T14:20:00Z"
    }
  ],
  trips: []
});
