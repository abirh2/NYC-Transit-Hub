import { z } from "zod";

import type {
  Departure,
  RealtimeSourceState,
  SubwayTrip,
} from "@/types/transit";

export interface SubwayRealtimePayload {
  trips: SubwayTrip[];
  departures: Departure[];
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
