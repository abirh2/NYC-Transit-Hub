/**
 * MTA Bus Feed Client
 * Uses SIRI (Service Interface for Real-time Information) API for richer bus data
 * Falls back to static route data when API is unavailable
 */

import type { BusArrival } from "@/types/mta";
import { getAllKnownRoutes, getKnownRouteCount } from "@/lib/gtfs/bus-routes";
import { normalizeSiriActivities } from "@/lib/transit/bus-adapter";
import { toLegacyBusArrivals } from "@/lib/transit/legacy";
import type { RealtimeSnapshot } from "@/types/transit";
import { z } from "zod";
import { TRANSIT_CACHE_SECONDS } from "@/lib/transit/cache-policy";

// ============================================================================
// Configuration
// ============================================================================

const SIRI_BASE_URL = "https://bustime.mta.info/api/siri";

const SiriTextSchema = z.union([
  z.string(),
  z.array(z.union([
    z.string(),
    z.object({ value: z.string() }).passthrough(),
  ])).min(1),
]).transform((value) => {
  if (typeof value === "string") return value;
  const first = value[0];
  return typeof first === "string" ? first : first.value;
});

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

const SiriCallSchema = z.object({
  StopPointRef: z.string().optional(),
  StopPointName: SiriTextSchema.optional(),
  VehicleAtStop: z.boolean().optional(),
  ExpectedArrivalTime: z.string().optional(),
  AimedArrivalTime: z.string().optional(),
  ExpectedDepartureTime: z.string().optional(),
  AimedDepartureTime: z.string().optional(),
  ArrivalProximityText: SiriTextSchema.optional(),
  DistanceFromStop: z.number().optional(),
  NumberOfStopsAway: z.number().optional(),
  Extensions: z.object({
    Distances: z.object({
      DistanceFromCall: z.number().optional(),
      PresentableDistance: z.string().optional(),
      StopsFromCall: z.number().optional(),
      CallDistanceAlongRoute: z.number().optional(),
    }).passthrough().optional(),
  }).passthrough().optional(),
}).passthrough();

const MonitoredVehicleJourneySchema = z.object({
  LineRef: z.string(),
  DirectionRef: z.string(),
  FramedVehicleJourneyRef: z.object({
    DataFrameRef: z.string(),
    DatedVehicleJourneyRef: z.string(),
  }).optional(),
  JourneyPatternRef: z.string().optional(),
  DestinationName: SiriTextSchema.optional(),
  VehicleLocation: z.object({
    Longitude: z.number(),
    Latitude: z.number(),
  }).optional(),
  Bearing: z.number().optional(),
  ProgressStatus: SiriTextSchema.optional(),
  VehicleRef: z.string().optional(),
  MonitoredCall: SiriCallSchema.optional(),
  OnwardCalls: z.object({
    OnwardCall: z.array(SiriCallSchema).optional(),
  }).optional(),
}).passthrough();

const SiriActivitySchema = z.object({
  MonitoredVehicleJourney: MonitoredVehicleJourneySchema,
  RecordedAtTime: z.string(),
}).passthrough();

const SiriResponseSchema = z.object({
  Siri: z.object({
    ServiceDelivery: z.object({
      ResponseTimestamp: z.string(),
      VehicleMonitoringDelivery: z.array(z.object({
        VehicleActivity: z.array(SiriActivitySchema).optional(),
        ResponseTimestamp: z.string(),
        ValidUntil: z.string(),
      }).passthrough()).optional(),
      StopMonitoringDelivery: z.array(z.object({
        MonitoredStopVisit: z.array(SiriActivitySchema).optional(),
        ResponseTimestamp: z.string(),
      }).passthrough()).optional(),
    }).passthrough(),
  }).passthrough(),
}).passthrough();

