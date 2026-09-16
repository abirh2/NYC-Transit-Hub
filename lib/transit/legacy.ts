import { toLegacySubwayDirection } from "@/lib/transit/direction";
import type { RealtimeSnapshot } from "@/types/transit";
import type { SubwayLine, TrainArrival } from "@/types/mta";
import type { BusArrival } from "@/types/mta";

/**
 * Compatibility projection for existing boards and tracker components.
 * New data-layer code should consume `Departure` and `TransitTrip` directly.
 */
export function toLegacyTrainArrivals(
  snapshot: Pick<RealtimeSnapshot, "departures" | "trips">,
): TrainArrival[] {
  const tripsById = new Map(snapshot.trips.map((trip) => [trip.id, trip]));

  return snapshot.departures.map((departure) => {
    const trip = tripsById.get(departure.tripId);
    return {
      tripId: departure.tripId,
      routeId: departure.routeId as SubwayLine,
      direction: toLegacySubwayDirection(departure.direction),
      headsign: departure.destination,
      stopId: departure.stopId,
      stationName: "",
      arrivalTime: departure.predictedArrival,
      departureTime: departure.predictedDeparture,
      delay: departure.delaySeconds,
      isAssigned: trip?.mode === "subway" ? trip.isAssigned : true,
      minutesAway: departure.minutesAway ?? 0,
    };
  });
}

export function toLegacyBusArrivals(
  snapshot: Pick<RealtimeSnapshot, "departures" | "trips" | "vehicles">,
): BusArrival[] {
  const departuresByTrip = new Map(
    snapshot.departures.map((departure) => [departure.tripId, departure]),
  );
  const vehiclesByTrip = new Map(
    snapshot.vehicles
      .filter((vehicle) => vehicle.tripId !== null)
      .map((vehicle) => [vehicle.tripId as string, vehicle]),
  );

  return snapshot.trips
    .filter((trip) => trip.mode === "bus")
    .map((trip) => {
      const departure = departuresByTrip.get(trip.id);
      const vehicle = vehiclesByTrip.get(trip.id);
      const actualPosition =
        vehicle?.position.source === "actual" ? vehicle.position : null;
      const nextStop = trip.stopTimeUpdates[0];

      return {
        vehicleId: vehicle?.id ?? trip.vehicleId ?? "",
        tripId: trip.id,
        routeId: trip.route.id,
        headsign: trip.destination,
        latitude: actualPosition?.coordinates.latitude ?? null,
        longitude: actualPosition?.coordinates.longitude ?? null,
        bearing: actualPosition?.bearing ?? null,
        nextStopId: nextStop?.stopId ?? null,
        nextStopName: trip.nextStopName,
        arrivalTime: departure?.predictedArrival ?? nextStop?.arrivalTime ?? null,
        distanceFromStop: trip.distanceFromNextStopMeters,
        progressStatus: trip.progressStatus,
        minutesAway: departure?.minutesAway ?? null,
      };
    });
}
