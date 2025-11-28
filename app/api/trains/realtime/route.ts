/**
 * Real-time Train Arrivals API
 * GET /api/trains/realtime
 * 
 * Returns upcoming train arrivals.
 * Fetches directly from MTA GTFS-RT feeds.
 * 
 * Query Parameters:
 * - stationId: Filter by station ID (e.g., "A15N")
 * - routeId: Filter by route/line (e.g., "A", "F", "1")
 * - direction: Filter by direction ("N" or "S")
 * - limit: Maximum number of results (default: 20)
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchAllSubwayFeeds, extractArrivals } from "@/lib/mta";
import type { TrainRealtimeResponse, ApiResponse, ApiErrorResponse } from "@/types/api";
import type { TrainArrival } from "@/types/mta";

export const dynamic = "force-dynamic";
export const revalidate = 30; // Cache for 30 seconds

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<TrainRealtimeResponse> | ApiErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;
  
  // Parse query parameters
  const stationId = searchParams.get("stationId") ?? undefined;
  const routeId = searchParams.get("routeId") ?? undefined;
  const direction = searchParams.get("direction") as "N" | "S" | undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 20;

  try {
    // Fetch all subway feeds
    const feeds = await fetchAllSubwayFeeds();
    
    if (feeds.size === 0) {
      return NextResponse.json({
        success: false,
        data: null,
        error: "Failed to fetch subway feeds",
        timestamp: new Date().toISOString(),
      }, { status: 503 });
    }

    // Extract arrivals from all feeds
    let allArrivals: TrainArrival[] = [];
    
    for (const [, feed] of feeds) {
      const arrivals = extractArrivals(feed, {
        stationId,
        routeId,
        limit: limit * 2, // Get extra for filtering
      });
      allArrivals = allArrivals.concat(arrivals);
    }

    // Apply direction filter
    if (direction) {
      allArrivals = allArrivals.filter(a => a.direction === direction);
    }

    // Sort by arrival time
    allArrivals.sort((a, b) => a.arrivalTime.getTime() - b.arrivalTime.getTime());

    // Apply limit
    allArrivals = allArrivals.slice(0, limit);

    // Build response
    return NextResponse.json({
      success: true,
      data: {
        arrivals: allArrivals,
        stationName: stationId ?? undefined,
        lastUpdated: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching train arrivals:", error);
    
    return NextResponse.json({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Failed to fetch train arrivals",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

