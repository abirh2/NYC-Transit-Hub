import type { TransitDirection } from "@/types/transit";

const SUBWAY_DIRECTIONS: Record<string, TransitDirection> = {
  N: "northbound",
  NORTH: "northbound",
  NORTHBOUND: "northbound",
  S: "southbound",
  SOUTH: "southbound",
  SOUTHBOUND: "southbound",
  E: "eastbound",
  EAST: "eastbound",
  EASTBOUND: "eastbound",
  W: "westbound",
  WEST: "westbound",
  WESTBOUND: "westbound",
};

const DEFAULT_DIRECTION_LABELS: Record<TransitDirection, string> = {
  northbound: "Northbound",
  southbound: "Southbound",
  eastbound: "Eastbound",
  westbound: "Westbound",
  inbound: "Inbound",
  outbound: "Outbound",
  unknown: "Direction unavailable",
};

export function normalizeSubwayDirection(
  value: string | number | null | undefined,
): TransitDirection {
  if (value === null || value === undefined) return "unknown";
  return SUBWAY_DIRECTIONS[String(value).trim().toUpperCase()] ?? "unknown";
}

export function normalizeBusDirection(
  value: string | number | null | undefined,
): TransitDirection {
  if (value === null || value === undefined) return "unknown";

  const normalized = String(value).trim().toLowerCase();
  if (normalized === "0" || normalized === "outbound") return "outbound";
  if (normalized === "1" || normalized === "inbound") return "inbound";
  return normalizeSubwayDirection(normalized);
}

export function getDirectionLabel(
  direction: TransitDirection,
  contextualLabel?: string | null,
): string {
  return contextualLabel?.trim() || DEFAULT_DIRECTION_LABELS[direction];
}

export function toLegacySubwayDirection(
  direction: TransitDirection,
): "N" | "S" {
  return direction === "northbound" || direction === "eastbound" ? "N" : "S";
}
