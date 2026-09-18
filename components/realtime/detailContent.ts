/**
 * Contextual detail view model.
 *
 * The Realtime page can select a station, a vehicle, or just a route, and each
 * has to render in two shells (a desktop side panel and a mobile bottom
 * sheet). Rather than branching on selection type inside both shells, the page
 * builds one `TransitDetailContent` here and the shells stay purely
 * presentational.
 *
 * This module is framework-free (no React) so route badges are described
 * declaratively and the builders stay unit-testable.
 */

import type { SemanticState } from "@/components/ui/StatusChip";
import { getDirectionLabel } from "@/lib/transit/direction";
import { getSubwayTripProgressContext } from "@/lib/transit/subway-trip-position";
import type { BusArrival, RailArrival, TrainArrival, TransitMode } from "@/types/mta";
import type { Departure, SubwayTrip } from "@/types/transit";

/** Declarative badge, rendered by the panel with the existing UI primitives. */
export type RouteBadgeDescriptor =
  | { kind: "subway"; line: string }
  | { kind: "bus"; route: string }
  | { kind: "rail"; branchId: string; branchName: string; mode: TransitMode };

export interface DetailRow {
  label: string;
  value: string;
}

export interface DetailArrival {
  id: string;
  badge?: RouteBadgeDescriptor;
  primary: string;
  secondary?: string;
  minutesAway: number | null;
  state: SemanticState;
}

export interface DetailProgressStop {
  id: string;
  name: string;
  time: string | null;
  state: "completed" | "current" | "next" | "upcoming";
}

export interface TransitDetailContent {
  /** What kind of thing is selected, used for the shell's heading semantics. */
  kind: "station" | "vehicle" | "route";
  /** Short category label above the title. */
  eyebrow: string;
  title: string;
  subtitle?: string;
  badge?: RouteBadgeDescriptor;
  /** Routes served by a station, or transfers available there. */
  serves?: RouteBadgeDescriptor[];
  status?: { state: SemanticState; label: string };
  rows: DetailRow[];
  arrivalsTitle?: string;
  arrivals?: DetailArrival[];
  progressTitle?: string;
  progressStops?: DetailProgressStop[];
  /** Shown when the selection is no longer present in the feed. */
  notice?: string;
  footnote?: string;
}

/** Seconds of lateness before we surface a delay, then call it severe. */
const DELAY_SECONDS = 120;
const SEVERE_DELAY_SECONDS = 600;

export function formatMinutesAway(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "Unknown";
  if (minutes <= 0) return "Now";
  if (minutes === 1) return "1 min";
  return `${minutes} min`;
}

/** Maps timing and lateness onto the shared semantic-state vocabulary. */
export function arrivalState(options: {
  minutesAway: number | null | undefined;
  delaySeconds?: number | null;
  isStale?: boolean;
}): SemanticState {
  if (options.isStale) return "stale";

  const delay = options.delaySeconds ?? 0;
  if (delay >= SEVERE_DELAY_SECONDS) return "severe";
  if (delay >= DELAY_SECONDS) return "delay";

  const minutes = options.minutesAway;
  if (minutes === null || minutes === undefined) return "unavailable";
  if (minutes <= 1) return "normal";
  return "advisory";
}

