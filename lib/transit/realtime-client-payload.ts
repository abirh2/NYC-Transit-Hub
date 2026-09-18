import { z } from "zod";

import type {
  BusTrip,
  Departure,
  RealtimeSourceState,
  SubwayTrip,
  TransitVehicle,
} from "@/types/transit";

export interface SubwayRealtimePayload {
  trips: SubwayTrip[];
  departures: Departure[];
  sourceState: RealtimeSourceState;
  feedTimestamp: Date | null;
  lastUpdated: Date;
}

export interface BusRealtimePayload {
  trips: BusTrip[];
  departures: Departure[];
  vehicles: TransitVehicle[];
  sourceState: RealtimeSourceState;
  feedTimestamp: Date | null;
  lastUpdated: Date;
}

const dateSchema = z.string().datetime().transform((value) => new Date(value));
const nullableDateSchema = dateSchema.nullable();
const directionSchema = z.enum([
  "northbound",
  "southbound",
  "eastbound",
  "westbound",
  "inbound",
  "outbound",
  "unknown",
]);

const routeSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  longName: z.string().nullable(),
  mode: z.literal("subway"),
  color: z.string(),
  textColor: z.string(),
  agencyId: z.string().nullable(),
  description: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
});

const stopTimeSchema = z.object({
  stopId: z.string(),
  stationId: z.string().nullable(),
  sequence: z.number(),
  arrivalTime: nullableDateSchema,
  departureTime: nullableDateSchema,
  delaySeconds: z.number(),
  scheduleRelationship: z.enum(["scheduled", "skipped", "no-data"]),
});

const progressSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("not-started"),
    source: z.literal("inferred"),
    nextStopId: z.string(),
    timestamp: nullableDateSchema,
  }),
  z.object({
    state: z.literal("at-stop"),
    source: z.enum(["vehicle", "inferred"]),
    stopId: z.string(),
    timestamp: nullableDateSchema,
  }),
  z.object({
    state: z.literal("approaching"),
    source: z.enum(["vehicle", "inferred"]),
    nextStopId: z.string(),
    previousStopId: z.string().nullable(),
    timestamp: nullableDateSchema,
  }),
  z.object({
    state: z.enum(["departed-previous-stop", "between-stops"]),
    source: z.enum(["vehicle", "inferred"]),
    previousStopId: z.string(),
    nextStopId: z.string(),
    timestamp: nullableDateSchema,
    progressRatio: z.number().nullable().optional(),
  }),
  z.object({
    state: z.literal("unknown"),
    source: z.enum(["vehicle", "inferred"]),
    timestamp: nullableDateSchema.optional(),
  }),
]);

const subwayTripSchema = z.object({
  id: z.string(),
  mode: z.literal("subway"),
  route: routeSchema,
  direction: directionSchema,
  destination: z.string().nullable(),
  startDate: z.string().nullable(),
  startTime: z.string().nullable(),
  scheduleRelationship: z.enum([
    "scheduled",
    "added",
    "unscheduled",
    "canceled",
  ]),
  stopTimeUpdates: z.array(stopTimeSchema),
  progress: progressSchema,
  vehicleId: z.string().nullable(),
  updatedAt: nullableDateSchema,
  isAssigned: z.boolean(),
});

const departureSchema = z.object({
  id: z.string(),
  mode: z.literal("subway"),
  tripId: z.string(),
  routeId: z.string(),
  stopId: z.string(),
  stationId: z.string().nullable(),
  direction: directionSchema,
  destination: z.string().nullable(),
  predictedArrival: dateSchema,
  predictedDeparture: nullableDateSchema,
  delaySeconds: z.number(),
  status: z.enum(["realtime", "scheduled", "canceled", "no-prediction"]),
  minutesAway: z.number().nullable(),
});

const payloadSchema = z.object({
  trips: z.array(subwayTripSchema),
  departures: z.array(departureSchema),
  sourceState: z.enum(["ok", "stale", "unavailable", "malformed", "empty"]),
  feedTimestamp: nullableDateSchema,
  lastUpdated: dateSchema,
});

export function parseSubwayRealtimePayload(
  input: unknown,
): SubwayRealtimePayload {
  return payloadSchema.parse(input) as SubwayRealtimePayload;
}

function hydrateProgress<T extends { timestamp?: string | Date | null }>(progress: T): T {
  return {
    ...progress,
    timestamp: progress.timestamp ? new Date(progress.timestamp) : progress.timestamp,
  };
}

export function parseBusRealtimePayload(input: unknown): BusRealtimePayload {
  const raw = z.object({
    trips: z.array(z.record(z.string(), z.unknown())),
    departures: z.array(z.record(z.string(), z.unknown())),
    vehicles: z.array(z.record(z.string(), z.unknown())),
    sourceState: z.enum(["ok", "stale", "unavailable", "malformed", "empty"]),
    feedTimestamp: z.string().datetime().nullable(),
    lastUpdated: z.string().datetime(),
  }).parse(input);

  const trips = raw.trips.map((value) => {
    const trip = value as unknown as BusTrip & {
      updatedAt: string | null;
      progress: BusTrip["progress"] & { timestamp?: string | null };
      stopTimeUpdates: Array<BusTrip["stopTimeUpdates"][number] & {
        arrivalTime: string | null;
        departureTime: string | null;
      }>;
    };
    return {
      ...trip,
      updatedAt: trip.updatedAt ? new Date(trip.updatedAt) : null,
      progress: hydrateProgress(trip.progress),
      stopTimeUpdates: trip.stopTimeUpdates.map((prediction) => ({
        ...prediction,
        arrivalTime: prediction.arrivalTime ? new Date(prediction.arrivalTime) : null,
        departureTime: prediction.departureTime ? new Date(prediction.departureTime) : null,
      })),
    } as BusTrip;
  });
  const departures = raw.departures.map((value) => {
    const departure = value as unknown as Departure & {
      predictedArrival: string;
      predictedDeparture: string | null;
    };
    return {
      ...departure,
      predictedArrival: new Date(departure.predictedArrival),
      predictedDeparture: departure.predictedDeparture
        ? new Date(departure.predictedDeparture)
        : null,
    } as Departure;
  });
  const vehicles = raw.vehicles.map((value) => {
    const vehicle = value as unknown as TransitVehicle & {
      position: TransitVehicle["position"] & { timestamp: string | null };
    };
    return {
      ...vehicle,
      position: {
        ...vehicle.position,
        timestamp: vehicle.position.timestamp
          ? new Date(vehicle.position.timestamp)
          : null,
      },
    } as TransitVehicle;
  });

  return {
    trips,
    departures,
    vehicles,
    sourceState: raw.sourceState,
    feedTimestamp: raw.feedTimestamp ? new Date(raw.feedTimestamp) : null,
    lastUpdated: new Date(raw.lastUpdated),
  };
}
