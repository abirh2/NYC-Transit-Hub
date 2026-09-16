import type { Departure, TransitDirection } from "@/types/transit";

export function sortDepartures(departures: readonly Departure[]): Departure[] {
  return [...departures].sort(
    (a, b) => a.predictedArrival.getTime() - b.predictedArrival.getTime(),
  );
}

export function getDeparturesForStop(
  departures: readonly Departure[],
  stopOrStationId: string,
): Departure[] {
  return sortDepartures(
    departures.filter(
      (departure) =>
        departure.stopId === stopOrStationId ||
        departure.stationId === stopOrStationId,
    ),
  );
}

export function getDeparturesByDirection(
  departures: readonly Departure[],
  direction: TransitDirection,
): Departure[] {
  return sortDepartures(
    departures.filter((departure) => departure.direction === direction),
  );
}

export function getDeparturesByRoute(
  departures: readonly Departure[],
  routeId: string,
): Departure[] {
  return sortDepartures(
    departures.filter((departure) => departure.routeId === routeId),
  );
}

export function getFollowingDepartures(
  departures: readonly Departure[],
  options: {
    selectedTripId: string;
    stopId?: string;
    limit?: number;
  },
): Departure[] {
  const sorted = sortDepartures(departures);
  const selected = sorted.find(
    (departure) => departure.tripId === options.selectedTripId,
  );
  if (!selected) return [];
  const targetStopId = options.stopId ?? selected.stopId;
  const seenTrips = new Set<string>();

  return sorted
    .filter(
      (departure) =>
        departure.tripId !== options.selectedTripId &&
        departure.routeId === selected.routeId &&
        departure.direction === selected.direction &&
        departure.predictedArrival > selected.predictedArrival &&
        departure.stopId === targetStopId,
    )
    .filter((departure) => {
      if (seenTrips.has(departure.tripId)) return false;
      seenTrips.add(departure.tripId);
      return true;
    })
    .slice(0, options.limit);
}
