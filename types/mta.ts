/**
 * MTA-Specific Type Definitions
 * Types for normalized/processed MTA data
 */

// ============================================================================
// Subway Line Information
// ============================================================================

export type SubwayLine =
  | "1" | "2" | "3"           // IRT Broadway-Seventh Avenue (Red)
  | "4" | "5" | "6"           // IRT Lexington Avenue (Green)
  | "7"                       // IRT Flushing (Purple)
  | "A" | "C" | "E"           // IND Eighth Avenue (Blue)
  | "B" | "D" | "F" | "M"     // IND Sixth Avenue (Orange)
  | "G"                       // IND Crosstown (Lime Green)
  | "J" | "Z"                 // BMT Nassau Street (Brown)
  | "L"                       // BMT Canarsie (Gray)
  | "N" | "Q" | "R" | "W"     // BMT Broadway (Yellow)
  | "S"                       // Shuttles (Gray)
  | "SF"                      // Franklin Av Shuttle
  | "SR"                      // Rockaway Park Shuttle
  | "SIR";                    // Staten Island Railway

export type LineColor =
  | "red" | "green" | "purple" | "blue"
  | "orange" | "lime" | "brown" | "gray" | "yellow";

export const LINE_COLORS: Record<SubwayLine, LineColor> = {
  "1": "red", "2": "red", "3": "red",
  "4": "green", "5": "green", "6": "green",
  "7": "purple",
  "A": "blue", "C": "blue", "E": "blue",
  "B": "orange", "D": "orange", "F": "orange", "M": "orange",
  "G": "lime",
  "J": "brown", "Z": "brown",
  "L": "gray",
  "N": "yellow", "Q": "yellow", "R": "yellow", "W": "yellow",
  "S": "gray",
  "SF": "gray",
  "SR": "gray",
  "SIR": "blue",
};

// Feed URL identifiers
export type SubwayFeedId =
  | "ace"    // A, C, E, S Rockaway
  | "bdfm"   // B, D, F, M, S Franklin
  | "g"      // G
  | "jz"     // J, Z
  | "nqrw"   // N, Q, R, W
  | "l"      // L
  | "1234567"// 1, 2, 3, 4, 5, 6, 7, S 42nd
  | "sir";   // Staten Island Railway

export const FEED_TO_LINES: Record<SubwayFeedId, SubwayLine[]> = {
  "ace": ["A", "C", "E"],
  "bdfm": ["B", "D", "F", "M"],
  "g": ["G"],
  "jz": ["J", "Z"],
  "nqrw": ["N", "Q", "R", "W"],
  "l": ["L"],
  "1234567": ["1", "2", "3", "4", "5", "6", "7", "S"],
  "sir": ["SIR"],
};

// ============================================================================
// Normalized Train Arrival
// ============================================================================

export interface TrainArrival {
  tripId: string;
  routeId: SubwayLine;
  direction: "N" | "S";
  headsign: string | null;

  // Stop info
  stopId: string;
  stationName: string;

  // Timing
  arrivalTime: Date;
  departureTime: Date | null;
  delay: number; // seconds, negative = early

  // Status
  isAssigned: boolean; // false = ghost train (scheduled but no real-time data)

  // Computed
  minutesAway: number;
}

// ============================================================================
// Normalized Service Alert
// ============================================================================

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

// ============================================================================
// Elevator/Escalator Status
// ============================================================================

export type EquipmentType = "ELEVATOR" | "ESCALATOR";

export interface EquipmentOutage {
  equipmentId: string;
  stationName: string;
  borough: string | null;
  equipmentType: EquipmentType;
  serving: string | null; // What the equipment serves
  adaCompliant: boolean;
  isActive: boolean; // true = working
  outageReason: string | null;
  outageStartTime: Date | null;
  estimatedReturn: Date | null;
  trainLines: string[];
}

// ============================================================================
// Bus Data
// ============================================================================

