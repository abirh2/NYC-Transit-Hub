import type { StationWithCoords } from "@/lib/utils/train-positioning";
import type { StopTimePrediction, SubwayTrip } from "@/types/transit";

export interface SubwayTripProgressContext {
  currentStop: StopTimePrediction | null;
  previousStop: StopTimePrediction | null;
  nextStop: StopTimePrediction | null;
  completedStops: StopTimePrediction[];
  upcomingStops: StopTimePrediction[];
}

export interface SubwayTripPosition {
  coordinates: [latitude: number, longitude: number];
  previousStopId: string;
  nextStopId: string;
  progressRatio: number;
  confidence: "station" | "estimated";
}

function stationId(stopId: string): string {
  return stopId.replace(/[NSEW]$/, "");
}

function findStopIndex(
  updates: readonly StopTimePrediction[],
  stopId: string | null,
): number {
  if (!stopId) return -1;
  return updates.findIndex((update) => update.stopId === stopId);
}

export function getSubwayTripProgressContext(
  trip: SubwayTrip,
): SubwayTripProgressContext {
  const updates = trip.stopTimeUpdates;
  let currentIndex = -1;
  let previousIndex = -1;
  let nextIndex = -1;

  switch (trip.progress.state) {
    case "at-stop":
      currentIndex = findStopIndex(updates, trip.progress.stopId);
      previousIndex = currentIndex - 1;
      nextIndex = currentIndex;
      break;
    case "approaching":
    case "departed-previous-stop":
    case "between-stops":
      previousIndex = findStopIndex(updates, trip.progress.previousStopId);
      nextIndex = findStopIndex(updates, trip.progress.nextStopId);
      break;
    case "not-started":
      nextIndex = findStopIndex(updates, trip.progress.nextStopId);
      break;
    case "unknown":
      break;
  }

  const completedThrough = currentIndex >= 0 ? currentIndex - 1 : previousIndex;
  return {
    currentStop: currentIndex >= 0 ? updates[currentIndex] : null,
    previousStop: previousIndex >= 0 ? updates[previousIndex] : null,
    nextStop: nextIndex >= 0 ? updates[nextIndex] : null,
    completedStops:
      completedThrough >= 0 ? updates.slice(0, completedThrough + 1) : [],
    upcomingStops: nextIndex >= 0 ? updates.slice(nextIndex) : [],
  };
}

function stationForStop(
  stations: readonly StationWithCoords[],
  stopId: string,
): StationWithCoords | null {
  const id = stationId(stopId);
  return stations.find((station) => station.id === id) ?? null;
}

function interpolate(
  previous: StationWithCoords,
  next: StationWithCoords,
  ratio: number,
): [number, number] {
  const safeRatio = Math.max(0, Math.min(1, ratio));
  return [
    previous.lat + (next.lat - previous.lat) * safeRatio,
    previous.lon + (next.lon - previous.lon) * safeRatio,
  ];
}

/**
 * Projects normalized trip progress onto the existing ordered station geometry.
 * The result is an estimate, not a GPS position. Step 7 can replace this
 * projector with GTFS shapes without changing trip/progress logic.
 */
export function projectSubwayTripPosition(
  trip: SubwayTrip,
  stations: readonly StationWithCoords[],
): SubwayTripPosition | null {
  const progress = trip.progress;

  if (progress.state === "unknown" || progress.state === "not-started") return null;

  if (progress.state === "at-stop") {
    const station = stationForStop(stations, progress.stopId);
    if (!station) return null;
    return {
      coordinates: [station.lat, station.lon],
      previousStopId: progress.stopId,
      nextStopId: progress.stopId,
      progressRatio: 1,
      confidence: "station",
    };
  }

  const previousStopId = progress.previousStopId;
  const nextStopId = progress.nextStopId;
  if (!previousStopId) return null;

  const previous = stationForStop(stations, previousStopId);
  const next = stationForStop(stations, nextStopId);
  if (!previous || !next) return null;

  const ratio =
    progress.state === "approaching"
      ? 0.82
      : progress.progressRatio ??
        (progress.state === "departed-previous-stop" ? 0.2 : 0.5);

  return {
    coordinates: interpolate(previous, next, ratio),
    previousStopId,
    nextStopId,
    progressRatio: ratio,
    confidence: "estimated",
  };
}
