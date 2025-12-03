/**
 * MTA Bus Feed Client
 * Uses SIRI (Service Interface for Real-time Information) API for richer bus data
 * Falls back to static route data when API is unavailable
 */

import type { BusArrival } from "@/types/mta";
import { getAllKnownRoutes, getKnownRouteCount } from "@/lib/gtfs/bus-routes";

// ============================================================================
// Configuration
// ============================================================================

const SIRI_BASE_URL = "https://bustime.mta.info/api/siri";

/**
 * Check if bus API key is configured
 */
export function isBusApiConfigured(): boolean {
  return !!process.env.MTA_BUS_API_KEY;
}

function getBusApiKey(): string | null {
  return process.env.MTA_BUS_API_KEY ?? null;
}

// ============================================================================
// SIRI Response Types
// ============================================================================

interface SiriResponse {
  Siri: {
    ServiceDelivery: {
      ResponseTimestamp: string;
      VehicleMonitoringDelivery?: Array<{
        VehicleActivity?: VehicleActivity[];
        ResponseTimestamp: string;
        ValidUntil: string;
      }>;
      StopMonitoringDelivery?: Array<{
        MonitoredStopVisit?: MonitoredStopVisit[];
        ResponseTimestamp: string;
      }>;
    };
  };
}

interface VehicleActivity {
  MonitoredVehicleJourney: MonitoredVehicleJourney;
  RecordedAtTime: string;
}

interface MonitoredStopVisit {
  MonitoredVehicleJourney: MonitoredVehicleJourney;
  RecordedAtTime: string;
}

interface MonitoredVehicleJourney {
  LineRef: string;
  DirectionRef: string;
  FramedVehicleJourneyRef?: {
    DataFrameRef: string;
    DatedVehicleJourneyRef: string;
  };
  JourneyPatternRef?: string;
  PublishedLineName?: string;
  OperatorRef?: string;
  OriginRef?: string;
  DestinationRef?: string;
  DestinationName?: string;
  OriginAimedDepartureTime?: string;
  SituationRef?: Array<{ SituationSimpleRef: string }>;
  Monitored?: boolean;
  VehicleLocation?: {
    Longitude: number;
    Latitude: number;
  };
  Bearing?: number;
  ProgressRate?: string;
  ProgressStatus?: string;
  BlockRef?: string;
  VehicleRef?: string;
  MonitoredCall?: {
    StopPointRef?: string;
    StopPointName?: string;
    VehicleLocationAtStop?: string;
    VehicleAtStop?: boolean;
    DestinationDisplay?: string;
    AimedArrivalTime?: string;
    ExpectedArrivalTime?: string;
    AimedDepartureTime?: string;
    ExpectedDepartureTime?: string;
    ArrivalProximityText?: string;
    DistanceFromStop?: number;
    NumberOfStopsAway?: number;
    Extensions?: {
      Distances?: {
        PresentableDistance?: string;
        DistanceFromCall?: number;
        StopsFromCall?: number;
        CallDistanceAlongRoute?: number;
      };
    };
  };
  OnwardCalls?: {
    OnwardCall?: Array<{
      StopPointRef?: string;
      StopPointName?: string;
      ExpectedArrivalTime?: string;
      ExpectedDepartureTime?: string;
      Extensions?: {
        Distances?: {
          PresentableDistance?: string;
          DistanceFromCall?: number;
          StopsFromCall?: number;
        };
      };
    }>;
  };
}

// ============================================================================
// SIRI API Functions
// ============================================================================

/**
 * Fetch vehicle monitoring data from SIRI API
 * Returns all active buses or filtered by route
 */
export async function fetchSiriVehicleMonitoring(options?: {
  routeId?: string;
  maxVehicles?: number;
}): Promise<SiriResponse | null> {
  const apiKey = getBusApiKey();
  if (!apiKey) {
    console.warn("Bus API key not configured");
    return null;
  }

  const params = new URLSearchParams({
    key: apiKey,
  });

  if (options?.routeId) {
    // LineRef format: "MTA NYCT_M15" or just "M15"
    const lineRef = options.routeId.includes("_") 
      ? options.routeId 
      : `MTA NYCT_${options.routeId}`;
    params.set("LineRef", lineRef);
  }

  if (options?.maxVehicles) {
    params.set("MaximumVehicles", String(options.maxVehicles));
  }

  const url = `${SIRI_BASE_URL}/vehicle-monitoring.json?${params}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      console.error(`SIRI vehicle monitoring failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching SIRI vehicle monitoring:", error);
    return null;
  }
}

/**
 * Fetch stop monitoring data from SIRI API
 * Returns arrivals at a specific stop
 */
