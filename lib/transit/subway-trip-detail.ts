import type { SubwayTrip, TransitStop } from "@/types/transit";

export type SubwayTripLifecycle =
  | "en-route"
  | "at-boarding-stop"
  | "passed-boarding-stop"
  | "unknown";

export interface SubwayTripRiderContext {
  boardingStop: TransitStop | null;
  currentStop: TransitStop | null;
  previousStop: TransitStop | null;
  nextStop: TransitStop | null;
  stopsAway: number | null;
  lifecycle: SubwayTripLifecycle;
}

function orderedStops(trip: SubwayTrip): TransitStop[] {
  return trip.stopTimeUpdates
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((stop) => ({
      id: stop.stopId,
      stationId: stop.stationId,
      name: stop.stopId,
      mode: "subway" as const,
      direction: trip.direction,
      location: null,
      platformCode: null,
      routeIds: [trip.route.id],
    }));
}

function findIndex(stops: TransitStop[], id: string | undefined): number {
  if (!id) return -1;
  return stops.findIndex((stop) => stop.id === id || stop.stationId === id);
}

/** Derives rider context from ordered realtime stop updates, never geography. */
export function getSubwayTripRiderContext(input: {
  trip: SubwayTrip;
  boardingStopId?: string | null;
}): SubwayTripRiderContext {
  const stops = orderedStops(input.trip);
  const progress = input.trip.progress;
  const boardingIndex = findIndex(stops, input.boardingStopId ?? undefined);
  const currentId =
    progress.state === "at-stop"
      ? progress.stopId
      : progress.state === "approaching" ||
          progress.state === "between-stops" ||
          progress.state === "departed-previous-stop"
        ? progress.nextStopId
        : undefined;
  const currentIndex = findIndex(stops, currentId);
  const nextIndex =
    currentIndex >= 0 ? currentIndex + (progress.state === "at-stop" ? 1 : 0) : -1;
  const previousIndex = currentIndex > 0 ? currentIndex - 1 : -1;
  const boardingStop = boardingIndex >= 0 ? stops[boardingIndex] : null;
  const currentStop = currentIndex >= 0 ? stops[currentIndex] : null;
  const previousStop = previousIndex >= 0 ? stops[previousIndex] : null;
  const nextStop = nextIndex >= 0 && nextIndex < stops.length ? stops[nextIndex] : null;

  if (boardingIndex < 0 || currentIndex < 0) {
    return { boardingStop, currentStop, previousStop, nextStop, stopsAway: null, lifecycle: "unknown" };
  }
  if (boardingIndex < currentIndex) {
    return { boardingStop, currentStop, previousStop, nextStop, stopsAway: null, lifecycle: "passed-boarding-stop" };
  }
  if (boardingIndex === currentIndex && progress.state === "at-stop") {
    return { boardingStop, currentStop, previousStop, nextStop, stopsAway: 0, lifecycle: "at-boarding-stop" };
  }

  return {
    boardingStop,
    currentStop,
    previousStop,
    nextStop,
    stopsAway: Math.max(0, boardingIndex - currentIndex),
    lifecycle: "en-route",
  };
}
