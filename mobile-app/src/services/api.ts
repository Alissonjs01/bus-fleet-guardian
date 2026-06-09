import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where, writeBatch } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { getFleetData, normalizeRegistration, saveFleetData } from "@/utils/localStorage";
import { ActiveRouteSession, ProblemReport, APIResponse, TripHistory } from "../types/mobile";
import { DRIVER_STATUSES, type DriverStatus } from "@/constants/driverStatus";
import { getDriverByRegistration } from "@/services/driverService";
import { captureCurrentLocation, type GeoPointFailure, type GeoPointSnapshot } from "@/utils/geolocation";
import { getDeviceId, getUserAgent } from "@/services/deviceService";
import type { VehicleDevice } from "@/types/fleet";

type FleetSnapshot = ReturnType<typeof getFleetData>;
const MOBILE_COMPANY_ID = "demo-company";

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "string") return new Date(value).getTime();
  if (typeof value === "object" && value && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  if (typeof value === "object" && value && "seconds" in value && typeof value.seconds === "number") {
    return value.seconds * 1000;
  }
  return 0;
}

function toIso(value: unknown): string {
  const millis = toMillis(value);
  return Number.isFinite(millis) && millis > 0 ? new Date(millis).toISOString() : new Date().toISOString();
}

type LocationFields = {
  location?: GeoPointSnapshot | null;
  locationError?: GeoPointFailure | null;
};

function locationFields(
  location: GeoPointSnapshot | null,
  error: GeoPointFailure | null,
  locationKey = "location",
  errorKey = "locationError",
) {
  return {
    [locationKey]: location,
    [errorKey]: error,
  };
}

async function resolveLocation(eventLocation?: LocationFields) {
  if (eventLocation) {
    return {
      location: eventLocation.location || null,
      error: eventLocation.locationError || null,
    };
  }

  return captureCurrentLocation();
}

class MobileAPIService {
  async getCurrentVehicleDevice(): Promise<VehicleDevice | null> {
    const deviceId = getDeviceId();
    const snapshot = await getDoc(doc(db, "vehicleDevices", deviceId));
    if (!snapshot.exists()) return null;

    const data = snapshot.data();
    const device: VehicleDevice = {
      id: snapshot.id,
      deviceId: String(data.deviceId || snapshot.id),
      deviceName: data.deviceName || "",
      vehicleId: Number(data.vehicleId || 0),
      vehicleLabel: String(data.vehicleLabel || ""),
      companyId: String(data.companyId || MOBILE_COMPANY_ID),
      status: data.status === "inactive" || data.status === "blocked" ? data.status : "active",
      createdAt: data.createdAt?.toDate?.().toISOString?.() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.().toISOString?.(),
      lastSeenAt: data.lastSeenAt?.toDate?.().toISOString?.(),
      userAgent: data.userAgent || "",
      deviceInfo: data.deviceInfo || "",
      lastLocation: data.lastLocation || null,
      lastLocationError: data.lastLocationError || null,
    };

    await this.touchVehicleDevice(device).catch(() => undefined);
    return device;
  }