export async function fetchSiriStopMonitoring(options: {
  stopId?: string;
  routeId?: string;
  maxStopVisits?: number;
}): Promise<SiriResponse | null> {
  const apiKey = getBusApiKey();
  if (!apiKey) {
    console.warn("Bus API key not configured");
    return null;
  }

  const params = new URLSearchParams({
    key: apiKey,
  });

  if (options.stopId) {
    // StopRef format: "MTA_308215" or just the stop ID
    const stopRef = options.stopId.includes("_")
      ? options.stopId
      : `MTA_${options.stopId}`;
    params.set("MonitoringRef", stopRef);
  }

  if (options.routeId) {
    const lineRef = options.routeId.includes("_")
      ? options.routeId
      : `MTA NYCT_${options.routeId}`;
    params.set("LineRef", lineRef);
  }

  if (options.maxStopVisits) {
    params.set("MaximumStopVisits", String(options.maxStopVisits));
  }

  const url = `${SIRI_BASE_URL}/stop-monitoring.json?${params}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      console.error(`SIRI stop monitoring failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching SIRI stop monitoring:", error);
    return null;
  }
}

// ============================================================================
// Data Extraction
// ============================================================================

/**
 * Extract route ID from LineRef (e.g., "MTA NYCT_M15" -> "M15")
 */
function extractRouteId(lineRef: string): string {
  return lineRef.split("_").pop() ?? lineRef;
}

/**
 * Parse SIRI vehicle activity into BusArrival format
 */
function parseVehicleActivity(activity: VehicleActivity): BusArrival | null {
  const journey = activity.MonitoredVehicleJourney;
  if (!journey) return null;

  const routeId = extractRouteId(journey.LineRef);
  const monitoredCall = journey.MonitoredCall;
  
  // Parse arrival time
  let arrivalTime: Date | null = null;
  let minutesAway: number | null = null;
  
  if (monitoredCall?.ExpectedArrivalTime) {
    arrivalTime = new Date(monitoredCall.ExpectedArrivalTime);
    minutesAway = Math.round((arrivalTime.getTime() - Date.now()) / 60000);
  }

  return {
    vehicleId: journey.VehicleRef ?? "",
    tripId: journey.FramedVehicleJourneyRef?.DatedVehicleJourneyRef ?? "",
    routeId,
    headsign: journey.DestinationName ?? null,
    latitude: journey.VehicleLocation?.Latitude ?? null,
    longitude: journey.VehicleLocation?.Longitude ?? null,
    bearing: journey.Bearing ?? null,
    nextStopId: monitoredCall?.StopPointRef?.split("_").pop() ?? null,
    nextStopName: monitoredCall?.StopPointName ?? null,
    arrivalTime,
    distanceFromStop: monitoredCall?.DistanceFromStop ?? 
      monitoredCall?.Extensions?.Distances?.DistanceFromCall ?? null,
    progressStatus: monitoredCall?.ArrivalProximityText ?? 
      journey.ProgressStatus ?? null,
    minutesAway,
  };
}

/**
 * Parse SIRI stop visit into BusArrival format
 */
