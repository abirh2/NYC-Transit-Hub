/**
 * Metro-North Real-time Arrivals API
 * GET /api/metro-north/realtime
 * 
 * Returns upcoming Metro-North train arrivals.
 * 
 * Query Parameters:
 * - routeId: Filter by line ID (e.g., "1" for Hudson)
 * - stopId: Filter by stop ID
 * - limit: Maximum number of results (default: 50)
 */

import { NextRequest, NextResponse } from "next/server";
import { getMetroNorthArrivals, getActiveMetroNorthLines } from "@/lib/mta/rail";
import type { RailRealtimeResponse, ApiResponse, ApiErrorResponse } from "@/types/api";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<RailRealtimeResponse> | ApiErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;

  const routeId = searchParams.get("routeId") ?? undefined;
  const stopId = searchParams.get("stopId") ?? undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 50;

  try {
    // Fetch arrivals and lines in parallel
    const [arrivals, branches] = await Promise.all([
      getMetroNorthArrivals({ routeId, stopId, limit }),
      getActiveMetroNorthLines(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        arrivals,
        branches,
        lastUpdated: new Date().toISOString(),
        isLive: arrivals.length > 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching Metro-North arrivals:", error);

    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed to fetch Metro-North arrivals",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

