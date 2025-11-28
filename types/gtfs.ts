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

// ============================================================================
// Multi-Track Graph Types (for multi-line diagram rendering)
// ============================================================================

/**
 * A column in the multi-track graph, representing one subway line
 */
export interface TrackColumn {
  /** Line ID (e.g., "4", "5", "6") */
  lineId: string;
  /** Column index (0, 1, 2...) from left to right */
  columnIndex: number;
  /** Line color */
  color: string;
  /** Stations on this column with their row indices */
  stations: ColumnStation[];
}

/**
 * A station within a track column
 */
export interface ColumnStation {
  /** Station ID */
  id: string;
  /** Station name */
  name: string;
  /** Row index in the unified grid */
  rowIndex: number;
  /** Is this a terminal station? */
  isTerminal: boolean;
  /** Is this an express stop? */
  isExpress: boolean;
}

/**
 * A row in the unified grid (represents a vertical position)
 */
export interface GraphRow {
  /** Row index (0 = top) */
  index: number;
  /** Is this a junction where multiple lines meet? */
  isJunction: boolean;
  /** The shared station ID if this is a junction */
  junctionStationId?: string;
  /** Station name for junctions */
  junctionStationName?: string;
  /** Which lines meet at this junction */
  junctionLines?: string[];
  /** Colors of lines at this junction (for rendering) */
  junctionColors?: string[];
}

/**
 * A junction point where multiple lines converge
 */
export interface Junction {
  /** Row index where junction occurs */
  rowIndex: number;
  /** Station ID at the junction */
  stationId: string;
  /** Station name */
  stationName: string;
  /** Lines that meet at this junction */
  lines: string[];
  /** Column indices that connect to this junction */
  columnIndices: number[];
  /** Colors of the connecting lines */
  colors: string[];
}

/**
 * Complete multi-track layout for rendering
 */
export interface MultiTrackLayout {
  /** Track columns (one per selected line) */
  columns: TrackColumn[];
  /** Unified row grid */
  rows: GraphRow[];
  /** Junction points where lines converge */
  junctions: Junction[];
  /** Total number of rows */
  totalRows: number;
}

// Legacy types for backwards compatibility
export interface TrackSegment {
  id: string;
  type: "trunk" | "branch";
  lines: string[];
  stations: TrackSegmentStation[];
  colors: string[];
  xOffset: number;
  connectsFrom?: string;
  connectsTo?: string;
}

export interface TrackSegmentStation {
  id: string;
  name: string;
  type?: "terminal";
  express?: boolean;
  servedBy: string[];
  globalIndex: number;
}

export interface TrackLayout {
  segments: TrackSegment[];
  totalPositions: number;
  stationLineMap: Map<string, string[]>;
}

