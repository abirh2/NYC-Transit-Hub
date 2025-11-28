/**
 * Real-time Bus Arrivals API
 * GET /api/buses/realtime
 * 
 * Returns upcoming bus arrivals.
 * Requires MTA_BUS_API_KEY environment variable.
 * 
 * Query Parameters:
 * - routeId: Filter by bus route (e.g., "M15", "B63")
 * - stopId: Filter by stop ID
 * - limit: Maximum number of results (default: 20)
 */

import { NextRequest, NextResponse } from "next/server";
import { getBusArrivals, isBusApiConfigured } from "@/lib/mta";
import type { BusRealtimeResponse, ApiResponse, ApiErrorResponse } from "@/types/api";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<BusRealtimeResponse> | ApiErrorResponse>> {
  // Check if API key is configured
  if (!isBusApiConfigured()) {
    return NextResponse.json({
      success: false,
      data: null,
      error: "Bus API not configured. Set MTA_BUS_API_KEY environment variable.",
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }

  const searchParams = request.nextUrl.searchParams;
  
  // Parse query parameters
  const routeId = searchParams.get("routeId") ?? undefined;
  const stopId = searchParams.get("stopId") ?? undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 20;

  try {
    // Fetch bus arrivals
    const arrivals = await getBusArrivals({
      routeId,
      stopId,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        arrivals,
        stopName: stopId ?? undefined,
        lastUpdated: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching bus arrivals:", error);
    
    return NextResponse.json({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Failed to fetch bus arrivals",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

