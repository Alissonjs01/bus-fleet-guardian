import { getFleetData, normalizeRegistration, saveFleetData } from "@/utils/localStorage";
import { ProblemReport, APIResponse, TripHistory } from "../types/mobile";
import { DRIVER_STATUSES } from "@/constants/driverStatus";

type FleetSnapshot = ReturnType<typeof getFleetData>;

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

  async login(numeroRegistro: string): Promise<APIResponse<{ nome: string }>> {
    const data = getFleetData();
    const normalizedDriverNumber = normalizeRegistration(numeroRegistro);
    const driver = data.drivers.find((item) =>
      item.numeroRegistro === normalizedDriverNumber ||
      item.id.toString() === normalizedDriverNumber ||
      item.firestoreId === normalizedDriverNumber
    );

    if (!driver) return { success: false, message: "Motorista nao encontrado" };
    return { success: true, data: { nome: driver.nome } };
  }

  async registrarSaida(vehicleNumber: string, driverNumber: string): Promise<APIResponse> {
    const data = getFleetData();
    const normalizedVehicleNumber = normalizeRegistration(vehicleNumber);
    const vehicle = data.vehicles.find((item) => item.numeroRegistro === normalizedVehicleNumber);
    const driver = this.findDriver(data, driverNumber);

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

    vehicle.status = "operacao";
    driver.status = DRIVER_STATUSES.ON_ROUTE;
    data.routes.push({
      id: Math.max(0, ...data.routes.map((route) => route.id)) + 1,
      vehicleId: vehicle.id,
      driverId: driver.id,
      driverUserId: driver.userId,
      status: "active",
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    data.trips.push({
      id: Math.max(0, ...data.trips.map((trip) => trip.id)) + 1,
      vehicleId: vehicle.id,
      driverId: driver.id,
      saida: new Date().toISOString(),
      problemas: [],
      createdAt: new Date().toISOString(),
    });
    saveFleetData(data);

    return { success: true, message: "Saida registrada com sucesso" };
  }

  async registrarRetorno(vehicleNumber: string, driverNumber: string, problems: ProblemReport[]): Promise<APIResponse> {
    const data = getFleetData();
    const normalizedVehicleNumber = normalizeRegistration(vehicleNumber);
    const vehicle = data.vehicles.find((item) => item.numeroRegistro === normalizedVehicleNumber);
    const driver = this.findDriver(data, driverNumber);

    if (!vehicle) {
      return { success: false, message: "Veiculo nao encontrado" };
    }

    if (!driver) {
      return { success: false, message: "Motorista nao encontrado" };
    }

    const activeTrip = [...data.trips].reverse().find((trip) =>
      trip.vehicleId === vehicle.id &&
      trip.driverId === driver.id &&
      !trip.retorno
    );

    if (activeTrip) {
      activeTrip.retorno = new Date().toISOString();
    }

    const activeRoute = [...data.routes].reverse().find((route) =>
      route.vehicleId === vehicle.id &&
      route.driverId === driver.id &&
      route.status === "active"
    );

    if (activeRoute) {
      activeRoute.status = "finished";
      activeRoute.finishedAt = new Date().toISOString();
    }

    vehicle.status = problems.length > 0 ? "manutencao" : "garagem";
    driver.status = DRIVER_STATUSES.ACTIVE;

    problems.forEach((problem) => {
      data.problems.push({
        id: Math.max(0, ...data.problems.map((item) => item.id)) + 1,
        vehicleId: vehicle.id,
        driverId: driver.id,
        categoria: problem.categoria,
        gravidade: problem.gravidade,
        observacao: problem.observacao,
        status: "aberto",
        createdAt: problem.reportedAt,
      });
    });

    saveFleetData(data);
    return { success: true, message: "Retorno registrado com sucesso" };
  }

  async reportarProblema(problem: Omit<ProblemReport, "id" | "reportedAt">): Promise<APIResponse> {
    const data = getFleetData();
    const normalizedVehicleNumber = normalizeRegistration(problem.vehicleNumber);
    const vehicle = data.vehicles.find((item) => item.numeroRegistro === normalizedVehicleNumber);
    const driver = this.findDriver(data, problem.driverNumber);

    if (!vehicle) {
      return { success: false, message: "Veiculo nao encontrado" };
    }

    if (!driver) {
      return { success: false, message: "Motorista nao encontrado" };
    }

    vehicle.status = "manutencao";
    data.problems.push({
      id: Math.max(0, ...data.problems.map((item) => item.id)) + 1,
      vehicleId: vehicle.id,
      driverId: driver.id,
      categoria: problem.categoria,
      gravidade: problem.gravidade,
      observacao: problem.observacao,
      status: "aberto",
      createdAt: new Date().toISOString(),
    });
    saveFleetData(data);

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
