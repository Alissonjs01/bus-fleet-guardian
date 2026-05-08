import { getFleetData, normalizeRegistration, saveFleetData } from "@/utils/localStorage";
import { ProblemReport, APIResponse, TripHistory } from "../types/mobile";

type FleetSnapshot = ReturnType<typeof getFleetData>;

class MobileAPIService {
  private findDriver(data: FleetSnapshot, driverNumber: string) {
    const normalizedDriverNumber = normalizeRegistration(driverNumber);
    let driver = data.drivers.find((item) =>
      item.numeroRegistro === normalizedDriverNumber ||
      item.id.toString() === normalizedDriverNumber ||
      item.firestoreId === normalizedDriverNumber
    );

    if (!driver) {
      driver = {
        id: Math.max(0, ...data.drivers.map((item) => item.id)) + 1,
        numeroRegistro: normalizedDriverNumber,
        nome: "Motorista Mobile",
        status: "active",
        createdAt: new Date().toISOString(),
      };
      data.drivers.push(driver);
    }

    return driver;
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

    vehicle.status = "operacao";
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

    const activeTrip = [...data.trips].reverse().find((trip) =>
      trip.vehicleId === vehicle.id &&
      trip.driverId === driver.id &&
      !trip.retorno
    );

    if (activeTrip) {
      activeTrip.retorno = new Date().toISOString();
    }

    vehicle.status = problems.length > 0 ? "manutencao" : "garagem";

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
