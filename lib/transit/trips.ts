import type {
  RealtimeSnapshot,
  SubwayTrip,
  TransitDirection,
  TransitTrip,
} from "@/types/transit";

export function getTripById(
  snapshot: Pick<RealtimeSnapshot, "trips">,
  tripId: string,
): TransitTrip | null {
  return snapshot.trips.find((trip) => trip.id === tripId) ?? null;
}

export function getTripsForRoute(
  snapshot: Pick<RealtimeSnapshot, "trips">,
  routeId: string,
  direction?: TransitDirection,
): TransitTrip[] {
  return snapshot.trips.filter(
    (trip) =>
      trip.route.id === routeId &&
      (!direction || direction === "unknown" || trip.direction === direction),
  );
}

export function getActiveSubwayTrips(
  snapshot: Pick<RealtimeSnapshot, "trips">,
  options: { routeId?: string; direction?: TransitDirection } = {},
): SubwayTrip[] {
  return snapshot.trips.filter(
    (trip): trip is SubwayTrip =>
      trip.mode === "subway" &&
      trip.isAssigned &&
      trip.scheduleRelationship !== "canceled" &&
      trip.progress.state !== "not-started" &&
      trip.progress.state !== "unknown" &&
      trip.stopTimeUpdates.length > 0 &&
      (!options.routeId || trip.route.id === options.routeId) &&
      (!options.direction ||
        options.direction === "unknown" ||
        trip.direction === options.direction),
  );
}