function parseStopVisit(visit: MonitoredStopVisit): BusArrival | null {
  return parseVehicleActivity(visit as VehicleActivity);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get bus arrivals using SIRI API
 * Can filter by route and/or stop
 */
export async function getBusArrivals(options?: {
  routeId?: string;
  stopId?: string;
  limit?: number;
}): Promise<BusArrival[]> {
  const arrivals: BusArrival[] = [];

  // If stopId is provided, use stop monitoring (more accurate for arrivals)
  if (options?.stopId) {
    const response = await fetchSiriStopMonitoring({
      stopId: options.stopId,
      routeId: options.routeId,
      maxStopVisits: options?.limit ?? 20,
    });

    if (response?.Siri?.ServiceDelivery?.StopMonitoringDelivery) {
      for (const delivery of response.Siri.ServiceDelivery.StopMonitoringDelivery) {
        if (delivery.MonitoredStopVisit) {
          for (const visit of delivery.MonitoredStopVisit) {
            const arrival = parseStopVisit(visit);
            if (arrival) arrivals.push(arrival);
          }
        }
      }
    }
  } else {
    // Use vehicle monitoring for route-wide or all buses view
    const response = await fetchSiriVehicleMonitoring({
      routeId: options?.routeId,
      maxVehicles: options?.limit ?? 100,
    });

    if (response?.Siri?.ServiceDelivery?.VehicleMonitoringDelivery) {
      for (const delivery of response.Siri.ServiceDelivery.VehicleMonitoringDelivery) {
        if (delivery.VehicleActivity) {
          for (const activity of delivery.VehicleActivity) {
            const arrival = parseVehicleActivity(activity);
            if (arrival) arrivals.push(arrival);
          }
        }
      }
    }
  }

  // Sort by arrival time (earliest first), with null times at end
  arrivals.sort((a, b) => {
    if (!a.arrivalTime && !b.arrivalTime) return 0;
    if (!a.arrivalTime) return 1;
    if (!b.arrivalTime) return -1;
    return a.arrivalTime.getTime() - b.arrivalTime.getTime();
  });

  // Apply limit
  if (options?.limit) {
    return arrivals.slice(0, options.limit);
  }

  return arrivals;
}

/**
 * Get all active bus routes from current vehicle data
 * Falls back to static known routes if API fails
 */
export async function getActiveBusRoutes(): Promise<{ routes: string[]; isLive: boolean }> {
  try {
    const response = await fetchSiriVehicleMonitoring({
      maxVehicles: 500,
    });

    if (!response?.Siri?.ServiceDelivery?.VehicleMonitoringDelivery) {
      // Fall back to static data
      return { routes: getAllKnownRoutes(), isLive: false };
    }

    const routes = new Set<string>();

    for (const delivery of response.Siri.ServiceDelivery.VehicleMonitoringDelivery) {
      if (delivery.VehicleActivity) {
        for (const activity of delivery.VehicleActivity) {
          const routeId = extractRouteId(activity.MonitoredVehicleJourney.LineRef);
          routes.add(routeId);
        }
      }
    }

    if (routes.size === 0) {
      // Fall back to static data
      return { routes: getAllKnownRoutes(), isLive: false };
    }

    // Sort routes naturally (M1, M2, M10, M100, etc.)
    const sortedRoutes = Array.from(routes).sort((a, b) => {
      const aPrefix = a.match(/^[A-Z]+/)?.[0] ?? "";
      const bPrefix = b.match(/^[A-Z]+/)?.[0] ?? "";
      if (aPrefix !== bPrefix) return aPrefix.localeCompare(bPrefix);
      const aNum = parseInt(a.replace(/^[A-Z]+/, "")) || 0;
      const bNum = parseInt(b.replace(/^[A-Z]+/, "")) || 0;
      return aNum - bNum;
    });

    return { routes: sortedRoutes, isLive: true };
  } catch (error) {
    console.error("Failed to fetch active bus routes:", error);
    // Fall back to static data
    return { routes: getAllKnownRoutes(), isLive: false };
  }
}

/**
 * Get bus count by route (for dashboard summary)
 * Falls back to static data if API unavailable
 */
export async function getBusSummary(): Promise<{
  totalBuses: number;
  activeRoutes: string[];
  byRouteGroup: Record<string, number>;
  isLive: boolean;
}> {
  try {
    const response = await fetchSiriVehicleMonitoring({
      maxVehicles: 1000,
    });

    const routeCounts = new Map<string, number>();
    const routeGroupCounts: Record<string, number> = {};
    let totalBuses = 0;

    if (response?.Siri?.ServiceDelivery?.VehicleMonitoringDelivery) {
      for (const delivery of response.Siri.ServiceDelivery.VehicleMonitoringDelivery) {
        if (delivery.VehicleActivity) {
          for (const activity of delivery.VehicleActivity) {
            totalBuses++;
            const routeId = extractRouteId(activity.MonitoredVehicleJourney.LineRef);
            routeCounts.set(routeId, (routeCounts.get(routeId) ?? 0) + 1);

            // Group by prefix (M, B, Q, BX, S, etc.)
            const prefix = routeId.match(/^[A-Z]+/)?.[0] ?? "OTHER";
            routeGroupCounts[prefix] = (routeGroupCounts[prefix] ?? 0) + 1;
          }
        }
      }
    }

    if (totalBuses === 0) {
      // Fall back to static data (no live counts available)
      return {
        totalBuses: 0,
        activeRoutes: getAllKnownRoutes(),
        byRouteGroup: {},
        isLive: false,
      };
    }

    const activeRoutes = Array.from(routeCounts.keys()).sort((a, b) => {
      const aPrefix = a.match(/^[A-Z]+/)?.[0] ?? "";
      const bPrefix = b.match(/^[A-Z]+/)?.[0] ?? "";
      if (aPrefix !== bPrefix) return aPrefix.localeCompare(bPrefix);
      const aNum = parseInt(a.replace(/^[A-Z]+/, "")) || 0;
      const bNum = parseInt(b.replace(/^[A-Z]+/, "")) || 0;
      return aNum - bNum;
    });

    return {
      totalBuses,
      activeRoutes,
      byRouteGroup: routeGroupCounts,
      isLive: true,
    };
  } catch (error) {
    console.error("Failed to fetch bus summary:", error);
    // Fall back to static data
    return {
      totalBuses: 0,
      activeRoutes: getAllKnownRoutes(),
      byRouteGroup: {},
      isLive: false,
    };
  }
}

/**
 * Get static route count (for display when API unavailable)
 */
export function getStaticRouteCount(): number {
  return getKnownRouteCount();
}
