import { getRouteById, getStationById } from "@/lib/gtfs/parser";
import { getRouteColorPair } from "@/lib/transit/route-colors";
import { normalizeSubwayDirection } from "@/lib/transit/direction";
import { REALTIME_STALE_AFTER_MS } from "@/lib/transit/cache-policy";
import type {
  GtfsStopTimeUpdate,
  GtfsTripDescriptor,
  GtfsVehiclePosition,
  MtaFeedMessage,
  NyctTripDescriptor,
} from "@/types/gtfs";
import type {
  Departure,
  RealtimeSnapshot,
  StopScheduleRelationship,
  StopTimePrediction,
  SubwayTrip,
  TransitRoute,
  TransitVehicle,
  TripProgress,
} from "@/types/transit";

export interface SubwayAdapterOptions {
  now?: Date;
  getStopName?: (stopId: string) => string | null;
}

function toDate(timestamp: number | undefined): Date | null {
  return timestamp ? new Date(timestamp * 1000) : null;
}

function getStationId(stopId: string): string {
  return stopId.replace(/[NS]$/, "");
}

function normalizeScheduleRelationship(
  value: string | undefined,
): StopScheduleRelationship {
  switch (value?.toUpperCase()) {
    case "SKIPPED":
      return "skipped";
    case "NO_DATA":
      return "no-data";
    default:
      return "scheduled";
  }
}

function normalizeTripScheduleRelationship(
  value: GtfsTripDescriptor["scheduleRelationship"],
): SubwayTrip["scheduleRelationship"] {
  switch (value?.toUpperCase()) {
    case "ADDED":
      return "added";
    case "UNSCHEDULED":
      return "unscheduled";
    case "CANCELED":
      return "canceled";
    default:
      return "scheduled";
  }
}

function normalizeStopTimeUpdates(
  updates: GtfsStopTimeUpdate[],
): StopTimePrediction[] {
  return updates
    .map((update, index) => ({
      stopId: update.stopId ?? "",
      stationId: update.stopId ? getStationId(update.stopId) : null,
      sequence: update.stopSequence ?? index + 1,
      arrivalTime: toDate(update.arrival?.time),
      departureTime: toDate(update.departure?.time),
      delaySeconds: update.arrival?.delay ?? update.departure?.delay ?? 0,
      scheduleRelationship: normalizeScheduleRelationship(
        update.scheduleRelationship,
      ),
    }))
    .filter((update) => update.stopId.length > 0)
    .sort((a, b) => a.sequence - b.sequence);
}

function createRoute(routeId: string): TransitRoute {
  const staticRoute = getRouteById(routeId);
  const colors = getRouteColorPair(routeId);

  return {
    id: routeId,
    displayName: staticRoute?.routeShortName || routeId,
    longName: staticRoute?.routeLongName || null,
    mode: "subway",
    // Route family colors are single-sourced in route-colors.ts. Static GTFS
    // still supplies names, agency, description, and URL metadata.
    color: colors.bg,
    textColor: colors.text,
    agencyId: staticRoute?.agencyId || "MTA NYCT",
    description: staticRoute?.routeDesc || null,
    url: staticRoute?.routeUrl || null,
  };
}

function findStopIndex(
  updates: StopTimePrediction[],
  vehicle: GtfsVehiclePosition,
): number {
  if (vehicle.currentStopSequence !== undefined) {
    const bySequence = updates.findIndex(
      (update) => update.sequence === vehicle.currentStopSequence,
    );
    if (bySequence >= 0) return bySequence;
  }

  return vehicle.stopId
    ? updates.findIndex((update) => update.stopId === vehicle.stopId)
    : -1;
}

function progressFromVehicle(
  updates: StopTimePrediction[],
  vehicle: GtfsVehiclePosition,
): TripProgress {
  const index = findStopIndex(updates, vehicle);
  const current = updates[index];
  const previous = updates[index - 1];
  const timestamp = toDate(vehicle.timestamp);

  if (vehicle.currentStatus === "STOPPED_AT" && current) {
    return { state: "at-stop", source: "vehicle", stopId: current.stopId, timestamp };
  }

  if (vehicle.currentStatus === "INCOMING_AT" && current) {
    return {
      state: "approaching",
      source: "vehicle",
      nextStopId: current.stopId,
      previousStopId: previous?.stopId ?? null,
      timestamp,
    };
  }

  if (vehicle.currentStatus === "IN_TRANSIT_TO" && current && previous) {
    return {
      state: "between-stops",
      source: "vehicle",
      previousStopId: previous.stopId,
      nextStopId: current.stopId,
      timestamp,
      progressRatio: null,
    };
  }

  return { state: "unknown", source: "vehicle", timestamp };
}

