/**
 * API Request/Response Type Definitions
 */

import type { ServiceAlert, TrainArrival, EquipmentOutage, BusArrival, StationInfo } from "./mta";

// ============================================================================
// Generic API Response Wrapper
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  error: string;
  timestamp: string;
}

// ============================================================================
// Train Realtime API
// ============================================================================

export interface TrainRealtimeRequest {
  stationId?: string;
  routeId?: string;
  direction?: "N" | "S";
  limit?: number;
}

export interface TrainRealtimeResponse {
  arrivals: TrainArrival[];
  stationName?: string;
  lastUpdated: string;
}

// ============================================================================
// Alerts API
// ============================================================================

export interface AlertsRequest {
  routeId?: string;
  severity?: "INFO" | "WARNING" | "SEVERE";
  active?: boolean;
  limit?: number;
}

export interface AlertsResponse {
  alerts: ServiceAlert[];
  totalCount: number;
  lastUpdated: string;
}

// ============================================================================
// Incidents API
// ============================================================================

export interface IncidentsRequest {
  routeId?: string;
  alertType?: "DELAY" | "DETOUR" | "STATION_CLOSURE" | "PLANNED_WORK" | "SERVICE_CHANGE" | "REDUCED_SERVICE" | "SHUTTLE_BUS" | "OTHER";
  severity?: "INFO" | "WARNING" | "SEVERE";
  from?: string; // ISO date string
  to?: string;   // ISO date string
  activeOnly?: boolean;
  limit?: number;
}

export interface IncidentStats {
  total: number;
  byLine: Array<{ line: string; count: number }>;
  byType: Array<{ type: string; count: number }>;
  bySeverity: {
    severe: number;
    warning: number;
    info: number;
  };
}

export interface IncidentsResponse {
  incidents: ServiceAlert[];
  stats: IncidentStats;
  lastUpdated: string;
}

// ============================================================================
// Elevator/Escalator API
// ============================================================================

export interface ElevatorsRequest {
  stationId?: string;
  isActive?: boolean; // false = show outages only
  equipmentType?: "ELEVATOR" | "ESCALATOR";
  limit?: number;
}

export interface ElevatorsResponse {
  equipment: EquipmentOutage[];
  totalOutages: number;
  lastUpdated: string;
}

// ============================================================================
// Stations API
// ============================================================================

export interface StationsRequest {
  borough?: string;
  line?: string;
  adaAccessible?: boolean;
  search?: string;
  limit?: number;
}

export interface StationsResponse {
  stations: StationInfo[];
  totalCount: number;
}

// ============================================================================
// Bus Realtime API
// ============================================================================

export interface BusRealtimeRequest {
  routeId?: string;
  stopId?: string;
  limit?: number;
}

export interface BusRealtimeResponse {
  arrivals: BusArrival[];
  stopName?: string;
  lastUpdated: string;
}

// ============================================================================
// Ingestion API Responses
// ============================================================================

export interface IngestResponse {
  success: boolean;
  feedId: string;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  errors: string[];
  duration: number; // milliseconds
  timestamp: string;
}

// ============================================================================
// System Status
// ============================================================================

export interface FeedStatusInfo {
  id: string;
  name: string;
  lastFetch: string | null;
  lastSuccess: string | null;
  lastError: string | null;
  recordCount: number;
  isHealthy: boolean;
}

export interface SystemStatusResponse {
  feeds: FeedStatusInfo[];
  overallHealth: "healthy" | "degraded" | "down";
  lastUpdated: string;
}

// ============================================================================
// Reliability API
// ============================================================================

export interface DailyLineMetricsData {
  date: string; // ISO date string
  routeId: string;
  totalIncidents: number;
  delayCount: number;
  severeCount: number;
  serviceChangeCount: number;
  plannedWorkCount: number;
  amRushIncidents: number;
  middayIncidents: number;
  pmRushIncidents: number;
  eveningIncidents: number;
  nightIncidents: number;
}

export interface LineReliabilitySummary {
  routeId: string;
  totalIncidents: number;
  delayCount: number;
  severeCount: number;
  avgIncidentsPerDay: number;
  reliabilityScore: number; // 0-100, higher is better
}

