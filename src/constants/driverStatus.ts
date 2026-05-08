export const DRIVER_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  BLOCKED: "blocked",
  ON_ROUTE: "on_route",
} as const;

export type DriverStatus = (typeof DRIVER_STATUSES)[keyof typeof DRIVER_STATUSES];

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  blocked: "Bloqueado",
  on_route: "Em rota",
};

export function normalizeDriverStatus(value: unknown): DriverStatus {
  if (Object.values(DRIVER_STATUSES).includes(value as DriverStatus)) return value as DriverStatus;
  return DRIVER_STATUSES.ACTIVE;
}
