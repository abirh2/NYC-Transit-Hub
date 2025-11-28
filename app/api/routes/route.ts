/**
 * Routes API
 * GET /api/routes
 * 
 * Returns subway route/line information from official MTA GTFS static feed.
 * Data source: http://web.mta.info/developers/data/nyct/subway/google_transit.zip
 * 
 * Query Parameters:
 * - id: Get specific route by ID (e.g., "A", "1", "L")
 */

import { NextRequest, NextResponse } from "next/server";
import { getRoutes, getRouteById } from "@/lib/gtfs";
import type { ApiResponse, ApiErrorResponse } from "@/types/api";

export const dynamic = "force-dynamic";
export const revalidate = 86400; // Cache for 24 hours (very static data)

interface RouteResponse {
  id: string;
  shortName: string;
  longName: string;
  description: string;
  color: string;
  textColor: string;
  url: string;
}

interface RoutesApiResponse {
  routes: RouteResponse[];
  totalCount: number;
}

function formatRoute(route: ReturnType<typeof getRouteById>): RouteResponse | null {
  if (!route) return null;
  return {
    id: route.routeId,
    shortName: route.routeShortName,
    longName: route.routeLongName,
    description: route.routeDesc,
    color: `#${route.routeColor}`,
    textColor: `#${route.routeTextColor}`,
    url: route.routeUrl,
  };
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<RoutesApiResponse> | ApiErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;
  const routeId = searchParams.get("id") ?? undefined;

  try {
    let routes: RouteResponse[];

    if (routeId) {
      const route = getRouteById(routeId);
      const formatted = formatRoute(route);
      routes = formatted ? [formatted] : [];
    } else {
      routes = getRoutes()
        .map(r => formatRoute(r)!)
        .filter(Boolean);
    }

    return NextResponse.json({
      success: true,
      data: {
        routes,
        totalCount: routes.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching routes:", error);
    
    return NextResponse.json({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Failed to fetch routes",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

