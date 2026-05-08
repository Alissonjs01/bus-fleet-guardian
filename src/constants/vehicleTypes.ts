export const VEHICLE_TYPES = {
  VAN: "van",
  MICRO_ONIBUS: "micro_onibus",
  CONVENCIONAL: "convencional",
  ELETRICO: "eletrico",
} as const;

export type VehicleType = (typeof VEHICLE_TYPES)[keyof typeof VEHICLE_TYPES];

export const VEHICLE_TYPE_OPTIONS: Array<{
  value: VehicleType;
  label: string;
  pluralLabel: string;
  icon: string;
}> = [
  { value: VEHICLE_TYPES.VAN, label: "Van", pluralLabel: "Vans", icon: "🚐" },
  { value: VEHICLE_TYPES.MICRO_ONIBUS, label: "Micro-ônibus", pluralLabel: "Micro-ônibus", icon: "🚐" },
  { value: VEHICLE_TYPES.CONVENCIONAL, label: "Convencional", pluralLabel: "Convencionais", icon: "🚌" },
  { value: VEHICLE_TYPES.ELETRICO, label: "Elétrico", pluralLabel: "Elétricos", icon: "⚡" },
];

export function normalizeVehicleType(value: unknown): VehicleType {
  if (value === "articulado") return VEHICLE_TYPES.ELETRICO;
  if (value === "onibus") return VEHICLE_TYPES.CONVENCIONAL;
  if (Object.values(VEHICLE_TYPES).includes(value as VehicleType)) return value as VehicleType;
  return VEHICLE_TYPES.CONVENCIONAL;
}

export function getVehicleTypeLabel(value: unknown) {
  const normalized = normalizeVehicleType(value);
  return VEHICLE_TYPE_OPTIONS.find((item) => item.value === normalized)?.label || "Convencional";
}

export function getVehicleTypePluralLabel(value: unknown) {
  const normalized = normalizeVehicleType(value);
  return VEHICLE_TYPE_OPTIONS.find((item) => item.value === normalized)?.pluralLabel || "Convencionais";
}

export function getVehicleTypeIcon(value: unknown) {
  const normalized = normalizeVehicleType(value);
  return VEHICLE_TYPE_OPTIONS.find((item) => item.value === normalized)?.icon || "🚌";
}
