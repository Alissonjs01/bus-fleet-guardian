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

const DRIVER_STATUS_ALIASES: Record<string, DriverStatus> = {
  active: DRIVER_STATUSES.ACTIVE,
  ativo: DRIVER_STATUSES.ACTIVE,
  inactive: DRIVER_STATUSES.INACTIVE,
  inativo: DRIVER_STATUSES.INACTIVE,
  blocked: DRIVER_STATUSES.BLOCKED,
  bloqueado: DRIVER_STATUSES.BLOCKED,
  on_route: DRIVER_STATUSES.ON_ROUTE,
  onroute: DRIVER_STATUSES.ON_ROUTE,
  "em rota": DRIVER_STATUSES.ON_ROUTE,
  em_rota: DRIVER_STATUSES.ON_ROUTE,
};

export function normalizeDriverStatus(value: unknown): DriverStatus {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (DRIVER_STATUS_ALIASES[normalizedValue]) return DRIVER_STATUS_ALIASES[normalizedValue];
  return DRIVER_STATUSES.ACTIVE;
}