  private async touchVehicleDevice(device: VehicleDevice | null, location?: GeoPointSnapshot | null, locationError?: GeoPointFailure | null) {
    if (!device) return;
    await setDoc(
      doc(db, "vehicleDevices", device.deviceId),
      {
        deviceId: device.deviceId,
        deviceName: device.deviceName || "",
        vehicleId: device.vehicleId,
        vehicleLabel: device.vehicleLabel,
        companyId: device.companyId || MOBILE_COMPANY_ID,
        status: device.status,
        userAgent: getUserAgent(),
        deviceInfo: getUserAgent(),
        lastSeenAt: serverTimestamp(),
        lastLocation: location || device.lastLocation || null,
        lastLocationError: locationError || null,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  private findDriver(data: FleetSnapshot, driverNumber: string) {
    const normalizedDriverNumber = normalizeRegistration(driverNumber);
    return data.drivers.find((item) =>
      item.numeroRegistro === normalizedDriverNumber ||
      item.registrationNumber === normalizedDriverNumber ||
      item.id.toString() === normalizedDriverNumber ||
      item.firestoreId === normalizedDriverNumber
    );
  }

  private async getVehicleByNumber(vehicleNumber: string) {
    const normalizedVehicleNumber = normalizeRegistration(vehicleNumber);
    const byRegistration = await getDocs(query(
      collection(db, "vehicles"),
      where("companyId", "==", MOBILE_COMPANY_ID),
      where("numeroRegistro", "==", normalizedVehicleNumber),
    ));

    const byPlate = byRegistration.empty
      ? await getDocs(query(
        collection(db, "vehicles"),
        where("companyId", "==", MOBILE_COMPANY_ID),
        where("plate", "==", normalizedVehicleNumber),
      ))
      : byRegistration;

    const snapshot = byPlate.empty && Number.isFinite(Number(normalizedVehicleNumber))
      ? await getDocs(query(
        collection(db, "vehicles"),
        where("companyId", "==", MOBILE_COMPANY_ID),
        where("legacyId", "==", Number(normalizedVehicleNumber)),
      ))
      : byPlate;

    const vehicleDoc = snapshot.docs[0];
    if (!vehicleDoc) return null;

    const vehicle = vehicleDoc.data();
    return {
      id: vehicleDoc.id,
      legacyId: Number(vehicle.legacyId || vehicle.id || 0),
      status: String(vehicle.status || "garagem"),
      releasedToDriverId: vehicle.releasedToDriverId === undefined || vehicle.releasedToDriverId === null ? null : Number(vehicle.releasedToDriverId),
      releasedToDriverNumber: vehicle.releasedToDriverNumber ? String(vehicle.releasedToDriverNumber) : null,
      releasedFromStatus: vehicle.releasedFromStatus ? String(vehicle.releasedFromStatus) : null,
      currentKm: vehicle.currentKm === undefined || vehicle.currentKm === null ? undefined : Number(vehicle.currentKm),
      data: vehicle,
    };
  }

  private async getVehicleByLegacyId(vehicleId: number) {
    const snapshot = await getDocs(query(
      collection(db, "vehicles"),
      where("companyId", "==", MOBILE_COMPANY_ID),
      where("legacyId", "==", vehicleId),
    ));

    const vehicleDoc = snapshot.docs[0];
    if (!vehicleDoc) return null;

    const vehicle = vehicleDoc.data();
    return {
      id: vehicleDoc.id,
      number: String(vehicle.numeroRegistro || vehicle.plate || vehicleId),
      data: vehicle,
    };
  }

  private async getActiveRouteForDriver(driverId: number, driverNumber: string): Promise<ActiveRouteSession | null> {
    const activeRoutes = await getDocs(query(
      collection(db, "routes"),
      where("companyId", "==", MOBILE_COMPANY_ID),
      where("driverId", "==", driverId),
      where("status", "==", "active"),
    ));

    const routeDoc = activeRoutes.docs
      .map((item) => ({ id: item.id, data: item.data() }))
      .sort((a, b) => toMillis(b.data.startedAt || b.data.createdAt) - toMillis(a.data.startedAt || a.data.createdAt))[0];

    if (!routeDoc) return null;

    const route = routeDoc.data;
    const vehicleId = Number(route.vehicleId || 0);
    const vehicle = await this.getVehicleByLegacyId(vehicleId);
    const driverTrips = await getDocs(query(
      collection(db, "trips"),
      where("companyId", "==", MOBILE_COMPANY_ID),
      where("driverId", "==", driverId),
      where("vehicleId", "==", vehicleId),
    ));
    const activeTrip = driverTrips.docs.find((item) => {
      const trip = item.data();
      return !trip.retorno && !trip.endTime;
    });

    return {
      routeId: routeDoc.id,
      tripId: activeTrip?.id,
      vehicleNumber: vehicle?.number || String(vehicleId),
      driverNumber,
      startTime: toIso(route.startedAt || route.createdAt),
      startLocation: route.startLocation || null,
      startLocationError: route.startLocationError || null,
      startKm: route.startKm === undefined || route.startKm === null ? undefined : Number(route.startKm),
    };
  }

  async login(numeroRegistro: string): Promise<APIResponse<{ driverId: number; nome: string; firestoreId?: string; companyId?: string; status?: DriverStatus; activeRoute?: ActiveRouteSession }>> {
    const driver = await getDriverByRegistration(numeroRegistro);

    if (!driver) return { success: false, message: "Registro de motorista não encontrado." };
    if (driver.status === DRIVER_STATUSES.BLOCKED) {
      return { success: false, message: "Seu acesso de motorista está bloqueado. Procure o gestor da frota." };
    }
    if (driver.status === DRIVER_STATUSES.INACTIVE) {
      return { success: false, message: "Seu registro ainda não foi liberado pelo gestor." };
    }
    const activeRoute = await this.getActiveRouteForDriver(driver.id, driver.registrationNumber || numeroRegistro);
    if (activeRoute) {
      return {
        success: true,
        message: "Encontramos uma rota em andamento.",
        data: {
          nome: driver.name,
          driverId: driver.id,
          firestoreId: driver.firestoreId,
          companyId: driver.companyId,
          status: driver.status,
          activeRoute,
        },
      };
    }

    if (driver.status === DRIVER_STATUSES.ON_ROUTE) {
      return { success: false, message: "Motorista ja possui rota ativa, mas nao encontramos a rota para retomar. Procure o gestor da frota." };
    }

    return {
      success: true,
      data: {
        nome: driver.name,
        driverId: driver.id,
        firestoreId: driver.firestoreId,
        companyId: driver.companyId,
        status: driver.status,
      },
    };
  }

  async registrarSaida(vehicleNumber: string, driverNumber: string, eventLocation?: LocationFields, startKm?: number): Promise<APIResponse<{
    routeId: string;
    tripId: string;
    startLocation: GeoPointSnapshot | null;
    startLocationError: GeoPointFailure | null;
    startKm?: number;
  }>> {
    const vehicleDevice = await this.getCurrentVehicleDevice();
    const driver = await getDriverByRegistration(driverNumber, MOBILE_COMPANY_ID);
    const vehicle = await this.getVehicleByNumber(vehicleNumber);

    if (!vehicle) {
      return { success: false, message: "Veiculo nao encontrado" };
    }

    if (!driver) {
      return { success: false, message: "Seu cadastro de motorista ainda nao foi liberado pelo gestor." };
    }

    if (vehicleDevice?.status === "blocked") {
      return { success: false, message: "Dispositivo do veiculo bloqueado. Procure o gestor." };
    }

    if (vehicleDevice?.status === "inactive") {
      return { success: false, message: "Dispositivo do veiculo inativo. Procure o gestor." };
    }

    if (vehicleDevice?.status === "active" && vehicleDevice.vehicleId !== vehicle.legacyId) {
      return { success: false, message: `Este dispositivo esta vinculado ao veiculo ${vehicleDevice.vehicleLabel || vehicleDevice.vehicleId}.` };
    }

    if (driver.status === DRIVER_STATUSES.BLOCKED) {
      return { success: false, message: "Seu acesso de motorista esta bloqueado. Procure o gestor da frota." };
    }

    if (driver.status === DRIVER_STATUSES.INACTIVE) {
      return { success: false, message: "Motorista inativo. Procure o gestor da frota." };
    }

    if (driver.status === DRIVER_STATUSES.ON_ROUTE) {
      return { success: false, message: "Motorista ja possui rota ativa." };
    }

    const vehicleReleasedToThisDriver = vehicle.status === "liberado" && (
      vehicle.releasedToDriverId === driver.id ||
      normalizeRegistration(vehicle.releasedToDriverNumber || "") === normalizeRegistration(driver.registrationNumber || driverNumber)
    );

    const vehicleAvailableForStreetHandoff = vehicle.status === "fora_garagem";

    if (vehicle.status === "garagem") {
      return { success: false, message: "Veiculo na garagem precisa ser liberado pelo lider antes de iniciar operacao." };
    }

    if (vehicle.status === "liberado" && !vehicleReleasedToThisDriver) {
      return { success: false, message: "Veiculo liberado para outro motorista." };
    }

    if (!vehicleAvailableForStreetHandoff && !vehicleReleasedToThisDriver) {
      return { success: false, message: "Veiculo indisponivel para iniciar rota." };
    }

    const normalizedStartKm = startKm === undefined ? undefined : Number(startKm);
    if (normalizedStartKm === undefined || !Number.isFinite(normalizedStartKm) || normalizedStartKm < 0) {
      return { success: false, message: "Informe a quilometragem atual do veiculo." };
    }

    if (vehicle.currentKm !== undefined && normalizedStartKm < vehicle.currentKm) {
      return { success: false, message: "Quilometragem menor que o ultimo registro do veiculo." };
    }

    const now = new Date().toISOString();
    const capturedLocation = await resolveLocation(eventLocation);
    const { location, error: locationError } = capturedLocation;
    const batch = writeBatch(db);
    const vehicleId = vehicle.legacyId;

    batch.update(doc(db, "vehicles", vehicle.id), {
      status: "operacao",
      currentKm: normalizedStartKm,
      releasedToDriverId: null,
      releasedToDriverNumber: null,
      releasedToDriverName: null,
      releasedAt: null,
      releasedBy: null,
      releaseNotes: null,
      releasedFromStatus: null,
      updatedAt: serverTimestamp(),
    });

    if (vehicleDevice?.status === "active") {
      batch.set(doc(db, "vehicleDevices", vehicleDevice.deviceId), {
        lastSeenAt: serverTimestamp(),
        lastLocation: location || null,
        lastLocationError: locationError || null,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    if (driver.firestoreId) {
      batch.update(doc(db, "drivers", driver.firestoreId), {
        status: DRIVER_STATUSES.ON_ROUTE,
        updatedAt: serverTimestamp(),
      });
    }

    const routeRef = doc(collection(db, "routes"));
    batch.set(routeRef, {
      companyId: MOBILE_COMPANY_ID,
      legacyId: Date.now(),
      vehicleId,
      driverId: driver.id,
      driverUserId: driver.userId || null,
      status: "active",
      startedAt: now,
      startKm: normalizedStartKm,
      ...locationFields(location, locationError, "startLocation", "startLocationError"),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const tripRef = doc(collection(db, "trips"));
    batch.set(tripRef, {
      companyId: MOBILE_COMPANY_ID,
      legacyId: Date.now() + 1,
      vehicleId,
      driverId: driver.id,
      saida: now,
      startTime: now,
      startKm: normalizedStartKm,
      retorno: null,
      endTime: null,
      ...locationFields(location, locationError, "startLocation", "startLocationError"),
      problemas: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    return {
      success: true,
      message: "Operacao iniciada com sucesso",
      data: {
        routeId: routeRef.id,
        tripId: tripRef.id,
        startLocation: location,
        startLocationError: locationError,
        startKm: normalizedStartKm,
      },
    };
  }

  async registrarRetorno(vehicleNumber: string, driverNumber: string, problems: ProblemReport[], eventLocation?: LocationFields, endKm?: number, returnedToGarage = true): Promise<APIResponse> {
    const vehicleDevice = await this.getCurrentVehicleDevice();
    const vehicle = await this.getVehicleByNumber(vehicleNumber);
    const driver = await getDriverByRegistration(driverNumber, MOBILE_COMPANY_ID);

    if (!vehicle) {
      return { success: false, message: "Veiculo nao encontrado" };
    }

    if (!driver) {
      return { success: false, message: "Motorista nao encontrado" };
    }

    if (vehicleDevice?.status === "active" && vehicleDevice.vehicleId !== vehicle.legacyId) {
      return { success: false, message: `Este dispositivo esta vinculado ao veiculo ${vehicleDevice.vehicleLabel || vehicleDevice.vehicleId}.` };
    }

    const now = new Date().toISOString();
    const capturedLocation = await resolveLocation(eventLocation);
    const { location, error: locationError } = capturedLocation;
    const batch = writeBatch(db);
    const vehicleId = vehicle.legacyId;
    const normalizedEndKm = endKm === undefined ? undefined : Number(endKm);

    if (normalizedEndKm === undefined || !Number.isFinite(normalizedEndKm) || normalizedEndKm < 0) {
      return { success: false, message: "Informe a quilometragem final do veiculo." };
    }

    const activeRoutes = await getDocs(query(
      collection(db, "routes"),
      where("companyId", "==", MOBILE_COMPANY_ID),
      where("vehicleId", "==", vehicleId),
      where("driverId", "==", driver.id),
      where("status", "==", "active"),
    ));

    activeRoutes.docs.forEach((routeDoc) => {
      const routeStartKm = Number(routeDoc.data().startKm ?? vehicle.currentKm ?? 0);
      if (Number.isFinite(routeStartKm) && normalizedEndKm < routeStartKm) {
        throw new Error("Quilometragem final menor que a quilometragem inicial.");
      }

      batch.update(doc(db, "routes", routeDoc.id), {
        status: "finished",
        finishedAt: now,
        endKm: normalizedEndKm,
        distanceKm: Math.max(0, normalizedEndKm - routeStartKm),
        ...locationFields(location, locationError, "endLocation", "endLocationError"),
        updatedAt: serverTimestamp(),
      });
    });

    const driverTrips = await getDocs(query(
      collection(db, "trips"),
      where("companyId", "==", MOBILE_COMPANY_ID),
      where("vehicleId", "==", vehicleId),
      where("driverId", "==", driver.id),
    ));

    driverTrips.docs
      .filter((tripDoc) => !tripDoc.data().retorno && !tripDoc.data().endTime)
      .forEach((tripDoc) => {
        const tripStartKm = Number(tripDoc.data().startKm ?? vehicle.currentKm ?? 0);
        batch.update(doc(db, "trips", tripDoc.id), {
          retorno: now,
          endTime: now,
          endKm: normalizedEndKm,
          distanceKm: Math.max(0, normalizedEndKm - tripStartKm),
          ...locationFields(location, locationError, "endLocation", "endLocationError"),
          updatedAt: serverTimestamp(),
        });
      });

    batch.update(doc(db, "vehicles", vehicle.id), {
      status: returnedToGarage ? "garagem" : "fora_garagem",
      currentKm: normalizedEndKm,
      releasedToDriverId: null,
      releasedToDriverNumber: null,
      releasedToDriverName: null,
      releasedAt: null,
      releasedBy: null,
      releaseNotes: null,
      releasedFromStatus: null,
      updatedAt: serverTimestamp(),
    });

    if (vehicleDevice?.status === "active") {
      batch.set(doc(db, "vehicleDevices", vehicleDevice.deviceId), {
        lastSeenAt: serverTimestamp(),
        lastLocation: location || null,
        lastLocationError: locationError || null,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    if (driver.firestoreId) {
      batch.update(doc(db, "drivers", driver.firestoreId), {
        status: DRIVER_STATUSES.ACTIVE,
        updatedAt: serverTimestamp(),
      });
    }

    problems.forEach((problem, index) => {
      const problemRef = doc(collection(db, "issues"));
      batch.set(problemRef, {
        companyId: MOBILE_COMPANY_ID,
        legacyId: Date.now() + index,
        vehicleId,
        driverId: driver.id,
        categoria: problem.categoria,
        gravidade: problem.gravidade,
        observacao: problem.observacao,
        title: problem.observacao.slice(0, 80),
        description: problem.observacao,
        priority: problem.gravidade,
        status: "aberta",
        location: problem.location || null,
        locationError: problem.locationError || null,
        createdAt: problem.reportedAt || now,
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
    return { success: true, message: "Operacao encerrada com sucesso" };
  }

  async reportarProblema(problem: Omit<ProblemReport, "id" | "reportedAt"> & Partial<LocationFields>): Promise<APIResponse> {
    const vehicleDevice = await this.getCurrentVehicleDevice();
    const vehicle = await this.getVehicleByNumber(problem.vehicleNumber);
    const driver = await getDriverByRegistration(problem.driverNumber, MOBILE_COMPANY_ID);

    if (!vehicle) {
      return { success: false, message: "Veiculo nao encontrado" };
    }

    if (!driver) {
      return { success: false, message: "Motorista nao encontrado" };
    }

    if (vehicleDevice?.status === "active" && vehicleDevice.vehicleId !== vehicle.legacyId) {
      return { success: false, message: `Este dispositivo esta vinculado ao veiculo ${vehicleDevice.vehicleLabel || vehicleDevice.vehicleId}.` };
    }

    const now = new Date().toISOString();
    const capturedLocation = problem.location !== undefined || problem.locationError !== undefined
      ? { location: problem.location || null, error: problem.locationError || null }
      : await captureCurrentLocation();
    const { location, error: locationError } = capturedLocation;
    const activeRoutes = await getDocs(query(
      collection(db, "routes"),
      where("companyId", "==", MOBILE_COMPANY_ID),
      where("vehicleId", "==", vehicle.legacyId),
      where("driverId", "==", driver.id),
      where("status", "==", "active"),
    ));
    const activeRoute = activeRoutes.docs[0];
    const batch = writeBatch(db);
    batch.set(doc(collection(db, "issues")), {
      companyId: MOBILE_COMPANY_ID,
      legacyId: Date.now(),
      vehicleId: vehicle.legacyId,
      driverId: driver.id,
      routeId: Number(activeRoute?.data().legacyId || 0) || null,
      routeFirestoreId: activeRoute?.id || null,
      categoria: problem.categoria,
      gravidade: problem.gravidade,
      observacao: problem.observacao,
      title: problem.observacao.slice(0, 80),
      description: problem.observacao,
      priority: problem.gravidade,
      status: "aberta",
      location,
      locationError,
      createdAt: now,
      updatedAt: serverTimestamp(),
    });
    if (vehicleDevice?.status === "active") {
      batch.set(doc(db, "vehicleDevices", vehicleDevice.deviceId), {
        lastSeenAt: serverTimestamp(),
        lastLocation: location || null,
        lastLocationError: locationError || null,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
    await batch.commit();

    return { success: true, message: "Relatorio registrado com sucesso" };
  }

  async getHistorico(numeroRegistro: string): Promise<APIResponse<TripHistory[]>> {
    const data = getFleetData();
    const normalizedDriverNumber = normalizeRegistration(numeroRegistro);
    const driver = data.drivers.find((item) =>
      item.numeroRegistro === normalizedDriverNumber ||
      item.id.toString() === normalizedDriverNumber ||
      item.firestoreId === normalizedDriverNumber
    );

    if (!driver) return { success: true, data: [] };

    const history = data.trips
      .filter((trip) => trip.driverId === driver.id)
      .map((trip) => {
        const vehicle = data.vehicles.find((item) => item.id === trip.vehicleId);
        const problems = data.problems.filter((problem) =>
          problem.driverId === driver.id &&
          problem.vehicleId === trip.vehicleId
        );

        return {
          id: String(trip.id),
          vehicleNumber: vehicle?.numeroRegistro || "",
          startTime: trip.saida,
          endTime: trip.retorno,
          problems: problems.map((problem) => ({
            id: String(problem.id),
            vehicleNumber: vehicle?.numeroRegistro || "",
            driverNumber: driver.numeroRegistro,
            categoria: problem.categoria,
            gravidade: problem.gravidade,
            observacao: problem.observacao,
            reportedAt: problem.createdAt,
          })),
        };
      });

    return { success: true, data: history };
  }

  async syncData(): Promise<APIResponse> {
    saveFleetData(getFleetData());
    return { success: true, message: "Sincronizacao solicitada" };
  }
}

export const mobileAPI = new MobileAPIService();