export interface TimeOfDayBreakdown {
  period: "amRush" | "midday" | "pmRush" | "evening" | "night";
  label: string;
  totalIncidents: number;
  hours: string;
}

export interface ReliabilityRequest {
  routeId?: string;
  days?: number; // default 30
}

export interface ReliabilityResponse {
  // Summary stats
  totalIncidents: number;
  periodDays: number;
  dataStartDate: string | null;
  hasHistoricalData: boolean;
  
  // Per-line breakdown
  byLine: LineReliabilitySummary[];
  
  // Time-of-day breakdown (aggregated across all lines or filtered line)
  byTimeOfDay: TimeOfDayBreakdown[];
  
  // Daily trend data (for charts)
  dailyTrend: Array<{
    date: string;
    totalIncidents: number;
    delayCount: number;
    severeCount: number;
  }>;
  
  // Live alerts fallback (when no historical data)
  liveAlerts?: {
    total: number;
    byLine: Array<{ line: string; count: number }>;
  };
  
  lastUpdated: string;
}

// ============================================================================
// Accessible Routing API
// ============================================================================

export interface AccessibleRouteRequest {
  fromStation: string;
  toStation: string;
  departureTime?: string; // ISO date string, defaults to now
  requireAccessible?: boolean; // If true, only return fully accessible routes
}

export interface RouteSegment {
  fromStationId: string;
  fromStationName: string;
  toStationId: string;
  toStationName: string;
  line: string;
  isExpress: boolean;
  travelMinutes: number;
  isAccessible: boolean;
  hasElevatorOutage: boolean;
  // Real-time timing (when available)
  departureTime?: string; // ISO string
  arrivalTime?: string;   // ISO string
}

export interface AccessibleRoute {
  segments: RouteSegment[];
  totalMinutes: number;
  isFullyAccessible: boolean;
  blockedStations: Array<{
    stationId: string;
    stationName: string;
    outageReason: string | null;
  }>;
  transferCount: number;
  // Real-time timing for entire route (when available)
  departureTime?: string; // ISO string - when to catch the first train
  arrivalTime?: string;   // ISO string - estimated arrival at destination
}

export interface RealtimeDeparture {
  line: string;
  direction: string;
  destination: string;
  departureTime: string; // ISO string
  minutesAway: number;
  isRealtime: boolean;
}

export interface AccessibleRouteResponse {
  primary: AccessibleRoute | null;
  alternatives: AccessibleRoute[];
  warnings: string[];
  fromStation: {
    id: string;
    name: string;
  };
  toStation: {
    id: string;
    name: string;
  };
  // Real-time departures from origin station
  departures?: RealtimeDeparture[];
  lastUpdated: string;
}

// ============================================================================
// Outage Stats for Accessibility Page
// ============================================================================

export interface OutageStats {
  totalOutages: number;
  elevatorOutages: number;
  escalatorOutages: number;
  adaImpactingOutages: number;
  byBorough: Array<{ borough: string; count: number }>;
  byLine: Array<{ line: string; count: number }>;
}

// ============================================================================
// Commute API
// ============================================================================

export interface CommuteSettings {
  homeAddress: string | null;
  homeLat: number | null;
  homeLon: number | null;
  workAddress: string | null;
  workLat: number | null;
  workLon: number | null;
  targetArrival: string | null; // HH:MM in 24h format
}

export interface CommuteSettingsResponse {
  isConfigured: boolean;
  settings: CommuteSettings | null;
}

export interface CommuteSummaryResponse {
  isAuthenticated: boolean;
  isConfigured: boolean;
  leaveIn: string | null;        // "6 min", "Now", "1h 5m"
  leaveAt: string | null;        // ISO timestamp
  arriveBy: string | null;       // "9:00 AM"
  duration: number | null;       // minutes
  route: string | null;          // "F → A → 1"
  status: "on_time" | "delayed" | "early" | null;
  delayMinutes: number | null;
  targetArrival?: string | null; // "9:00 AM"
  error?: string;
}
