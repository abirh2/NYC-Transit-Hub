/**
 * Source-independent transit domain contracts.
 *
 * Upstream GTFS-Realtime and SIRI payloads are translated into these types at
 * the adapter boundary. React components and higher-level services should not
 * need to understand feed-specific field names.
 */

export type TransitMode = "subway" | "bus" | "lirr" | "metro-north";

export type TransitDirection =
  | "northbound"
  | "southbound"
  | "eastbound"
  | "westbound"
  | "inbound"
  | "outbound"
  | "unknown";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface TransitRoute {
  id: string;
  displayName: string;
  longName: string | null;
  mode: TransitMode;
  color: string;
  textColor: string;
  agencyId: string | null;
  description?: string | null;
  url?: string | null;
}

export interface TransitStop {
  id: string;
  stationId: string | null;
  name: string;
  mode: TransitMode;
  direction: TransitDirection;
  location: Coordinates | null;
  platformCode: string | null;
  routeIds: string[];
}

export interface NearbyBusStop extends TransitStop {
  mode: "bus";
  distanceMiles: number;
}

export interface TransitStation {
  id: string;
  sourceIds: string[];
  name: string;
  mode: TransitMode;
  location: Coordinates | null;
  stops: TransitStop[];
  routeIds: string[];
}

export type StopScheduleRelationship = "scheduled" | "skipped" | "no-data";

export interface StopTimePrediction {
  stopId: string;
  stationId: string | null;
  sequence: number;
  arrivalTime: Date | null;
  departureTime: Date | null;
  delaySeconds: number;
  scheduleRelationship: StopScheduleRelationship;
}

export type TripProgress =
  | {
      state: "not-started";
      source: "inferred";
      nextStopId: string;
      timestamp: Date | null;
    }
  | {
      state: "at-stop";
      source: "vehicle" | "inferred";
      stopId: string;
      timestamp: Date | null;
    }
  | {
      state: "approaching";
      source: "vehicle" | "inferred";
      nextStopId: string;
      previousStopId: string | null;
      timestamp: Date | null;
    }
  | {
      state: "departed-previous-stop" | "between-stops";
      source: "vehicle" | "inferred";
      previousStopId: string;
      nextStopId: string;
      timestamp: Date | null;
      /** Optional 0-1 progress that a future geometry layer may interpolate. */
      progressRatio?: number | null;
    }
  | {
      state: "unknown";
      source: "vehicle" | "inferred";
      timestamp?: Date | null;
    };

interface BaseTrip {
  id: string;
  mode: TransitMode;
  route: TransitRoute;
  direction: TransitDirection;
  destination: string | null;
  startDate: string | null;
  startTime: string | null;
  scheduleRelationship: "scheduled" | "added" | "unscheduled" | "canceled";
  stopTimeUpdates: StopTimePrediction[];
  progress: TripProgress;
  vehicleId: string | null;
  updatedAt: Date | null;
}

export interface SubwayTrip extends BaseTrip {
  mode: "subway";
  isAssigned: boolean;
}

export interface BusTrip extends BaseTrip {
  mode: "bus";
  journeyPatternId: string | null;
  nextStopName: string | null;
  distanceFromNextStopMeters: number | null;
  progressStatus: string | null;
}

export interface RailTrip extends BaseTrip {
  mode: "lirr" | "metro-north";
  trainNumber: string | null;
}

export type TransitTrip = SubwayTrip | BusTrip | RailTrip;

export type VehiclePosition =
  | {
      source: "actual";
      coordinates: Coordinates;
      bearing: number | null;
      speedMetersPerSecond: number | null;
      timestamp: Date | null;
    }
  | {
      source: "inferred";
      previousStopId: string | null;
      nextStopId: string | null;
      progressRatio: number | null;
      timestamp: Date | null;
    }
  | {
      source: "unknown";
      timestamp: Date | null;
    };

export interface TransitVehicle {
  id: string;
  mode: TransitMode;
  tripId: string | null;
  label: string | null;
  position: VehiclePosition;
  currentStopId: string | null;
  status: "incoming" | "stopped" | "in-transit" | "unknown";
}

export interface Departure {
  id: string;
  mode: TransitMode;
  /** Stable relationship to a full `TransitTrip` in the same snapshot/service. */
  tripId: string;
  routeId: string;
  stopId: string;
  stationId: string | null;
  direction: TransitDirection;
  destination: string | null;
  predictedArrival: Date;
  predictedDeparture: Date | null;
  delaySeconds: number;
  status: "realtime" | "scheduled" | "canceled" | "no-prediction";
  minutesAway: number | null;
}

export type AlertSeverity = "INFO" | "WARNING" | "SEVERE";

export type AlertType =
  | "DELAY"
  | "DETOUR"
  | "STATION_CLOSURE"
  | "PLANNED_WORK"
  | "SERVICE_CHANGE"
  | "REDUCED_SERVICE"
  | "SHUTTLE_BUS"
  | "OTHER";

export interface ServiceAlert {
  id: string;
  affectedRoutes: string[];
  affectedStops: string[];
  headerText: string;
  descriptionText: string | null;
  severity: AlertSeverity;
  alertType: AlertType;
  activePeriodStart: Date | null;
  activePeriodEnd: Date | null;
}

export interface ServiceStatus {
  routeId: string;
  status: "good-service" | "planned-work" | "delays" | "suspended" | "unknown";
  updatedAt: Date;
  alertIds: string[];
}

export type RealtimeSourceState =
  | "ok"
  | "stale"
  | "unavailable"
  | "malformed"
  | "empty";

export interface RealtimeSnapshot {
  mode: TransitMode;
  generatedAt: Date;
  feedTimestamp: Date | null;
  sourceState: RealtimeSourceState;
  departures: Departure[];
  trips: TransitTrip[];
  vehicles: TransitVehicle[];
}
