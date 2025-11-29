/**
 * Accessible Routes API
 * GET /api/routes/accessible
 * 
 * Finds accessible routes between two subway stations.
 * Takes into account elevator outages, real-time train data, and calculates travel times.
 * 
 * Query Parameters:
 * - from: Origin station ID (required)
 * - to: Destination station ID (required)
 * - requireAccessible: If "true", only return fully accessible routes
 * - useRealtime: If "true" (default), include real-time train departures
 */

import { NextRequest, NextResponse } from "next/server";
import { findRoutes, buildStationGraph } from "@/lib/routing";
import { fetchCurrentOutages, fetchAllSubwayFeeds, extractArrivals } from "@/lib/mta";
import { getStationById } from "@/lib/gtfs";
import { updateTravelTimeCache, getCachedTravelTimes } from "@/lib/routing/realtime";
import type { AccessibleRouteResponse, ApiResponse, ApiErrorResponse, AccessibleRoute, RealtimeDeparture } from "@/types/api";
import type { TrainArrival } from "@/types/mta";

export const dynamic = "force-dynamic";
export const revalidate = 30; // Cache for 30 seconds (real-time data)

/**
 * Fetch all subway arrivals from GTFS-RT feeds
 */
async function fetchAllArrivals(): Promise<TrainArrival[]> {
  const allArrivals: TrainArrival[] = [];
  
  try {
    const feeds = await fetchAllSubwayFeeds();
    
    for (const [, feed] of feeds) {
      const arrivals = extractArrivals(feed, {});
      allArrivals.push(...arrivals);
    }
    
    return allArrivals;
  } catch (error) {
    console.error("Error fetching arrivals:", error);
    return [];
  }
}

/**
 * Fetch upcoming train departures for a station/line combination
 */
async function getUpcomingDepartures(
  stationId: string,
  lines: string[],
  allArrivals: TrainArrival[]
): Promise<RealtimeDeparture[]> {
  const departures: RealtimeDeparture[] = [];
  
  try {
    // Filter arrivals for our station and lines
    const stationArrivals = allArrivals.filter(a => {
      const matchesStation = a.stopId.startsWith(stationId) || 
        a.stopId === `${stationId}N` || 
        a.stopId === `${stationId}S`;
      const matchesLine = lines.length === 0 || lines.includes(a.routeId);
      return matchesStation && matchesLine;
    });
    
    for (const arrival of stationArrivals.slice(0, 10)) {
      departures.push({
        line: arrival.routeId,
        direction: arrival.direction,
        destination: arrival.headsign || "Unknown",
        departureTime: arrival.arrivalTime.toISOString(),
        minutesAway: arrival.minutesAway,
        isRealtime: true,
      });
    }
    
    // Sort by departure time
    departures.sort((a, b) => 
      new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
    );
    
    return departures.slice(0, 5); // Return top 5 departures
  } catch (error) {
    console.error("Error fetching departures:", error);
    return [];
  }
}

/**
 * Add departure times to route based on real-time data
 */