function formatClockTime(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function delayRow(delaySeconds: number): DetailRow[] {
  if (delaySeconds >= DELAY_SECONDS) {
    return [{ label: "Status", value: `${Math.round(delaySeconds / 60)} min late` }];
  }
  if (delaySeconds <= -DELAY_SECONDS) {
    return [
      { label: "Status", value: `${Math.abs(Math.round(delaySeconds / 60))} min early` },
    ];
  }
  return [{ label: "Status", value: "On time" }];
}

// ---------------------------------------------------------------------------
// Station
// ---------------------------------------------------------------------------

export interface StationDetailInput {
  mode: TransitMode;
  stationName: string;
  stationType?: string;
  /** Routes serving the station, for the transfer bullets. */
  serves: RouteBadgeDescriptor[];
  /** Contextual direction filter currently applied, if any. */
  directionLabel?: string;
  arrivals: DetailArrival[];
  isStale: boolean;
}

export function buildStationDetail(
  input: StationDetailInput,
): TransitDetailContent {
  const rows: DetailRow[] = [];

  if (input.stationType) {
    rows.push({
      label: "Type",
      value:
        input.stationType === "terminal"
          ? "Terminal"
          : input.stationType === "hub"
            ? "Transfer hub"
            : input.stationType.charAt(0).toUpperCase() + input.stationType.slice(1),
    });
  }
  if (input.directionLabel) {
    rows.push({ label: "Direction", value: input.directionLabel });
  }

  return {
    kind: "station",
    eyebrow: input.mode === "bus" ? "Stop" : "Station",
    title: input.stationName,
    serves: input.serves.length > 0 ? input.serves : undefined,
    status: input.isStale
      ? { state: "stale", label: "Data may be stale" }
      : undefined,
    rows,
    arrivalsTitle: "Upcoming departures",
    arrivals: input.arrivals,
    footnote:
      input.arrivals.length === 0
        ? "No departures are being reported here right now."
        : undefined,
  };
}

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------

export function buildSubwayVehicleDetail(input: {
  train: TrainArrival;
  nextStopName: string;
  isStale: boolean;
}): TransitDetailContent {
  const { train } = input;
  const clock = formatClockTime(train.arrivalTime);

  const rows: DetailRow[] = [
    { label: "Next stop", value: input.nextStopName },
    { label: "Arriving", value: formatMinutesAway(train.minutesAway) },
  ];
  if (clock) rows.push({ label: "Scheduled for", value: clock });
  rows.push(...delayRow(train.delay));
  if (!train.isAssigned) {
    // The feed models unassigned trips as scheduled-but-not-yet-running.
    rows.push({ label: "Tracking", value: "Scheduled, not yet assigned" });
  }

  return {
    kind: "vehicle",
    eyebrow: `${train.routeId} train`,
    title: train.headsign ?? `${train.routeId} train`,
    subtitle: train.direction === "N" ? "Northbound" : "Southbound",
    badge: { kind: "subway", line: train.routeId },
    status: {
      state: arrivalState({
        minutesAway: train.minutesAway,
        delaySeconds: train.delay,
        isStale: input.isStale,
      }),
      label: input.isStale
        ? "Position may be stale"
        : formatMinutesAway(train.minutesAway),
    },
    rows,
    footnote:
      "Position is estimated from arrival predictions; this feed does not report GPS.",
  };
}

export function buildSubwayTripDetail(input: {
  trip: SubwayTrip;
  selectedDeparture: Departure | null;
  followingDepartures: Departure[];
  stationName: (stopId: string) => string;
  isStale: boolean;
}): TransitDetailContent {
  const { trip } = input;
  const context = getSubwayTripProgressContext(trip);
  const previousName = context.previousStop
    ? input.stationName(context.previousStop.stopId)
    : null;
  const currentName = context.currentStop
    ? input.stationName(context.currentStop.stopId)
    : null;
  const nextName = context.nextStop
    ? input.stationName(context.nextStop.stopId)
    : null;

  const progressLabel = (() => {
    switch (trip.progress.state) {
      case "at-stop":
        return `At ${currentName ?? input.stationName(trip.progress.stopId)}`;
      case "approaching":
        return `Approaching ${nextName ?? input.stationName(trip.progress.nextStopId)}`;
      case "departed-previous-stop":
        return `Departed ${previousName ?? input.stationName(trip.progress.previousStopId)}`;
      case "between-stops":
        return previousName && nextName
          ? `Between ${previousName} and ${nextName}`
          : "Between stations";
      case "not-started":
        return `Scheduled from ${nextName ?? input.stationName(trip.progress.nextStopId)}`;
      case "unknown":
        return "Estimated position unavailable";
    }
  })();

  const completedIds = new Set(
    context.completedStops.map((stop) => stop.stopId),
  );
  const currentId = context.currentStop?.stopId ?? null;
  const nextId = context.nextStop?.stopId ?? null;
  const focusIndex = Math.max(
    0,
    trip.stopTimeUpdates.findIndex(
      (stop) => stop.stopId === (currentId ?? nextId),
    ),
  );
  const startIndex = Math.max(0, focusIndex - 1);
  const progressStops: DetailProgressStop[] = trip.stopTimeUpdates
    .slice(startIndex, startIndex + 6)
    .map((stop) => ({
      id: stop.stopId,
      name: input.stationName(stop.stopId),
      time: formatClockTime(stop.arrivalTime),
      state: completedIds.has(stop.stopId)
        ? "completed"
        : stop.stopId === currentId
          ? "current"
          : stop.stopId === nextId
            ? "next"
            : "upcoming",
    }));

  const rows: DetailRow[] = [
    { label: "Direction", value: getDirectionLabel(trip.direction) },
  ];
  if (nextName) rows.push({ label: "Next stop", value: nextName });
  if (input.selectedDeparture) {
    rows.push({
      label: "Arriving",
      value: formatMinutesAway(input.selectedDeparture.minutesAway),
    });
    rows.push(...delayRow(input.selectedDeparture.delaySeconds));
  }
  if (trip.updatedAt) {
    rows.push({
      label: "Realtime update",
      value: trip.updatedAt.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      }),
    });
  }

  return {
    kind: "vehicle",
    eyebrow: `${trip.route.displayName} train`,
    title: trip.destination ?? `${trip.route.displayName} train`,
    subtitle: getDirectionLabel(trip.direction),
    badge: { kind: "subway", line: trip.route.id },
    status: {
      state: input.isStale
        ? "stale"
        : trip.progress.state === "unknown"
          ? "unavailable"
          : "normal",
      label: input.isStale ? "Position may be stale" : progressLabel,
    },
    rows,
    progressTitle: "Route progress",
    progressStops,
    arrivalsTitle: `Following ${trip.route.displayName} trains`,
    arrivals: input.followingDepartures.map((departure) => ({
      id: departure.tripId,
      badge: { kind: "subway", line: departure.routeId },
      primary: departure.destination ?? `${departure.routeId} train`,
      secondary: getDirectionLabel(departure.direction),
      minutesAway: departure.minutesAway,
      state: arrivalState({
        minutesAway: departure.minutesAway,
        delaySeconds: departure.delaySeconds,
        isStale: input.isStale,
      }),
    })),
    footnote:
      "Subway position is estimated from realtime stop progress and predictions; it is not a GPS location.",
  };
}

