import { normalizeSubwayDirection } from "@/lib/transit/direction";
import type { TransitStation, TransitStop } from "@/types/transit";

export interface StaticGtfsStopInput {
  stopId: string;
  stopName: string;
  stopLat: number;
  stopLon: number;
  locationType: number;
  parentStation: string | null;
}

function platformDirection(stopId: string): TransitStop["direction"] {
  return normalizeSubwayDirection(stopId.at(-1));
}

/**
 * Converts static GTFS parent/platform rows into rider-facing station
 * complexes containing source-specific directional stops.
 */
export function normalizeSubwayStations(
  stops: readonly StaticGtfsStopInput[],
  routeIdsByStop: ReadonlyMap<string, readonly string[]> = new Map(),
): TransitStation[] {
  const parents = new Map(
    stops
      .filter((stop) => stop.locationType === 1)
      .map((stop) => [stop.stopId, stop]),
  );
  const groups = new Map<string, StaticGtfsStopInput[]>();

  for (const parent of parents.values()) {
    const group = groups.get(parent.stopName) ?? [];
    group.push(parent);
    groups.set(parent.stopName, group);
  }

  return [...groups.values()]
    .map((sourceStations) => {
      sourceStations.sort((a, b) => a.stopId.localeCompare(b.stopId));
      const sourceIds = sourceStations.map((station) => station.stopId);
      const sourceIdSet = new Set(sourceIds);
      const platformStops = stops
        .filter(
          (stop) =>
            stop.parentStation !== null && sourceIdSet.has(stop.parentStation),
        )
        .sort((a, b) => a.stopId.localeCompare(b.stopId));

      const normalizedStops: TransitStop[] = platformStops.map((stop) => ({
        id: stop.stopId,
        stationId: stop.parentStation,
        name: stop.stopName,
        mode: "subway",
        direction: platformDirection(stop.stopId),
        location: {
          latitude: stop.stopLat,
          longitude: stop.stopLon,
        },
        platformCode: /[NSEW]$/.test(stop.stopId) ? stop.stopId.at(-1) ?? null : null,
        routeIds: [...(routeIdsByStop.get(stop.stopId) ?? [])],
      }));
      const routeIds = [
        ...new Set(normalizedStops.flatMap((stop) => stop.routeIds)),
      ].sort();
      const primary = sourceStations[0];

      return {
        id: primary.stopId,
        sourceIds,
        name: primary.stopName,
        mode: "subway" as const,
        location: {
          latitude: primary.stopLat,
          longitude: primary.stopLon,
        },
        stops: normalizedStops,
        routeIds,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