function addDeparturesToRoute(
  route: AccessibleRoute,
  departures: RealtimeDeparture[]
): AccessibleRoute {
  if (!route.segments.length || !departures.length) {
    return route;
  }
  
  // Find the first train segment to get the line we need
  const firstTrainSegment = route.segments.find(s => s.line !== "TRANSFER");
  if (!firstTrainSegment) {
    return route;
  }
  
  // Find a matching departure for the first segment's line
  const matchingDeparture = departures.find(d => d.line === firstTrainSegment.line);
  
  if (matchingDeparture) {
    // Calculate arrival times for each segment
    const departureTime = new Date(matchingDeparture.departureTime);
    let currentTime = departureTime;
    
    const updatedSegments = route.segments.map((segment, idx) => {
      const segmentDeparture = idx === 0 ? departureTime.toISOString() : currentTime.toISOString();
      currentTime = new Date(currentTime.getTime() + segment.travelMinutes * 60000);
      
      return {
        ...segment,
        departureTime: segmentDeparture,
        arrivalTime: currentTime.toISOString(),
      };
    });
    
    return {
      ...route,
      segments: updatedSegments,
      departureTime: departureTime.toISOString(),
      arrivalTime: currentTime.toISOString(),
    };
  }
  
  return route;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AccessibleRouteResponse> | ApiErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;
  
  // Parse query parameters
  const fromStationId = searchParams.get("from");
  const toStationId = searchParams.get("to");
  const requireAccessible = searchParams.get("requireAccessible") === "true";
  const useRealtime = searchParams.get("useRealtime") !== "false"; // Default to true

  // Validate required parameters
  if (!fromStationId || !toStationId) {
    return NextResponse.json({
      success: false,
      data: null,
      error: "Both 'from' and 'to' station IDs are required",
      timestamp: new Date().toISOString(),
    }, { status: 400 });
  }

  try {
    // Fetch current elevator outages
    const outages = await fetchCurrentOutages();
    
    // Get station info
    const fromStation = getStationById(fromStationId);
    const toStation = getStationById(toStationId);
    
    if (!fromStation) {
      return NextResponse.json({
        success: false,
        data: null,
        error: `Origin station not found: ${fromStationId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }
    
    if (!toStation) {
      return NextResponse.json({
        success: false,
        data: null,
        error: `Destination station not found: ${toStationId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }
    
    // Fetch real-time data if enabled
    let realtimeTimes: Map<string, number> | undefined;
    let originDepartures: RealtimeDeparture[] = [];
    
    if (useRealtime) {
      try {
        // Get all arrivals for travel time calculation
        const allArrivals = await fetchAllArrivals();
        updateTravelTimeCache(allArrivals);
        realtimeTimes = getCachedTravelTimes();
        
        // Build graph to get lines at origin station
        const graph = buildStationGraph(outages);
        const originNode = graph.nodes.get(fromStationId);
        
        if (originNode && originNode.lines.length > 0) {
          originDepartures = await getUpcomingDepartures(fromStationId, originNode.lines, allArrivals);
        }
      } catch (realtimeError) {
        console.warn("Could not fetch real-time data, using estimates:", realtimeError);
      }
    }
    
    // Find routes with real-time data when available
    const { primary, alternatives, warnings } = findRoutes(
      fromStationId,
      toStationId,
      outages,
      { maxAlternatives: 3, realtimeTimes }
    );
    
    // Filter to accessible only if requested
    let filteredPrimary = primary;
    let filteredAlternatives = alternatives;
    
    if (requireAccessible) {
      if (primary && !primary.isFullyAccessible) {
        // Try to use an accessible alternative as primary
        const accessibleAlt = alternatives.find(a => a.isFullyAccessible);
        if (accessibleAlt) {
          filteredPrimary = accessibleAlt;
          filteredAlternatives = alternatives.filter(a => a !== accessibleAlt && a.isFullyAccessible);
        } else {
          filteredPrimary = null;
          filteredAlternatives = [];
        }
      } else {
        filteredAlternatives = alternatives.filter(a => a.isFullyAccessible);
      }
    }
    
    // Add departure times to routes
    if (filteredPrimary && originDepartures.length > 0) {
      filteredPrimary = addDeparturesToRoute(filteredPrimary, originDepartures);
    }
    
    filteredAlternatives = filteredAlternatives.map(alt => 
      originDepartures.length > 0 ? addDeparturesToRoute(alt, originDepartures) : alt
    );

    const response: AccessibleRouteResponse = {
      primary: filteredPrimary,
      alternatives: filteredAlternatives,
      warnings,
      fromStation: {
        id: fromStationId,
        name: fromStation.name,
      },
      toStation: {
        id: toStationId,
        name: toStation.name,
      },
      departures: originDepartures,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error finding accessible route:", error);
    
    return NextResponse.json({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Failed to find accessible route",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

