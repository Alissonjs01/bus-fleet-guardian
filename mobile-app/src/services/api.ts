import { collection, doc, getDocs, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { getFleetData, normalizeRegistration, saveFleetData } from "@/utils/localStorage";
import { ProblemReport, APIResponse, TripHistory } from "../types/mobile";
import { DRIVER_STATUSES, type DriverStatus } from "@/constants/driverStatus";
import { getDriverByRegistration } from "@/services/driverService";

type FleetSnapshot = ReturnType<typeof getFleetData>;
const MOBILE_COMPANY_ID = "demo-company";

class MobileAPIService {
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

    const snapshot = byRegistration.empty
      ? await getDocs(query(
        collection(db, "vehicles"),
        where("companyId", "==", MOBILE_COMPANY_ID),
        where("plate", "==", normalizedVehicleNumber),
      ))
      : byRegistration;

    const vehicleDoc = snapshot.docs[0];
    if (!vehicleDoc) return null;

    const vehicle = vehicleDoc.data();
    return {
      id: vehicleDoc.id,
      legacyId: Number(vehicle.legacyId || vehicle.id || 0),
      status: String(vehicle.status || "garagem"),
      data: vehicle,
    };
  }

  async login(numeroRegistro: string): Promise<APIResponse<{ nome: string; firestoreId?: string; companyId?: string; status?: DriverStatus }>> {
    const driver = await getDriverByRegistration(numeroRegistro);

    if (!driver) return { success: false, message: "Registro de motorista não encontrado." };
    if (driver.status === DRIVER_STATUSES.BLOCKED) {
      return { success: false, message: "Seu acesso de motorista está bloqueado. Procure o gestor da frota." };
    }
    if (driver.status === DRIVER_STATUSES.INACTIVE) {
      return { success: false, message: "Seu registro ainda não foi liberado pelo gestor." };
    }
    if (driver.status === DRIVER_STATUSES.ON_ROUTE) {
      return { success: false, message: "Motorista já possui rota ativa." };
    }

    return {
      success: true,
      data: {
        nome: driver.name,
        firestoreId: driver.firestoreId,
        companyId: driver.companyId,
        status: driver.status,
      },
    };
  }

  async registrarSaida(vehicleNumber: string, driverNumber: string): Promise<APIResponse> {
    const driver = await getDriverByRegistration(driverNumber, MOBILE_COMPANY_ID);
    const vehicle = await this.getVehicleByNumber(vehicleNumber);

    if (!vehicle) {
      return { success: false, message: "Veiculo nao encontrado" };
    }

    if (!driver) {
      return { success: false, message: "Seu cadastro de motorista ainda nao foi liberado pelo gestor." };
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

    if (vehicle.status !== "garagem") {
      return { success: false, message: "Veiculo indisponivel para iniciar rota." };
    }

    const now = new Date().toISOString();
    const batch = writeBatch(db);
    const vehicleId = vehicle.legacyId;

    batch.update(doc(db, "vehicles", vehicle.id), {
      status: "operacao",
      updatedAt: serverTimestamp(),
    });

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
      retorno: null,
      endTime: null,
      problemas: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    return { success: true, message: "Saida registrada com sucesso" };
  }

  async registrarRetorno(vehicleNumber: string, driverNumber: string, problems: ProblemReport[]): Promise<APIResponse> {
    const vehicle = await this.getVehicleByNumber(vehicleNumber);
    const driver = await getDriverByRegistration(driverNumber, MOBILE_COMPANY_ID);

    if (!vehicle) {
      return { success: false, message: "Veiculo nao encontrado" };
    }

    if (!driver) {
      return { success: false, message: "Motorista nao encontrado" };
    }

    const now = new Date().toISOString();
    const batch = writeBatch(db);
    const vehicleId = vehicle.legacyId;

    const activeRoutes = await getDocs(query(
      collection(db, "routes"),
      where("companyId", "==", MOBILE_COMPANY_ID),
      where("vehicleId", "==", vehicleId),
      where("driverId", "==", driver.id),
      where("status", "==", "active"),
    ));

    activeRoutes.docs.forEach((routeDoc) => {
      batch.update(doc(db, "routes", routeDoc.id), {
        status: "finished",
        finishedAt: now,
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
        batch.update(doc(db, "trips", tripDoc.id), {
          retorno: now,
          endTime: now,
          updatedAt: serverTimestamp(),
        });
      });

    batch.update(doc(db, "vehicles", vehicle.id), {
      status: problems.length > 0 ? "manutencao" : "garagem",
      updatedAt: serverTimestamp(),
    });

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
        status: "aberto",
        createdAt: problem.reportedAt || now,
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
    return { success: true, message: "Retorno registrado com sucesso" };
  }

  async reportarProblema(problem: Omit<ProblemReport, "id" | "reportedAt">): Promise<APIResponse> {
    const vehicle = await this.getVehicleByNumber(problem.vehicleNumber);
    const driver = await getDriverByRegistration(problem.driverNumber, MOBILE_COMPANY_ID);

    if (!vehicle) {
      return { success: false, message: "Veiculo nao encontrado" };
    }

    if (!driver) {
      return { success: false, message: "Motorista nao encontrado" };
    }

    const now = new Date().toISOString();
    const batch = writeBatch(db);
    batch.update(doc(db, "vehicles", vehicle.id), {
      status: "manutencao",
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(collection(db, "issues")), {
      companyId: MOBILE_COMPANY_ID,
      legacyId: Date.now(),
      vehicleId: vehicle.legacyId,
      driverId: driver.id,
      categoria: problem.categoria,
      gravidade: problem.gravidade,
      observacao: problem.observacao,
      title: problem.observacao.slice(0, 80),
      description: problem.observacao,
      priority: problem.gravidade,
      status: "aberto",
      createdAt: now,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();

    return { success: true, message: "Problema reportado com sucesso" };
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
