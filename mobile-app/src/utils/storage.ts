import { MobileDriver, TripSession, ProblemReport, OfflineAction } from '../types/mobile';

const MOBILE_STORAGE_KEYS = {
  DRIVER: 'mobile_current_driver',
  DRIVER_SESSION: 'fleet_driver_session',
  TRIP_SESSION: 'mobile_current_trip',
  PENDING_PROBLEMS: 'mobile_pending_problems',
  OFFLINE_QUEUE: 'mobile_offline_queue',
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isSessionValid(sessionDate?: string) {
  return !!sessionDate && sessionDate === todayKey();
}

export const mobileStorage = {
  setCurrentDriver: (driver: MobileDriver) => {
    sessionStorage.setItem(MOBILE_STORAGE_KEYS.DRIVER_SESSION, JSON.stringify({
      registrationNumber: driver.numeroRegistro,
      driverId: driver.firestoreId,
      sessionDate: todayKey(),
    }));
    localStorage.setItem(MOBILE_STORAGE_KEYS.DRIVER, JSON.stringify({ ...driver, sessionDate: todayKey() }));
  },

  getCurrentDriver: (): MobileDriver | null => {
    const session = sessionStorage.getItem(MOBILE_STORAGE_KEYS.DRIVER_SESSION);
    if (!session) return null;

    const parsedSession = JSON.parse(session);
    if (!isSessionValid(parsedSession.sessionDate)) {
      mobileStorage.clearCurrentDriver();
      mobileStorage.clearCurrentTrip();
      mobileStorage.clearPendingProblems();
      return null;
    }

    const stored = localStorage.getItem(MOBILE_STORAGE_KEYS.DRIVER);
    if (!stored) return null;

    const driver = JSON.parse(stored);
    if (!isSessionValid(driver.sessionDate)) {
      mobileStorage.clearCurrentDriver();
      mobileStorage.clearCurrentTrip();
      mobileStorage.clearPendingProblems();
      return null;
    }

    return driver;
  },

  clearCurrentDriver: () => {
    localStorage.removeItem(MOBILE_STORAGE_KEYS.DRIVER);
    sessionStorage.removeItem(MOBILE_STORAGE_KEYS.DRIVER_SESSION);
  },

  setCurrentTrip: (trip: TripSession) => {
    localStorage.setItem(MOBILE_STORAGE_KEYS.TRIP_SESSION, JSON.stringify(trip));
  },

  getCurrentTrip: (): TripSession | null => {
    const stored = localStorage.getItem(MOBILE_STORAGE_KEYS.TRIP_SESSION);
    return stored ? JSON.parse(stored) : null;
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
    const stored = localStorage.getItem(MOBILE_STORAGE_KEYS.PENDING_PROBLEMS);
    return stored ? JSON.parse(stored) : [];
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
    const stored = localStorage.getItem(MOBILE_STORAGE_KEYS.OFFLINE_QUEUE);
    return stored ? JSON.parse(stored) : [];
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
};