function inferProgress(
  updates: StopTimePrediction[],
  now: Date,
): TripProgress {
  const nextIndex = updates.findIndex(
    (update) => {
      const predictionTime = (update.arrivalTime ?? update.departureTime)?.getTime();
      return predictionTime !== undefined && predictionTime >= now.getTime();
    },
  );
  const next = updates[nextIndex];
  const previous = updates[nextIndex - 1];

  if (!next) return { state: "unknown", source: "inferred", timestamp: now };

  const arrivalTime = next.arrivalTime?.getTime();
  const departureTime = next.departureTime?.getTime();
  if (
    arrivalTime !== undefined &&
    departureTime !== undefined &&
    arrivalTime <= now.getTime() &&
    departureTime >= now.getTime()
  ) {
    return { state: "at-stop", source: "inferred", stopId: next.stopId, timestamp: now };
  }

  if (arrivalTime !== undefined && arrivalTime - now.getTime() <= 60_000) {
    return {
      state: "approaching",
      source: "inferred",
      nextStopId: next.stopId,
      previousStopId: previous?.stopId ?? null,
      timestamp: now,
    };
  }

  if (previous) {
    return {
      state: "departed-previous-stop",
      source: "inferred",
      previousStopId: previous.stopId,
      nextStopId: next.stopId,
      timestamp: now,
      progressRatio: null,
    };
  }

  return { state: "unknown", source: "inferred", timestamp: now };
}

function normalizeVehicle(
  raw: GtfsVehiclePosition,
  updates: StopTimePrediction[],
): TransitVehicle {
  const progress = progressFromVehicle(updates, raw);
  const coordinates = raw.position;
  const hasActualCoordinates =
    coordinates != null &&
    Number.isFinite(coordinates.latitude) &&
    Number.isFinite(coordinates.longitude) &&
    (coordinates.latitude !== 0 || coordinates.longitude !== 0);

  return {
    id: raw.vehicle?.id || raw.vehicle?.label || raw.trip?.tripId || "unknown",
    mode: "subway",
    tripId: raw.trip?.tripId ?? null,
    label: raw.vehicle?.label ?? null,
    position: hasActualCoordinates
      ? {
          source: "actual",
          coordinates: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          },
          bearing: coordinates.bearing ?? null,
          speedMetersPerSecond: coordinates.speed ?? null,
          timestamp: toDate(raw.timestamp),
        }
      : progress.state === "between-stops" ||
          progress.state === "departed-previous-stop"
        ? {
            source: "inferred",
            previousStopId: progress.previousStopId,
            nextStopId: progress.nextStopId,
            progressRatio: progress.progressRatio ?? null,
            timestamp: progress.timestamp,
          }
        : progress.state === "approaching"
          ? {
              source: "inferred",
              previousStopId: progress.previousStopId,
              nextStopId: progress.nextStopId,
              progressRatio: null,
              timestamp: progress.timestamp,
            }
          : {
              source: "unknown",
              timestamp: "timestamp" in progress ? progress.timestamp ?? null : null,
            },
    currentStopId: raw.stopId ?? null,
    status:
      raw.currentStatus === "INCOMING_AT"
        ? "incoming"
        : raw.currentStatus === "STOPPED_AT"
          ? "stopped"
          : raw.currentStatus === "IN_TRANSIT_TO"
            ? "in-transit"
            : "unknown",
  };
}

