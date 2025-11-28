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