export function buildRailVehicleDetail(input: {
  train: RailArrival;
  mode: "lirr" | "metro-north";
  nextStopName: string;
  isStale: boolean;
}): TransitDetailContent {
  const { train, mode } = input;
  const terminal = mode === "lirr" ? "Penn Station" : "Grand Central";
  const clock = formatClockTime(train.arrivalTime);

  const rows: DetailRow[] = [
    { label: "Next stop", value: input.nextStopName },
    { label: "Arriving", value: formatMinutesAway(train.minutesAway) },
  ];
  if (clock) rows.push({ label: "Scheduled for", value: clock });
  rows.push(...delayRow(train.delay));
  if (train.trainId && train.trainId !== "---") {
    rows.push({ label: "Train", value: train.trainId });
  }

  return {
    kind: "vehicle",
    eyebrow: train.trainId ? `Train ${train.trainId}` : "Train",
    title: train.branchName,
    subtitle:
      train.direction === "inbound" ? `Toward ${terminal}` : `Away from ${terminal}`,
    badge: {
      kind: "rail",
      branchId: train.routeId,
      branchName: train.branchName,
      mode,
    },
    status: {
      state: arrivalState({
        minutesAway: train.minutesAway,
        delaySeconds: train.delay,
        isStale: input.isStale,
      }),
      label: input.isStale
        ? "Position may be stale"
        : formatMinutesAway(train.minutesAway),
    },
    rows,
    footnote:
      "Position is estimated from arrival predictions; this feed does not report GPS.",
  };
}

