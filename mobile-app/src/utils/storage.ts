import { ActiveRouteSession, MobileDriver, TripSession, ProblemReport, OfflineAction } from '../types/mobile';

const MOBILE_STORAGE_KEYS = {
  DRIVER: 'mobile_current_driver',
  TRIP_SESSION: 'mobile_current_trip',
  PENDING_PROBLEMS: 'mobile_pending_problems',
  OFFLINE_QUEUE: 'mobile_offline_queue',
};

function parseStored<T>(key: string): T | null {
  const stored = localStorage.getItem(key);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as T;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function activeRouteToTrip(route: ActiveRouteSession): TripSession {
  return {
    id: route.tripId || route.routeId,
    routeId: route.routeId,
    tripId: route.tripId,
    vehicleNumber: route.vehicleNumber,
    driverNumber: route.driverNumber,
    startTime: route.startTime,
    startLocation: route.startLocation || null,
    startLocationError: route.startLocationError || null,
    startKm: route.startKm,
    isActive: true,
  };
}

export const mobileStorage = {
  setCurrentDriver: (driver: MobileDriver) => {
    localStorage.setItem(MOBILE_STORAGE_KEYS.DRIVER, JSON.stringify({ ...driver, isLoggedIn: true }));
  },

  getCurrentDriver: (): MobileDriver | null => {
    const driver = parseStored<MobileDriver>(MOBILE_STORAGE_KEYS.DRIVER);
    return driver?.isLoggedIn ? driver : null;
  },

  clearCurrentDriver: () => {
    localStorage.removeItem(MOBILE_STORAGE_KEYS.DRIVER);
  },

  setCurrentTrip: (trip: TripSession) => {
    localStorage.setItem(MOBILE_STORAGE_KEYS.TRIP_SESSION, JSON.stringify(trip));
  },

  getCurrentTrip: (): TripSession | null => {
    return parseStored<TripSession>(MOBILE_STORAGE_KEYS.TRIP_SESSION);
  },

  clearCurrentTrip: () => {
    localStorage.removeItem(MOBILE_STORAGE_KEYS.TRIP_SESSION);
  },

  addPendingProblem: (problem: ProblemReport) => {
    const existing = mobileStorage.getPendingProblems();
    existing.push(problem);
    localStorage.setItem(MOBILE_STORAGE_KEYS.PENDING_PROBLEMS, JSON.stringify(existing));
  },

  getPendingProblems: (): ProblemReport[] => {
    return parseStored<ProblemReport[]>(MOBILE_STORAGE_KEYS.PENDING_PROBLEMS) || [];
  },

  clearPendingProblems: () => {
    localStorage.removeItem(MOBILE_STORAGE_KEYS.PENDING_PROBLEMS);
  },

  removePendingProblem: (problemId: string) => {
    const existing = mobileStorage.getPendingProblems();
    const filtered = existing.filter(p => p.id !== problemId);
    localStorage.setItem(MOBILE_STORAGE_KEYS.PENDING_PROBLEMS, JSON.stringify(filtered));
  },

  addToOfflineQueue: (action: OfflineAction) => {
    const queue = mobileStorage.getOfflineQueue();
    queue.push(action);
    localStorage.setItem(MOBILE_STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  },

  getOfflineQueue: (): OfflineAction[] => {
    return parseStored<OfflineAction[]>(MOBILE_STORAGE_KEYS.OFFLINE_QUEUE) || [];
  },

  clearOfflineQueue: () => {
    localStorage.removeItem(MOBILE_STORAGE_KEYS.OFFLINE_QUEUE);
  },

  isLoggedIn: (): boolean => {
    const driver = mobileStorage.getCurrentDriver();
    return driver?.isLoggedIn || false;
  },

  hasActiveTrip: (): boolean => {
    const trip = mobileStorage.getCurrentTrip();
    return trip?.isActive || false;
  },

  restoreActiveRoute: (route: ActiveRouteSession): TripSession => {
    const trip = activeRouteToTrip(route);
    mobileStorage.setCurrentTrip(trip);
    return trip;
  },
};
