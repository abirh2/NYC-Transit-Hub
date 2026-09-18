import { createRealtimeSearchParams } from "@/lib/transit/deep-link";
import type { Departure, TransitDirection, TransitStation } from "@/types/transit";

export interface NearbyDirectionGroup {
  direction: TransitDirection;
  departures: Departure[];
}

export function groupDeparturesByDirection(
  departures: readonly Departure[],
): NearbyDirectionGroup[] {
  const groups = new Map<TransitDirection, Departure[]>();

  for (const departure of departures) {
    const group = groups.get(departure.direction) ?? [];
    group.push(departure);
    groups.set(departure.direction, group);
  }

  return [...groups.entries()]
    .map(([direction, group]) => ({
      direction,
      departures: sortUniqueDepartures(group),
    }))
    .sort((a, b) => {
      const firstA = a.departures[0]?.predictedArrival.getTime() ?? Infinity;
      const firstB = b.departures[0]?.predictedArrival.getTime() ?? Infinity;
      return firstA - firstB;
    });
}

export function getStationDirectionGroups(
  station: Pick<TransitStation, "stops">,
): TransitDirection[] {
  return [...new Set(station.stops.map((stop) => stop.direction))].filter(
    (direction) => direction !== "unknown",
  );
}

export function sortUniqueDepartures(
  departures: readonly Departure[],
): Departure[] {
  const seenTrips = new Set<string>();

  return [...departures]
    .sort((a, b) => a.predictedArrival.getTime() - b.predictedArrival.getTime())
    .filter((departure) => {
      if (seenTrips.has(departure.tripId)) return false;
      seenTrips.add(departure.tripId);
      return true;
    });
}

export function selectNextDeparture(
  departures: readonly Departure[],
  now = new Date(),
): Departure | null {
  return (
    sortUniqueDepartures(departures).find(
      (departure) => departure.predictedArrival.getTime() >= now.getTime(),
    ) ?? null
  );
}

export function formatDepartureEta(
  predictedArrival: Date,
  now = new Date(),
): string {
  const minutes = Math.max(
    0,
    Math.round((predictedArrival.getTime() - now.getTime()) / 60_000),
  );
  return minutes === 0 ? "Due" : `${minutes} min`;
}

export function getRiderDirectionLabel(
  direction: TransitDirection,
  destination?: string | null,
): string {
  if (destination) return destination;

  switch (direction) {
    case "northbound":
      return "Uptown / Bronx";
    case "southbound":
      return "Downtown / Brooklyn";
    case "eastbound":
      return "Queens / East";
    case "westbound":
      return "Manhattan / West";
    case "inbound":
      return "Inbound";
    case "outbound":
      return "Outbound";
    default:
      return "Direction unavailable";
  }
}

export function getStationPlatformIds(
  station: Pick<TransitStation, "stops">,
  direction: TransitDirection,
): string[] {
  return station.stops
    .filter((stop) => stop.direction === direction)
    .map((stop) => stop.stationId ?? stop.id)
    .filter((id, index, ids) => ids.indexOf(id) === index);
}

export function createTrainDeepLink(departure: Departure): string {
  const params = createRealtimeSearchParams({
    mode: "subway",
    routeId: departure.routeId,
    stationId: departure.stationId ?? departure.stopId,
    stopId: departure.stopId,
    direction: departure.direction,
    tripId: departure.tripId,
  });
  return `/realtime?${params.toString()}`;
}

export function getFreshnessLabel(
  sourceState: "ok" | "stale" | "unavailable" | "malformed" | "empty",
): string {
  switch (sourceState) {
    case "stale":
      return "Updates may be delayed";
    case "unavailable":
    case "malformed":
      return "Realtime unavailable";
    case "empty":
      return "No upcoming trains found";
    default:
      return "Live departures";
  }
}
