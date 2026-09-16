/**
 * Static nearby bus stops API.
 *
 * This endpoint deliberately discovers stops before querying realtime vehicles,
 * enabling the future flow: location -> stops -> routes -> arrivals -> vehicle.
 */

import { NextRequest, NextResponse } from "next/server";

import { getNearbyBusStops } from "@/lib/gtfs/bus-stops";
import type { ApiErrorResponse, ApiResponse, BusStopsResponse } from "@/types/api";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

function parseCoordinates(value: string | null): { latitude: number; longitude: number } | null {
  if (!value) return null;
  const [latitudeValue, longitudeValue, ...rest] = value
    .split(",")
    .map((part) => part.trim());
  if (rest.length > 0) return null;

  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<BusStopsResponse> | ApiErrorResponse>> {
  const coordinates = parseCoordinates(request.nextUrl.searchParams.get("near"));
  if (!coordinates) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "Invalid or missing 'near' parameter. Expected 'lat,lon'.",
        timestamp: new Date().toISOString(),
      },
      { status: 400 },
    );
  }

  const radiusValue = Number(request.nextUrl.searchParams.get("radius") ?? 0.5);
  const limitValue = Number(request.nextUrl.searchParams.get("limit") ?? 20);
  const radiusMiles = Number.isFinite(radiusValue)
    ? Math.min(Math.max(radiusValue, 0.05), 5)
    : 0.5;
  const limit = Number.isFinite(limitValue)
    ? Math.min(Math.max(Math.trunc(limitValue), 1), 100)
    : 20;
  const stops = getNearbyBusStops(
    coordinates.latitude,
    coordinates.longitude,
    radiusMiles,
    limit,
  );

  return NextResponse.json({
    success: true,
    data: {
      stops,
      nearLocation: { ...coordinates, radiusMiles },
    },
    timestamp: new Date().toISOString(),
  });
}
