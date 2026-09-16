import { fetchAllSubwayFeeds } from "@/lib/mta/gtfs-rt";
import { normalizeSubwayFeed } from "@/lib/transit/subway-adapter";
import type {
  RealtimeSnapshot,
  RealtimeSourceState,
  TransitDirection,
  TransitMode,
  TransitTrip,
} from "@/types/transit";

const SOURCE_STATE_PRIORITY: Record<RealtimeSourceState, number> = {
  ok: 0,
  empty: 1,
  stale: 2,
  malformed: 3,
  unavailable: 4,
};

function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

export function mergeRealtimeSnapshots(
  mode: TransitMode,
  snapshots: readonly RealtimeSnapshot[],
): RealtimeSnapshot {
  if (snapshots.length === 0) {
    return {
      mode,
      generatedAt: new Date(),
      feedTimestamp: null,
      sourceState: "unavailable",
      departures: [],
      trips: [],
      vehicles: [],
    };
  }

  const feedTimestamps = snapshots
    .map((snapshot) => snapshot.feedTimestamp)
    .filter((timestamp): timestamp is Date => timestamp !== null);

  return {
    mode,
    generatedAt: new Date(
      Math.max(...snapshots.map((snapshot) => snapshot.generatedAt.getTime())),
    ),
    feedTimestamp:
      feedTimestamps.length > 0
        ? new Date(Math.max(...feedTimestamps.map((timestamp) => timestamp.getTime())))
        : null,
    sourceState: snapshots.reduce<RealtimeSourceState>(
      (worst, snapshot) =>
        SOURCE_STATE_PRIORITY[snapshot.sourceState] > SOURCE_STATE_PRIORITY[worst]
          ? snapshot.sourceState
          : worst,
      "ok",
    ),
    departures: uniqueById(snapshots.flatMap((snapshot) => snapshot.departures)).sort(
      (a, b) => a.predictedArrival.getTime() - b.predictedArrival.getTime(),
    ),
    trips: uniqueById(snapshots.flatMap((snapshot) => snapshot.trips)),
    vehicles: uniqueById(snapshots.flatMap((snapshot) => snapshot.vehicles)),
  };
}

export interface SubwayRealtimeQuery {
  stationId?: string;
  stopId?: string;
  routeId?: string;
  direction?: TransitDirection;
  limit?: number;
}

export function filterRealtimeSnapshot(
  snapshot: RealtimeSnapshot,
  query: SubwayRealtimeQuery,
): RealtimeSnapshot {
  const departures = snapshot.departures
    .filter(
      (departure) =>
        (!query.stationId || departure.stationId === query.stationId) &&
        (!query.stopId || departure.stopId === query.stopId) &&
        (!query.routeId || departure.routeId === query.routeId) &&
        (!query.direction || departure.direction === query.direction),
    )
    .slice(0, query.limit);
  const tripIds = new Set(departures.map((departure) => departure.tripId));

  return {
    ...snapshot,
    departures,
    trips: snapshot.trips.filter((trip) => tripIds.has(trip.id)),
    vehicles: snapshot.vehicles.filter(
      (vehicle) => vehicle.tripId !== null && tripIds.has(vehicle.tripId),
    ),
  };
}

export async function getSubwayRealtimeSnapshot(
  query: SubwayRealtimeQuery = {},
): Promise<RealtimeSnapshot> {
  const feeds = await fetchAllSubwayFeeds();
  const now = new Date();
  const snapshots = [...feeds.values()].map((feed) =>
    normalizeSubwayFeed(feed, { now }),
  );

  return filterRealtimeSnapshot(
    mergeRealtimeSnapshots("subway", snapshots),
    query,
  );
}

export function getTripById(
  snapshot: Pick<RealtimeSnapshot, "trips">,
  tripId: string,
): TransitTrip | null {
  return snapshot.trips.find((trip) => trip.id === tripId) ?? null;
}
