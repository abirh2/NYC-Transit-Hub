import type { TransitDirection, TransitMode } from "@/types/transit";

export interface RealtimeSelection {
  mode: TransitMode;
  routeId?: string;
  stationId?: string;
  stopId?: string;
  direction?: TransitDirection;
  tripId?: string;
}

/** Creates URL-safe state without interpreting or rewriting source trip IDs. */
export function createRealtimeSearchParams(
  selection: RealtimeSelection,
): URLSearchParams {
  const params = new URLSearchParams({ mode: selection.mode });
  if (selection.routeId) params.set("route", selection.routeId);
  if (selection.stationId) params.set("station", selection.stationId);
  if (selection.stopId) params.set("stop", selection.stopId);
  if (selection.direction) params.set("direction", selection.direction);
  if (selection.tripId) params.set("trip", selection.tripId);
  return params;
}