export function buildBusVehicleDetail(input: {
  bus: BusArrival;
  isStale: boolean;
}): TransitDetailContent {
  const { bus } = input;
  const rows: DetailRow[] = [];

  if (bus.nextStopName) rows.push({ label: "Next stop", value: bus.nextStopName });
  rows.push({ label: "Arriving", value: formatMinutesAway(bus.minutesAway) });
  if (bus.distanceFromStop !== null && bus.distanceFromStop !== undefined) {
    rows.push({
      label: "Distance to stop",
      value:
        bus.distanceFromStop >= 1000
          ? `${(bus.distanceFromStop / 1000).toFixed(1)} km`
          : `${Math.round(bus.distanceFromStop)} m`,
    });
  }
  if (bus.progressStatus) {
    // Feed values arrive as tokens like `layover_during`; render as a sentence.
    const progress = bus.progressStatus.toLowerCase().replace(/_/g, " ");
    rows.push({
      label: "Progress",
      value: progress.charAt(0).toUpperCase() + progress.slice(1),
    });
  }
  rows.push({ label: "Vehicle", value: bus.vehicleId });

  return {
    kind: "vehicle",
    eyebrow: `${bus.routeId} bus`,
    title: bus.headsign ?? `${bus.routeId} bus`,
    subtitle: "Reporting a live GPS position",
    badge: { kind: "bus", route: bus.routeId },
    status: {
      state: arrivalState({ minutesAway: bus.minutesAway, isStale: input.isStale }),
      label: input.isStale
        ? "Position may be stale"
        : formatMinutesAway(bus.minutesAway),
    },
    rows,
  };
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export interface RouteDetailInput {
  mode: TransitMode;
  routeId: string;
  routeName: string;
  badge: RouteBadgeDescriptor;
  terminals: string[];
  stationCount: number;
  vehicleCount: number;
  directionLabel?: string;
  isStale: boolean;
  lastUpdated: Date | null;
}

export function buildRouteDetail(input: RouteDetailInput): TransitDetailContent {
  const rows: DetailRow[] = [];

  if (input.terminals.length === 2) {
    rows.push({ label: "Between", value: `${input.terminals[0]} and ${input.terminals[1]}` });
  }
  if (input.stationCount > 0) {
    rows.push({
      label: input.mode === "bus" ? "Stops" : "Stations",
      value: String(input.stationCount),
    });
  }
  rows.push({
    label: input.mode === "bus" ? "Buses tracked" : "Trains tracked",
    value: String(input.vehicleCount),
  });
  if (input.directionLabel) {
    rows.push({ label: "Direction filter", value: input.directionLabel });
  }
  if (input.lastUpdated) {
    rows.push({
      label: "Updated",
      value: input.lastUpdated.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    });
  }

  return {
    kind: "route",
    eyebrow: input.mode === "bus" ? "Bus route" : "Route",
    title: input.routeName,
    badge: input.badge,
    status: input.isStale
      ? { state: "stale", label: "Data may be stale" }
      : input.vehicleCount === 0
        ? { state: "unavailable", label: "No vehicles reporting" }
        : { state: "normal", label: "Live" },
    rows,
    footnote:
      input.mode === "bus"
        ? undefined
        : "Route line connects stations in order and is approximate, not exact track alignment.",
  };
}

/** Content shown when a deep-linked selection is no longer in the feed. */
export function buildMissingSelectionDetail(input: {
  kind: "vehicle" | "station";
  label: string;
}): TransitDetailContent {
  return {
    kind: input.kind,
    eyebrow: input.kind === "vehicle" ? "Vehicle" : "Station",
    title: input.label,
    rows: [],
    notice:
      input.kind === "vehicle"
        ? "This vehicle is no longer reporting. It may have finished its run."
        : "This station is not on the selected route.",
  };
}
