import { createRealtimeSearchParams } from "@/lib/transit/deep-link";
import type {
  Departure,
  NearbyBusRealtimeResult,
  NearbyBusStopGroup,
  NearbyLocation,
  RealtimeSourceState,
  TransitDirection,
  TransitStation,
} from "@/types/transit";

export interface NearbyDirectionGroup {
  direction: TransitDirection;
  departures: Departure[];
}

export interface NearbyService {
  id: string;
  mode: "subway" | "bus";
  locationId: string;
  locationName: string;
  distanceMiles: number;
  departure: Departure;
  relatedDepartures: Departure[];
  sourceState: RealtimeSourceState;
}

interface BuildNearbyServicesInput {
  station: (TransitStation & { distance: number }) | null;
  subwayDepartures: readonly Departure[];
  subwaySourceState?: RealtimeSourceState;
  busGroups: readonly NearbyBusStopGroup[];
  busResults: readonly NearbyBusRealtimeResult[];
  now?: Date;
}

function groupServiceDepartures(
  departures: readonly Departure[],
  now: Date,
): Array<{ key: string; departures: Departure[] }> {
  const groups = new Map<string, Departure[]>();

  for (const departure of sortUniqueDepartures(departures)) {
    if (departure.predictedArrival.getTime() < now.getTime()) continue;
    const key = [
      departure.routeId,
      departure.direction,
      departure.destination ?? "",
    ].join(":");
    const group = groups.get(key) ?? [];
    group.push(departure);
    groups.set(key, group);
  }

  return [...groups.entries()].map(([key, group]) => ({
    key,
    departures: sortUniqueDepartures(group),
  }));
}

/**
 * Builds the small, rider-facing service list for Nearby without changing the
 * normalized transit contracts. Boarding places remain metadata; each row is
 * anchored by the exact next Trip that selection and deep links must preserve.
 */
export function buildNearbyServices({
  station,
  subwayDepartures,
  subwaySourceState = "empty",
  busGroups,
  busResults,
  now = new Date(),
}: BuildNearbyServicesInput): NearbyService[] {
  const services: NearbyService[] = [];

  if (station) {
    for (const group of groupServiceDepartures(subwayDepartures, now)) {
      const departure = group.departures[0];
      services.push({
        id: `subway:${station.id}:${group.key}`,
        mode: "subway",
        locationId: `subway:${station.id}`,
        locationName: station.name,
        distanceMiles: station.distance,
        departure,
        relatedDepartures: group.departures,
        sourceState: subwaySourceState,
      });
    }
  }

  for (const stopGroup of busGroups) {
    const stopIds = new Set(stopGroup.stops.map((stop) => stop.id));
    const matchingResults = busResults.filter((result) => stopIds.has(result.stopId));
    const sourceState = matchingResults.some((result) => result.sourceState === "ok")
      ? matchingResults.some((result) => result.sourceState === "stale")
        ? "stale"
        : "ok"
      : matchingResults[0]?.sourceState ?? "empty";
    const departures = matchingResults.flatMap((result) => result.departures);

    for (const group of groupServiceDepartures(departures, now)) {
      const departure = group.departures[0];
      services.push({
        id: `bus:${stopGroup.id}:${group.key}`,
        mode: "bus",
        locationId: stopGroup.id,
        locationName: stopGroup.name,
        distanceMiles: stopGroup.distanceMiles,
        departure,
        relatedDepartures: group.departures,
        sourceState,
      });
    }
  }

  return services.sort((a, b) =>
    a.distanceMiles - b.distanceMiles ||
    a.departure.predictedArrival.getTime() - b.departure.predictedArrival.getTime() ||
    a.mode.localeCompare(b.mode) ||
    a.id.localeCompare(b.id));
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

export function createBusDeepLink(departure: Departure): string {
  const params = createRealtimeSearchParams({
    mode: "bus",
    routeId: departure.routeId,
    stopId: departure.stopId,
    direction: departure.direction,
    tripId: departure.tripId,
  });
  return `/realtime?${params.toString()}`;
}

export function sortNearbyLocations(
  locations: readonly NearbyLocation[],
): NearbyLocation[] {
  return [...locations].sort((a, b) => {
    const nameA = a.mode === "subway" ? a.station.name : a.stopGroup.name;
    const nameB = b.mode === "subway" ? b.station.name : b.stopGroup.name;
    return (
      a.distanceMiles - b.distanceMiles ||
      a.mode.localeCompare(b.mode) ||
      nameA.localeCompare(nameB) ||
      a.id.localeCompare(b.id)
    );
  });
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
