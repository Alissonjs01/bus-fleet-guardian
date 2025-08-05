import { MobileDriver, TripSession, ProblemReport } from '../types/mobile';

const MOBILE_STORAGE_KEYS = {
  DRIVER: 'mobile_current_driver',
  TRIP_SESSION: 'mobile_current_trip',
  PENDING_PROBLEMS: 'mobile_pending_problems',
  OFFLINE_QUEUE: 'mobile_offline_queue',
};

export const mobileStorage = {
  // Driver management
  setCurrentDriver: (driver: MobileDriver) => {
    localStorage.setItem(MOBILE_STORAGE_KEYS.DRIVER, JSON.stringify(driver));
  },

  getCurrentDriver: (): MobileDriver | null => {
    const stored = localStorage.getItem(MOBILE_STORAGE_KEYS.DRIVER);
    return stored ? JSON.parse(stored) : null;
  },

  clearCurrentDriver: () => {
    localStorage.removeItem(MOBILE_STORAGE_KEYS.DRIVER);
  },

  // Trip session management
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

  // Problems management
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

  // Offline queue for API calls
  addToOfflineQueue: (action: any) => {
    const queue = mobileStorage.getOfflineQueue();
    queue.push(action);
    localStorage.setItem(MOBILE_STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  },

  getOfflineQueue: (): any[] => {
    const stored = localStorage.getItem(MOBILE_STORAGE_KEYS.OFFLINE_QUEUE);
    return stored ? JSON.parse(stored) : [];
  },

  clearOfflineQueue: () => {
    localStorage.removeItem(MOBILE_STORAGE_KEYS.OFFLINE_QUEUE);
  },

  // Check if user is logged in
  isLoggedIn: (): boolean => {
    const driver = mobileStorage.getCurrentDriver();
    return driver?.isLoggedIn || false;
  },

  // Check if trip is active
  hasActiveTrip: (): boolean => {
    const trip = mobileStorage.getCurrentTrip();
    return trip?.isActive || false;
  },
};