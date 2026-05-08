import { getFleetData, saveFleetData } from "@/utils/localStorage";
import { ProblemReport, APIResponse, TripHistory } from "../types/mobile";

class MobileAPIService {
  async login(numeroRegistro: string): Promise<APIResponse<{ nome: string }>> {
    const data = getFleetData();
    const driver = data.drivers.find((item) => item.numeroRegistro === numeroRegistro);
    if (!driver) return { success: false, message: "Motorista não encontrado" };
    return { success: true, data: { nome: driver.nome } };
  }

  async registrarSaida(vehicleNumber: string, driverNumber: string): Promise<APIResponse> {
    const data = getFleetData();
    const vehicle = data.vehicles.find((item) => item.numeroRegistro === vehicleNumber);
    const driver = data.drivers.find((item) => item.numeroRegistro === driverNumber || item.id.toString() === driverNumber);

    if (!vehicle || !driver) {
      return { success: false, message: "Veículo ou motorista não encontrado" };
    }

    data.trips.push({
      id: Math.max(0, ...data.trips.map((trip) => trip.id)) + 1,
      vehicleId: vehicle.id,
      driverId: driver.id,
      saida: new Date().toISOString(),
      problemas: [],
      createdAt: new Date().toISOString(),
    });
    saveFleetData(data);

    return { success: true, message: "Saída registrada com sucesso" };
  }

  async registrarRetorno(vehicleNumber: string, driverNumber: string, problems: ProblemReport[]): Promise<APIResponse> {
    const data = getFleetData();
    const vehicle = data.vehicles.find((item) => item.numeroRegistro === vehicleNumber);
    const driver = data.drivers.find((item) => item.numeroRegistro === driverNumber || item.id.toString() === driverNumber);

    if (!vehicle || !driver) {
      return { success: false, message: "Veículo ou motorista não encontrado" };
    }

    const activeTrip = [...data.trips].reverse().find((trip) => trip.vehicleId === vehicle.id && trip.driverId === driver.id && !trip.retorno);
    if (activeTrip) {
      activeTrip.retorno = new Date().toISOString();
    }

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
    const vehicle = data.vehicles.find((item) => item.numeroRegistro === problem.vehicleNumber);
    const driver = data.drivers.find((item) => item.numeroRegistro === problem.driverNumber || item.id.toString() === problem.driverNumber);

    if (!vehicle || !driver) {
      return { success: false, message: "Veículo ou motorista não encontrado" };
    }

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
    const driver = data.drivers.find((item) => item.numeroRegistro === numeroRegistro || item.id.toString() === numeroRegistro);
    if (!driver) return { success: true, data: [] };

    const history = data.trips
      .filter((trip) => trip.driverId === driver.id)
      .map((trip) => {
        const vehicle = data.vehicles.find((item) => item.id === trip.vehicleId);
        const problems = data.problems.filter((problem) => problem.driverId === driver.id && problem.vehicleId === trip.vehicleId);
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
    return { success: true, message: "Sincronização solicitada" };
  }
}

export const mobileAPI = new MobileAPIService();