export function parseSiriResponse(data: unknown): SiriResponse | null {
  const result = SiriResponseSchema.safeParse(data);
  if (!result.success) {
    console.error("Malformed SIRI response", result.error.issues);
    return null;
  }
  return result.data as SiriResponse;
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
      // Large responses (>2MB) can't use Next.js cache, use no-store for those
      cache: options?.maxVehicles && options.maxVehicles > 500 ? "no-store" : undefined,
      next: options?.maxVehicles && options.maxVehicles > 500
        ? undefined
        : { revalidate: TRANSIT_CACHE_SECONDS.realtime },
    });

    if (!response.ok) {
      console.error(`SIRI vehicle monitoring failed: ${response.status}`);
      return null;
    }

    return parseSiriResponse(await response.json());
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
  stopId: string;
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
    version: "2",
    OperatorRef: "MTA",
    StopMonitoringDetailLevel: "calls",
    MaximumNumberOfCallsOnwards: "6",
  });

  // StopRef format: "MTA_308215" or just the stop ID
  const stopRef = options.stopId.includes("_")
    ? options.stopId
    : `MTA_${options.stopId}`;
  params.set("MonitoringRef", stopRef);

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
      next: { revalidate: TRANSIT_CACHE_SECONDS.realtime },
    });

    if (!response.ok) {
      console.error(`SIRI stop monitoring failed: ${response.status}`);
      return null;
    }

    return parseSiriResponse(await response.json());
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
  return toLegacyBusArrivals(await getBusRealtimeSnapshot(options));
}

/**
 * Fetch bus data once and expose the normalized trip/departure/vehicle graph.
 * `getBusArrivals` above remains as a compatibility projection.
 */
export async function getBusRealtimeSnapshot(options?: {
  routeId?: string;
  stopId?: string;
  limit?: number;
}): Promise<RealtimeSnapshot> {
  const activities: VehicleActivity[] = [];
  let upstreamAvailable = false;

  // If stopId is provided, use stop monitoring (more accurate for arrivals)
  if (options?.stopId) {
    const response = await fetchSiriStopMonitoring({
      stopId: options.stopId,
      routeId: options.routeId,
      maxStopVisits: options?.limit ?? 20,
    });
    upstreamAvailable = response !== null;

    if (response?.Siri?.ServiceDelivery?.StopMonitoringDelivery) {
      for (const delivery of response.Siri.ServiceDelivery.StopMonitoringDelivery) {
        if (delivery.MonitoredStopVisit) {
          for (const visit of delivery.MonitoredStopVisit) {
            activities.push(visit as VehicleActivity);
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
    upstreamAvailable = response !== null;

    if (response?.Siri?.ServiceDelivery?.VehicleMonitoringDelivery) {
      for (const delivery of response.Siri.ServiceDelivery.VehicleMonitoringDelivery) {
        if (delivery.VehicleActivity) {
          for (const activity of delivery.VehicleActivity) {
            activities.push(activity);
          }
        }
      }
    }
  }

  const snapshot = normalizeSiriActivities(activities, {
    monitoredStopId: options?.stopId,
  });
  const sourceState = upstreamAvailable ? snapshot.sourceState : "unavailable";

  const trips = snapshot.trips.filter(
    (trip) => !options?.routeId || trip.route.id === options.routeId,
  );
  const allowedTripIds = new Set(trips.map((trip) => trip.id));
  const departures = snapshot.departures
    .filter(
      (departure) =>
        allowedTripIds.has(departure.tripId) &&
        (!options?.stopId || departure.stopId === options.stopId),
    )
    .slice(0, options?.limit);
  const visibleTripIds = options?.stopId
    ? new Set(departures.map((departure) => departure.tripId))
    : allowedTripIds;

  return {
    ...snapshot,
    sourceState,
    trips: trips.filter((trip) => visibleTripIds.has(trip.id)),
    departures,
    vehicles: snapshot.vehicles.filter(
      (vehicle) =>
        vehicle.tripId !== null && visibleTripIds.has(vehicle.tripId),
    ),
  };
}

/**
 * Get all active bus routes from current vehicle data
 * Merges live data with static known routes for completeness
 */
export async function getActiveBusRoutes(): Promise<{ routes: string[]; isLive: boolean }> {
  try {
    const response = await fetchSiriVehicleMonitoring({
      maxVehicles: 2000, // Increased to capture more routes
    });

    if (!response?.Siri?.ServiceDelivery?.VehicleMonitoringDelivery) {
      // Fall back to static data
      return { routes: getAllKnownRoutes(), isLive: false };
    }

    // Start with all known static routes
    const routes = new Set<string>(getAllKnownRoutes());

    // Add any live routes (in case there are new routes not in static data)
    for (const delivery of response.Siri.ServiceDelivery.VehicleMonitoringDelivery) {
      if (delivery.VehicleActivity) {
        for (const activity of delivery.VehicleActivity) {
          const routeId = extractRouteId(activity.MonitoredVehicleJourney.LineRef);
          routes.add(routeId);
        }
      }
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
