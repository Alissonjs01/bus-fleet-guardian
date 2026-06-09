import { normalizeDriverStatus } from '@/constants/driverStatus';
import { VEHICLE_TYPES, normalizeVehicleType } from '@/constants/vehicleTypes';
import { FleetData } from '@/types/fleet';

const STORAGE_KEY = 'fleet-management-cache';

export const normalizeRegistration = (value: string): string => value.trim().toUpperCase();

const normalizeProblemStatus = (value: unknown) => {
  const status = String(value || '').toLowerCase().trim();
  if (['em_andamento', 'em andamento', 'in_progress'].includes(status)) return 'em_andamento';
  if (['resolvida', 'resolvido', 'resolved'].includes(status)) return 'resolvida';
  if (['cancelada', 'cancelado', 'canceled', 'cancelled'].includes(status)) return 'cancelada';
  return 'aberta';
};

const normalizeRevisionStatus = (value: unknown) => {
  const status = String(value || '').toLowerCase().trim();
  if (['em_andamento', 'em andamento', 'in_progress'].includes(status)) return 'em_andamento';
  if (['concluida', 'concluída', 'concluido', 'concluído', 'completed'].includes(status)) return 'concluida';
  if (['cancelada', 'cancelado', 'canceled', 'cancelled'].includes(status)) return 'cancelada';
  return 'agendada';
};

const normalizeFleetData = (data: FleetData): FleetData => ({
  vehicles: (data.vehicles || []).map((vehicle) => {
    const vehicleType = normalizeVehicleType(vehicle.vehicleType || vehicle.tipo);
    return {
      ...vehicle,
      numeroRegistro: normalizeRegistration(vehicle.numeroRegistro),
      tipo: vehicleType,
      vehicleType,
    };
  }),
  drivers: (data.drivers || []).map((driver) => ({
    ...driver,
    numeroRegistro: normalizeRegistration(driver.numeroRegistro || driver.registrationNumber || ''),
    registrationNumber: normalizeRegistration(driver.registrationNumber || driver.numeroRegistro || ''),
    registrationNumberNormalized: normalizeRegistration(driver.registrationNumber || driver.numeroRegistro || ''),
    nome: driver.nome || driver.name,
    name: driver.name || driver.nome,
    telefone: driver.telefone || driver.phone,
    phone: driver.phone || driver.telefone,
    status: normalizeDriverStatus(driver.status),
  })),
  problems: (data.problems || []).map((problem) => ({
    ...problem,
    status: normalizeProblemStatus(problem.status),
  })),
  revisions: (data.revisions || []).map((revision) => ({
    ...revision,
    status: normalizeRevisionStatus(revision.status),
  })),
  trips: data.trips || [],
  routes: data.routes || [],
  vehicleDevices: data.vehicleDevices || [],
});

export const getFleetData = (): FleetData => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return getInitialData();
    }
    return normalizeFleetData(JSON.parse(data));
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    return getInitialData();
  }
};

export const saveFleetData = (data: FleetData): void => {
  try {
    const normalizedData = normalizeFleetData(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedData));
    window.dispatchEvent(new CustomEvent('fleet-cache-updated', { detail: normalizedData }));
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
  }
};

export const saveFleetCache = (data: FleetData): void => {
  try {
    const normalizedData = normalizeFleetData(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedData));
    window.dispatchEvent(new CustomEvent('fleet-cache-refreshed', { detail: normalizedData }));
  } catch (error) {
    console.error('Erro ao salvar cache:', error);
  }
};

export const createBackup = (): string => {
  const data = getFleetData();
  const backup = {
    ...data,
    backupDate: new Date().toISOString(),
    version: '1.0.0'
  };

  const backupKey = `backup_${new Date().toISOString().split('T')[0]}`;
  localStorage.setItem(backupKey, JSON.stringify(backup));

  return backupKey;
};

export const restoreBackup = (backupKey: string): boolean => {
  try {
    const backup = localStorage.getItem(backupKey);
    if (!backup) return false;

    const data = JSON.parse(backup);
    delete data.backupDate;
    delete data.version;

    saveFleetData(data);
    return true;
  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    return false;
  }
};

