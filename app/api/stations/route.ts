/**
 * Stations API
 * GET /api/stations
 * 
 * Returns station metadata from official MTA GTFS static feed.
 * Data source: http://web.mta.info/developers/data/nyct/subway/google_transit.zip
 * 
 * Query Parameters:
 * - search: Search by station name
 * - id: Get a specific station by ID
 * - near: Coordinates as "lat,lon" to find nearby stations
 * - radius: Search radius in miles (default: 1, max: 5)
 * - limit: Maximum number of results (default: 50)
 */

import { NextRequest, NextResponse } from "next/server";
import { getStations, searchStations, getStationById } from "@/lib/gtfs";
import { findNearbyStations, type StationWithDistance } from "@/lib/utils/distance";
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
  /** All station complex IDs that share this name */
  allIds?: string[];
  /** All platform IDs across all complexes (for multi-complex stations) */
  allPlatforms?: {
    north: string[];
    south: string[];
  };
  distance?: number; // Only present when using 'near' parameter
}

interface StationsApiResponse {
  stations: StationResponse[];
  totalCount: number;
  nearLocation?: {
    latitude: number;
    longitude: number;
    radiusMiles: number;
  };
}

/**
 * Parse "lat,lon" string into coordinates
 */
function parseCoordinates(near: string): { lat: number; lon: number } | null {
  const parts = near.split(",").map((s) => s.trim());
  if (parts.length !== 2) return null;

  const lat = parseFloat(parts[0]);
  const lon = parseFloat(parts[1]);

  if (isNaN(lat) || isNaN(lon)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lon < -180 || lon > 180) return null;

  return { lat, lon };
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<StationsApiResponse> | ApiErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;

  // Parse query parameters
  const search = searchParams.get("search") ?? undefined;
  const stationId = searchParams.get("id") ?? undefined;
  const near = searchParams.get("near") ?? undefined;
  const radiusParam = searchParams.get("radius");
  const limitParam = searchParams.get("limit");
  
  // Parse numeric params with defaults and bounds
  const limit = Math.min(Math.max(limitParam ? parseInt(limitParam, 10) : 50, 1), 100);
  const radius = Math.min(Math.max(radiusParam ? parseFloat(radiusParam) : 1, 0.1), 5);

  try {
    let stations: StationResponse[];
    let nearLocation: { latitude: number; longitude: number; radiusMiles: number } | undefined;

    // If specific station ID requested
    if (stationId) {
      const station = getStationById(stationId);
      stations = station ? [station] : [];
    }
    // If near parameter provided - find nearby stations
    else if (near) {
      const coords = parseCoordinates(near);
      if (!coords) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: "Invalid 'near' parameter. Expected format: 'lat,lon' (e.g., '40.758,-73.985')",
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }

      const allStations = getStations();
      const stationArray = Array.from(allStations.values());
      
      const nearbyStations: StationWithDistance[] = findNearbyStations(
        stationArray,
        coords.lat,
        coords.lon,
        radius,
        limit
      );

      stations = nearbyStations.map((s) => {
        // Get full station info with allPlatforms merged
        const fullStation = getStationById(s.id);
        return {
          id: s.id,
          name: s.name,
          latitude: s.latitude,
          longitude: s.longitude,
          platforms: s.platforms ?? { north: null, south: null },
          allIds: fullStation?.allIds,
          allPlatforms: fullStation?.allPlatforms,
          distance: Math.round(s.distance * 100) / 100, // Round to 2 decimal places
        };
      });

      nearLocation = {
        latitude: coords.lat,
        longitude: coords.lon,
        radiusMiles: radius,
      };
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
        ...(nearLocation && { nearLocation }),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching stations:", error);

    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed to fetch stations",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