export interface BusArrival {
  vehicleId: string;
  tripId: string;
  routeId: string;
  headsign: string | null;

  // Position
  latitude: number | null;
  longitude: number | null;
  bearing: number | null;

  // Next stop
  nextStopId: string | null;
  nextStopName: string | null;
  arrivalTime: Date | null;
  distanceFromStop: number | null; // meters

  // Status
  progressStatus: string | null;
  minutesAway: number | null;
}

// ============================================================================
// Station Types
// ============================================================================

export interface StationInfo {
  id: string;
  gtfsStopId: string;
  name: string;
  borough: string | null;
  lines: SubwayLine[];
  latitude: number | null;
  longitude: number | null;
  adaAccessible: boolean;
  hasElevator: boolean;
  hasEscalator: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface StationArrivalsResponse {
  stationId: string;
  stationName: string;
  arrivals: {
    northbound: TrainArrival[];
    southbound: TrainArrival[];
  };
  lastUpdated: Date;
}

export interface LineArrivalsResponse {
  routeId: SubwayLine;
  arrivals: TrainArrival[];
  lastUpdated: Date;
}

// ============================================================================
// Crowding (Legacy - Simple)
// ============================================================================

export type CrowdingLevel = "LOW" | "MEDIUM" | "HIGH";

export interface RouteCrowding {
  routeId: SubwayLine;
  crowdingLevel: CrowdingLevel;
  avgHeadwayMin: number;
  timestamp: string;
}

// ============================================================================
// Crowding (Enhanced - Multi-Factor Segment-Level)
// ============================================================================

export type TransitMode = "subway" | "bus" | "lirr" | "metro-north";

export type Direction = "N" | "S" | "E" | "W" | "inbound" | "outbound";

/**
 * Contributing factors to crowding score
 * Each factor is normalized to 0-1 scale
 */
export interface CrowdingFactors {
  headway: number;    // 0 = frequent trains, 1 = long gaps
  demand: number;     // 0 = off-peak, 1 = peak demand
  delay: number;      // 0 = on-time, 1 = significant delays
  alerts: number;     // 0 = no alerts, 1 = severe disruptions
}

/**
 * Segment-level crowding data
 * Represents crowding along a portion of a transit line
 */
export interface SegmentCrowding {
  routeId: string;
  mode: TransitMode;
  direction: Direction;
  segmentId: string;
  segmentName: string;
  segmentStart: string;  // station ID
  segmentEnd: string;    // station ID
  crowdingLevel: CrowdingLevel;
  crowdingScore: number; // 0-100
  factors: CrowdingFactors;
  timestamp: string;
  stationsInSegment: string[]; // station IDs
}

/**
 * Line segment definition (static configuration)
 */
export interface LineSegment {
  id: string;
  name: string;
  stations: string[]; // station IDs in order
  branch?: string;    // for lines with branches (A train: Rockaway vs Far Rockaway)
}

/**
 * Network-wide crowding summary
 */
export interface NetworkCrowding {
  avgScore: number;
  avgLevel: CrowdingLevel;
  timestamp: string;
  routes: RouteCrowdingEnhanced[];
}

/**
 * Enhanced route crowding with segment breakdown
 */
export interface RouteCrowdingEnhanced {
  routeId: string;
  mode: TransitMode;
  avgScore: number;
  avgLevel: CrowdingLevel;
  segments: SegmentCrowding[];
  timestamp: string;
}

/**
 * Demand pattern data (from MTA Hourly Ridership API)
 */
export interface DemandPattern {
  stationComplex: string;
  hour: number;          // 0-23
  dayOfWeek: number;     // 0-6 (Sunday = 0)
  avgRidership: number;  // normalized 0-1
}

/**
 * Time context for crowding assessment
 */
export interface TimeContext {
  hour: number;
  dayOfWeek: number;
  isRushHour: boolean;
  isPeakDirection: boolean; // true if direction aligns with typical commute flow
  demandMultiplier: number; // 0-1 based on historical ridership
}

