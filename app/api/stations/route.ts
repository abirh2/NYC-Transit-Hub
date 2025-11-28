/**
 * Stations API
 * GET /api/stations
 * 
 * Returns station metadata from official MTA GTFS static feed.
 * Data source: http://web.mta.info/developers/data/nyct/subway/google_transit.zip
 * 
 * Query Parameters:
 * - search: Search by station name
 * - limit: Maximum number of results (default: 50)
 */

import { NextRequest, NextResponse } from "next/server";
import { getStations, searchStations, getStationById } from "@/lib/gtfs";
import type { ApiResponse, ApiErrorResponse } from "@/types/api";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache for 1 hour (static data)

interface StationResponse {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  platforms: {
    north: string | null;
    south: string | null;
  };
}

interface StationsApiResponse {
  stations: StationResponse[];
  totalCount: number;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<StationsApiResponse> | ApiErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;
  
  // Parse query parameters
  const search = searchParams.get("search") ?? undefined;
  const stationId = searchParams.get("id") ?? undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 50;

  try {
    let stations: StationResponse[];

    // If specific station ID requested
    if (stationId) {
      const station = getStationById(stationId);
      stations = station ? [station] : [];
    }
    // If search query provided
    else if (search) {
      stations = searchStations(search, limit);
    }
    // Return all stations (up to limit)
    else {
      const allStations = getStations();
      stations = Array.from(allStations.values()).slice(0, limit);
    }

    return NextResponse.json({
      success: true,
      data: {
        stations,
        totalCount: stations.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching stations:", error);
    
    return NextResponse.json({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Failed to fetch stations",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