export const getInitialFleetData = (): FleetData => ({
  vehicles: [
    { id: 1, numeroRegistro: "05", tipo: VEHICLE_TYPES.VAN, vehicleType: VEHICLE_TYPES.VAN, status: "operacao", createdAt: "2024-01-15T08:00:00Z" },
    { id: 2, numeroRegistro: "12", tipo: VEHICLE_TYPES.MICRO_ONIBUS, vehicleType: VEHICLE_TYPES.MICRO_ONIBUS, status: "garagem", createdAt: "2024-01-20T09:30:00Z" },
    { id: 3, numeroRegistro: "08", tipo: VEHICLE_TYPES.CONVENCIONAL, vehicleType: VEHICLE_TYPES.CONVENCIONAL, status: "manutencao", createdAt: "2024-02-01T10:15:00Z" },
    { id: 4, numeroRegistro: "15", tipo: VEHICLE_TYPES.ELETRICO, vehicleType: VEHICLE_TYPES.ELETRICO, status: "operacao", createdAt: "2024-02-10T11:00:00Z" },
  ],
  drivers: [
    { id: 1, numeroRegistro: "M001", registrationNumber: "M001", registrationNumberNormalized: "M001", nome: "Carlos Silva", name: "Carlos Silva", telefone: "(11) 99999-1111", phone: "(11) 99999-1111", document: "000.000.000-01", status: "active", createdAt: "2024-01-10T08:00:00Z" },
    { id: 2, numeroRegistro: "M002", registrationNumber: "M002", registrationNumberNormalized: "M002", nome: "Joao Santos", name: "Joao Santos", telefone: "(11) 99999-2222", phone: "(11) 99999-2222", document: "000.000.000-02", status: "inactive", createdAt: "2024-01-12T09:00:00Z" },
    { id: 3, numeroRegistro: "M003", registrationNumber: "M003", registrationNumberNormalized: "M003", nome: "Pedro Lima", name: "Pedro Lima", document: "000.000.000-03", status: "blocked", createdAt: "2024-01-18T10:00:00Z" },
  ],
  problems: [
    {
      id: 1,
      vehicleId: 1,
      driverId: 1,
      categoria: "eletrica",
      gravidade: "alta",
      observacao: "Problema no sistema de ar condicionado",
      status: "aberta",
      createdAt: "2024-07-25T14:30:00Z"
    },
    {
      id: 2,
      vehicleId: 3,
      driverId: 2,
      categoria: "mecanica",
      gravidade: "critica",
      observacao: "Freios fazendo ruido estranho",
      status: "aberta",
      createdAt: "2024-07-26T10:15:00Z"
    },
    {
      id: 3,
      vehicleId: 2,
      driverId: 3,
      categoria: "funilaria",
      gravidade: "baixa",
      observacao: "Arranhao na lateral direita",
      status: "resolvida",
      createdAt: "2024-07-20T16:45:00Z",
      resolvedAt: "2024-07-22T09:00:00Z"
    }
  ],
  revisions: [
    {
      id: 1,
      vehicleId: 1,
      tipo: "geral",
      status: "concluida",
      dataRevisao: "2024-06-15",
      dataProxima: "2026-06-15",
      observacao: "Revisao completa realizada",
      responsavel: "Oficina Central",
      createdAt: "2024-06-15T08:00:00Z"
    },
    {
      id: 2,
      vehicleId: 2,
      tipo: "mecanica",
      status: "agendada",
      dataRevisao: "2024-05-20",
      dataProxima: "2026-05-20",
      observacao: "Troca de oleo e filtros",
      responsavel: "Mecanico Joao",
      createdAt: "2024-05-20T10:30:00Z"
    },
    {
      id: 3,
      vehicleId: 3,
      tipo: "eletrica",
      status: "agendada",
      dataRevisao: "2024-04-10",
      dataProxima: "2026-05-10",
      observacao: "Verificacao do sistema eletrico",
      responsavel: "Eletricista Mario",
      createdAt: "2024-04-10T14:20:00Z"
    }
  ],
  trips: [],
  routes: [],
  vehicleDevices: [],
});

const getInitialData = getInitialFleetData;
