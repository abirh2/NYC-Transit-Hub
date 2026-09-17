import type { TransitDirection, TransitMode } from "@/types/transit";

/** Which visualization the Realtime page is showing. */
export type RealtimeView = "map" | "diagram";

export interface RealtimeSelection {
  mode: TransitMode;
  routeId?: string;
  stationId?: string;
  stopId?: string;
  direction?: TransitDirection;
  tripId?: string;
  view?: RealtimeView;
}

const TRANSIT_MODES: readonly TransitMode[] = [
  "subway",
  "bus",
  "lirr",
  "metro-north",
];

const TRANSIT_DIRECTIONS: readonly TransitDirection[] = [
  "northbound",
  "southbound",
  "eastbound",
  "westbound",
  "inbound",
  "outbound",
  "unknown",
];

export const DEFAULT_REALTIME_MODE: TransitMode = "subway";
export const DEFAULT_REALTIME_VIEW: RealtimeView = "map";

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
  if (selection.view) params.set("view", selection.view);
  return params;
}

/**
 * Minimal read interface shared by `URLSearchParams` and Next's
 * `ReadonlyURLSearchParams`, so callers can pass either without a cast.
 */
interface ReadableSearchParams {
  get(name: string): string | null;
}

/** Trims and discards empty strings so `?route=` behaves like an absent key. */
function readParam(
  params: ReadableSearchParams,
  name: string,
): string | undefined {
  const raw = params.get(name);
  if (raw === null) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Parses Realtime page state out of URL search params.
 *
 * This is the read counterpart to `createRealtimeSearchParams`. Unrecognized
 * `mode`/`direction`/`view` values fall back to defaults rather than throwing,
 * because search params are user-editable and a malformed link should still
 * render a usable page. Route, station, stop, and trip IDs pass through
 * verbatim: they are opaque source identifiers and must not be rewritten.
 */
export function parseRealtimeSearchParams(
  params: ReadableSearchParams,
): RealtimeSelection {
  const mode = readParam(params, "mode");
  const direction = readParam(params, "direction");
  const view = readParam(params, "view");

  return {
    mode: TRANSIT_MODES.includes(mode as TransitMode)
      ? (mode as TransitMode)
      : DEFAULT_REALTIME_MODE,
    routeId: readParam(params, "route"),
    stationId: readParam(params, "station"),
    stopId: readParam(params, "stop"),
    direction: TRANSIT_DIRECTIONS.includes(direction as TransitDirection)
      ? (direction as TransitDirection)
      : undefined,
    tripId: readParam(params, "trip"),
    view: view === "map" || view === "diagram" ? view : DEFAULT_REALTIME_VIEW,
  };
}
