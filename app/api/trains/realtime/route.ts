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
import { normalizeSubwayDirection } from "@/lib/transit/direction";
import { toLegacyTrainArrivals } from "@/lib/transit/legacy";
import { getSubwayRealtimeSnapshot } from "@/lib/transit/realtime-service";
import type { TrainRealtimeResponse, ApiResponse, ApiErrorResponse } from "@/types/api";

export const dynamic = "force-dynamic";
export const revalidate = 30; // Cache for 30 seconds

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<TrainRealtimeResponse> | ApiErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;
  
  // Parse query parameters
  const stationId = searchParams.get("stationId") ?? undefined;
  const routeId = searchParams.get("routeId") ?? undefined;
  const rawDirection = searchParams.get("direction");
  const direction = rawDirection
    ? normalizeSubwayDirection(rawDirection)
    : undefined;
  const limitParam = searchParams.get("limit");
  const parsedLimit = limitParam ? parseInt(limitParam, 10) : 20;
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), 500)
    : 20;

  if (rawDirection && direction === "unknown") {
    return NextResponse.json({
      success: false,
      data: null,
      error: "Invalid direction. Use N, S, E, W, or a normalized direction.",
      timestamp: new Date().toISOString(),
    }, { status: 400 });
  }

  try {
    const snapshot = await getSubwayRealtimeSnapshot({
      stationId: stationId?.replace(/[NS]$/, ""),
      stopId: stationId && /[NS]$/.test(stationId) ? stationId : undefined,
      routeId,
      direction,
      limit,
    });

    if (snapshot.sourceState === "unavailable") {
      return NextResponse.json({
        success: false,
        data: null,
        error: "Failed to fetch subway feeds",
        timestamp: new Date().toISOString(),
      }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      data: {
        arrivals: toLegacyTrainArrivals(snapshot),
        departures: snapshot.departures,
        trips: snapshot.trips.filter((trip) => trip.mode === "subway"),
        vehicles: snapshot.vehicles,
        sourceState: snapshot.sourceState,
        feedTimestamp: snapshot.feedTimestamp?.toISOString() ?? null,
        stationName: stationId ?? undefined,
        lastUpdated: snapshot.generatedAt.toISOString(),
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
