import { getBusRealtimeSnapshot } from "@/lib/mta/buses";
import type {
  BusTrip,
  NearbyBusRealtimeResult,
  RealtimeSnapshot,
} from "@/types/transit";

export const MAX_NEARBY_BUS_STOP_IDS = 12;
export const MAX_NEARBY_BUS_CONCURRENCY = 4;
export const MAX_NEARBY_BUS_VISITS = 6;

export function normalizeNearbyBusStopIds(stopIds: readonly string[]): string[] {
  const valid = stopIds
    .map((stopId) => stopId.trim())
    .filter((stopId) => /^[A-Za-z0-9_-]{1,64}$/.test(stopId));
  return [...new Set(valid)].slice(0, MAX_NEARBY_BUS_STOP_IDS);
}

function toResult(stopId: string, snapshot: RealtimeSnapshot): NearbyBusRealtimeResult {
  const departures = snapshot.departures
    .filter((departure) => departure.stopId === stopId)
    .sort((a, b) => a.predictedArrival.getTime() - b.predictedArrival.getTime())
    .slice(0, MAX_NEARBY_BUS_VISITS);
  const tripIds = new Set(departures.map((departure) => departure.tripId));
  const trips = snapshot.trips.filter(
    (trip): trip is BusTrip => trip.mode === "bus" && tripIds.has(trip.id),
  );
  const vehicles = snapshot.vehicles.filter(
    (vehicle) => vehicle.tripId !== null && tripIds.has(vehicle.tripId),
  );
  return {
    stopId,
    sourceState: snapshot.sourceState,
    departures,
    trips,
    vehicles,
    feedTimestamp: snapshot.feedTimestamp,
    error: snapshot.sourceState === "unavailable" ? "Realtime unavailable" : null,
  };
}

export async function getNearbyBusRealtime(
  requestedStopIds: readonly string[],
  options: {
    fetchSnapshot?: (stopId: string) => Promise<RealtimeSnapshot>;
    concurrency?: number;
  } = {},
): Promise<NearbyBusRealtimeResult[]> {
  const stopIds = normalizeNearbyBusStopIds(requestedStopIds);
  const results = new Array<NearbyBusRealtimeResult>(stopIds.length);
  const fetchSnapshot = options.fetchSnapshot ?? ((stopId: string) =>
    getBusRealtimeSnapshot({ stopId, limit: MAX_NEARBY_BUS_VISITS }));
  const concurrency = Math.min(
    Math.max(1, Math.trunc(options.concurrency ?? MAX_NEARBY_BUS_CONCURRENCY)),
    MAX_NEARBY_BUS_CONCURRENCY,
  );
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < stopIds.length) {
      const index = cursor++;
      const stopId = stopIds[index];
      try {
        results[index] = toResult(stopId, await fetchSnapshot(stopId));
      } catch (error) {
        results[index] = {
          stopId,
          sourceState: "unavailable",
          departures: [],
          trips: [],
          vehicles: [],
          feedTimestamp: null,
          error: error instanceof Error ? error.message : "Realtime unavailable",
        };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, stopIds.length) }, () => worker()),
  );
  return results;
}
