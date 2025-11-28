/**
 * GTFS-Realtime Type Definitions
 * Based on the GTFS-RT specification and MTA extensions
 * https://gtfs.org/realtime/reference/
 */

// ============================================================================
// Core GTFS-RT Message Types
// ============================================================================

export interface GtfsFeedMessage {
  header: GtfsFeedHeader;
  entity: GtfsFeedEntity[];
}

export interface GtfsFeedHeader {
  gtfsRealtimeVersion: string;
  incrementality: "FULL_DATASET" | "DIFFERENTIAL";
  timestamp: number; // Unix timestamp
}

export interface GtfsFeedEntity {
  id: string;
  isDeleted?: boolean;
  tripUpdate?: GtfsTripUpdate;
  vehicle?: GtfsVehiclePosition;
  alert?: GtfsAlert;
}

// ============================================================================
// Trip Updates (Arrival Predictions)
// ============================================================================

export interface GtfsTripUpdate {
  trip: GtfsTripDescriptor;
  vehicle?: GtfsVehicleDescriptor;
  stopTimeUpdate: GtfsStopTimeUpdate[];
  timestamp?: number;
  delay?: number;
}

export interface GtfsTripDescriptor {
  tripId: string;
  routeId?: string;
  directionId?: number; // 0 or 1
  startTime?: string;
  startDate?: string;
  scheduleRelationship?: "SCHEDULED" | "ADDED" | "UNSCHEDULED" | "CANCELED";
}

export interface GtfsVehicleDescriptor {
  id?: string;
  label?: string;
  licensePlate?: string;
}

export interface GtfsStopTimeUpdate {
  stopSequence?: number;
  stopId: string;
  arrival?: GtfsStopTimeEvent;
  departure?: GtfsStopTimeEvent;
  scheduleRelationship?: "SCHEDULED" | "SKIPPED" | "NO_DATA";
}

export interface GtfsStopTimeEvent {
  delay?: number;
  time?: number; // Unix timestamp
  uncertainty?: number;
}

// ============================================================================
// Vehicle Positions
// ============================================================================

export interface GtfsVehiclePosition {
  trip?: GtfsTripDescriptor;
  vehicle?: GtfsVehicleDescriptor;
  position?: GtfsPosition;
  currentStopSequence?: number;
  stopId?: string;
  currentStatus?: "INCOMING_AT" | "STOPPED_AT" | "IN_TRANSIT_TO";
  timestamp?: number;
  congestionLevel?: "UNKNOWN" | "RUNNING_SMOOTHLY" | "STOP_AND_GO" | "CONGESTION" | "SEVERE_CONGESTION";
  occupancyStatus?: "EMPTY" | "MANY_SEATS_AVAILABLE" | "FEW_SEATS_AVAILABLE" | "STANDING_ROOM_ONLY" | "CRUSHED_STANDING_ROOM_ONLY" | "FULL" | "NOT_ACCEPTING_PASSENGERS";
}

export interface GtfsPosition {
  latitude: number;
  longitude: number;
  bearing?: number;
  odometer?: number;
  speed?: number;
}

// ============================================================================
// Service Alerts
// ============================================================================

export interface GtfsAlert {
  activePeriod?: GtfsTimeRange[];
  informedEntity: GtfsEntitySelector[];
  cause?: GtfsAlertCause;
  effect?: GtfsAlertEffect;
  url?: GtfsTranslatedString;
  headerText?: GtfsTranslatedString;
  descriptionText?: GtfsTranslatedString;
  ttsHeaderText?: GtfsTranslatedString;
  ttsDescriptionText?: GtfsTranslatedString;
  severityLevel?: "UNKNOWN_SEVERITY" | "INFO" | "WARNING" | "SEVERE";
}

export interface GtfsTimeRange {
  start?: number;
  end?: number;
}

export interface GtfsEntitySelector {
  agencyId?: string;
  routeId?: string;
  routeType?: number;
  trip?: GtfsTripDescriptor;
  stopId?: string;
  directionId?: number;
}

export interface GtfsTranslatedString {
  translation: Array<{
    text: string;
    language?: string;
  }>;
}

export type GtfsAlertCause =
  | "UNKNOWN_CAUSE"
  | "OTHER_CAUSE"
  | "TECHNICAL_PROBLEM"
  | "STRIKE"
  | "DEMONSTRATION"
  | "ACCIDENT"
  | "HOLIDAY"
  | "WEATHER"
  | "MAINTENANCE"
  | "CONSTRUCTION"
  | "POLICE_ACTIVITY"
  | "MEDICAL_EMERGENCY";

export type GtfsAlertEffect =
  | "NO_SERVICE"
  | "REDUCED_SERVICE"
  | "SIGNIFICANT_DELAYS"
  | "DETOUR"
  | "ADDITIONAL_SERVICE"
  | "MODIFIED_SERVICE"
  | "OTHER_EFFECT"
  | "UNKNOWN_EFFECT"
  | "STOP_MOVED"
  | "NO_EFFECT"
  | "ACCESSIBILITY_ISSUE";

// ============================================================================
// MTA NYCT Extensions (Subway-specific)
// ============================================================================

export interface NyctTripDescriptor {
  trainId?: string;
  isAssigned?: boolean;
  direction?: "NORTH" | "SOUTH" | "EAST" | "WEST"; // From GTFS-RT protobuf enum
}

export interface NyctStopTimeUpdate {
  scheduledTrack?: string;
  actualTrack?: string;
}

// Extended feed entity with MTA-specific fields
export interface MtaFeedEntity extends GtfsFeedEntity {
  tripUpdate?: GtfsTripUpdate & {
    trip: GtfsTripDescriptor & {
      ".nyctTripDescriptor"?: NyctTripDescriptor;
    };
    stopTimeUpdate: Array<GtfsStopTimeUpdate & {
      ".nyctStopTimeUpdate"?: NyctStopTimeUpdate;
    }>;
  };
}

export interface MtaFeedMessage extends Omit<GtfsFeedMessage, "entity"> {
  entity: MtaFeedEntity[];
}