function createDeparture(
  trip: SubwayTrip,
  update: StopTimePrediction,
  now: Date,
): Departure | null {
  if (!update.arrivalTime || update.arrivalTime < now) return null;

  return {
    id: `${trip.id}:${update.stopId}:${update.sequence}`,
    mode: "subway",
    tripId: trip.id,
    routeId: trip.route.id,
    stopId: update.stopId,
    stationId: update.stationId,
    direction: trip.direction,
    destination: trip.destination,
    predictedArrival: update.arrivalTime,
    predictedDeparture: update.departureTime,
    delaySeconds: update.delaySeconds,
    status:
      trip.scheduleRelationship === "canceled" ? "canceled" : "realtime",
    minutesAway: Math.max(
      0,
      Math.round((update.arrivalTime.getTime() - now.getTime()) / 60_000),
    ),
  };
}

export function normalizeSubwayFeed(
  feed: MtaFeedMessage,
  options: SubwayAdapterOptions = {},
): RealtimeSnapshot {
  const now = options.now ?? new Date();
  const feedTimestamp = toDate(feed.header.timestamp);
  const vehicleEntities = new Map<string, GtfsVehiclePosition>();

  for (const entity of feed.entity) {
    const rawVehicle = entity.vehicle;
    const tripId = rawVehicle?.trip?.tripId;
    if (tripId && rawVehicle) vehicleEntities.set(tripId, rawVehicle);
  }

  const trips: SubwayTrip[] = [];
  const departures: Departure[] = [];
  const vehicles: TransitVehicle[] = [];
  const stopNameResolver =
    options.getStopName ??
    ((stopId: string) => getStationById(stopId)?.name ?? null);

  for (const entity of feed.entity) {
    if (!entity.tripUpdate?.trip?.tripId) continue;

    const rawTrip = entity.tripUpdate.trip;
    const tripId = rawTrip.tripId;
    const routeId = rawTrip.routeId || "?";
    const nyctTrip = (
      rawTrip as GtfsTripDescriptor & { nyctTripDescriptor?: NyctTripDescriptor }
    ).nyctTripDescriptor;
    const stopTimeUpdates = normalizeStopTimeUpdates(
      entity.tripUpdate.stopTimeUpdate ?? [],
    );
    const rawVehicle = vehicleEntities.get(tripId);
    const vehicle = rawVehicle
      ? normalizeVehicle(rawVehicle, stopTimeUpdates)
      : null;
    const lastStop = stopTimeUpdates.at(-1);
    const destination = lastStop ? stopNameResolver(lastStop.stopId) : null;
    const platformDirection = stopTimeUpdates[0]?.stopId.at(-1);

    const trip: SubwayTrip = {
      id: tripId,
      mode: "subway",
      route: createRoute(routeId),
      direction: normalizeSubwayDirection(
        nyctTrip?.direction ??
          (/^[NSEW]$/.test(platformDirection ?? "")
            ? platformDirection
            : undefined) ??
          (rawTrip.directionId === 0
            ? "N"
            : rawTrip.directionId === 1
              ? "S"
              : undefined),
      ),
      destination,
      startDate: rawTrip.startDate ?? null,
      startTime: rawTrip.startTime ?? null,
      scheduleRelationship: normalizeTripScheduleRelationship(
        rawTrip.scheduleRelationship,
      ),
      stopTimeUpdates,
      progress: rawVehicle
        ? progressFromVehicle(stopTimeUpdates, rawVehicle)
        : inferProgress(stopTimeUpdates, now),
      vehicleId:
        entity.tripUpdate.vehicle?.id ?? vehicle?.id ?? nyctTrip?.trainId ?? null,
      updatedAt:
        toDate(entity.tripUpdate.timestamp) ??
        toDate(rawVehicle?.timestamp) ??
        feedTimestamp,
      isAssigned: nyctTrip?.isAssigned ?? true,
    };

    trips.push(trip);
    if (vehicle) vehicles.push(vehicle);

    for (const update of stopTimeUpdates) {
      const departure = createDeparture(trip, update, now);
      if (departure) departures.push(departure);
    }
  }

  departures.sort(
    (a, b) => a.predictedArrival.getTime() - b.predictedArrival.getTime(),
  );

  const ageMs = feedTimestamp ? now.getTime() - feedTimestamp.getTime() : 0;
  return {
    mode: "subway",
    generatedAt: now,
    feedTimestamp,
    sourceState:
      trips.length === 0
        ? "empty"
        : ageMs > REALTIME_STALE_AFTER_MS
          ? "stale"
          : "ok",
    departures,
    trips,
    vehicles,
  };
}
