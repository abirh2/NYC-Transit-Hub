/**
 * Metro-North Stations API
 * GET /api/metro-north/stations
 * 
 * Returns Metro-North station metadata.
 * 
 * Query Parameters:
 * - search: Search by station name
 * - id: Get a specific station by ID
 * - near: Coordinates as "lat,lon" to find nearby stations
 * - radius: Search radius in miles (default: 1, max: 10)
 * - limit: Maximum number of results (default: 50)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAllMnrStations,
  getMnrStationById,
  searchMnrStations,
  type RailStationWithCoords,
} from "@/lib/gtfs/rail-stations";
import { haversineDistance } from "@/lib/utils/distance";
import type { ApiResponse, ApiErrorResponse } from "@/types/api";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache for 1 hour (static data)

interface StationResponse {
  id: string;
  name: string;
  type?: "terminal" | "hub";
  latitude: number;
  longitude: number;
  branches: string[];
  distance?: number;
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

/**
 * Convert internal station to API response format
 */
function toResponse(station: RailStationWithCoords, distance?: number): StationResponse {
  return {
    id: station.id,
    name: station.name,
    type: station.type,
    latitude: station.latitude,
    longitude: station.longitude,
    branches: station.branches,
    ...(distance !== undefined && { distance: Math.round(distance * 100) / 100 }),
  };
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<StationsApiResponse> | ApiErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;

  const search = searchParams.get("search") ?? undefined;
  const stationId = searchParams.get("id") ?? undefined;
  const near = searchParams.get("near") ?? undefined;
  const radiusParam = searchParams.get("radius");
  const limitParam = searchParams.get("limit");

  const limit = Math.min(Math.max(limitParam ? parseInt(limitParam, 10) : 50, 1), 100);
  const radius = Math.min(Math.max(radiusParam ? parseFloat(radiusParam) : 1, 0.1), 10);

  try {
    let stations: StationResponse[];
    let nearLocation: { latitude: number; longitude: number; radiusMiles: number } | undefined;

    // If specific station ID requested
    if (stationId) {
      const station = getMnrStationById(stationId);
      stations = station ? [toResponse(station)] : [];
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

      const allStations = getAllMnrStations();
      const nearbyStations: Array<{ station: RailStationWithCoords; distance: number }> = [];

      for (const station of allStations) {
        const distance = haversineDistance(
          coords.lat,
          coords.lon,
          station.latitude,
          station.longitude
        );
        if (distance <= radius) {
          nearbyStations.push({ station, distance });
        }
      }

      nearbyStations.sort((a, b) => a.distance - b.distance);
      stations = nearbyStations.slice(0, limit).map((s) => toResponse(s.station, s.distance));

      nearLocation = {
        latitude: coords.lat,
        longitude: coords.lon,
        radiusMiles: radius,
      };
    }
    // If search query provided
    else if (search) {
      const results = searchMnrStations(search, limit);
      stations = results.map((s) => toResponse(s));
    }
    // Return all stations (up to limit)
    else {
      const allStations = getAllMnrStations();
      stations = allStations.slice(0, limit).map((s) => toResponse(s));
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
    console.error("Error fetching Metro-North stations:", error);

    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed to fetch Metro-North stations",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

