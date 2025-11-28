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

