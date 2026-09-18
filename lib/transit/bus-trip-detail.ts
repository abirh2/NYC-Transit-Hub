import type { BusTrip, Departure, TransitVehicle } from "@/types/transit";

export type BusTripLifecycle =
  | "approaching"
  | "at-stop"
  | "passed"
  | "disappeared"
  | "stale";

export interface BusTripDetailModel {
  lifecycle: BusTripLifecycle;
  trip: BusTrip | null;
  vehicle: TransitVehicle | null;
  departure: Departure | null;
  followingDepartures: Departure[];
}

export function getBusTripDetail(options: {
  selectedTripId: string;
  boardingStopId?: string | null;
  trips: readonly BusTrip[];
  departures: readonly Departure[];
  vehicles: readonly TransitVehicle[];
  isStale?: boolean;
  hadPreviousSelection?: boolean;
}): BusTripDetailModel {
  const trip = options.trips.find((candidate) => candidate.id === options.selectedTripId) ?? null;
  const departure = options.departures.find((candidate) =>
    candidate.tripId === options.selectedTripId &&
    (!options.boardingStopId || candidate.stopId === options.boardingStopId)) ?? null;
  const stopId = options.boardingStopId ?? departure?.stopId ?? trip?.boardingStopId ?? null;
  const vehicle = trip?.vehicleId
    ? options.vehicles.find((candidate) =>
        candidate.id === trip.vehicleId && candidate.tripId === trip.id) ?? null
    : null;
  const followingDepartures = options.departures
    .filter((candidate) =>
      candidate.tripId !== options.selectedTripId &&
      (!stopId || candidate.stopId === stopId))
    .sort((a, b) => a.predictedArrival.getTime() - b.predictedArrival.getTime())
    .slice(0, 4);

  let lifecycle: BusTripLifecycle;
  if (options.isStale) lifecycle = "stale";
  else if (trip?.progress.state === "at-stop" && (!stopId || trip.progress.stopId === stopId)) {
    lifecycle = "at-stop";
  } else if (departure) lifecycle = "approaching";
  else if (trip) lifecycle = "passed";
  else lifecycle = "disappeared";

  return { lifecycle, trip, vehicle, departure, followingDepartures };
}
