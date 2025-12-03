/**
 * Bus Routes API
 * GET /api/buses/routes
 * 
 * Returns list of available bus routes.
 * Fetches active routes from SIRI API, falls back to static data.
 */

import { NextResponse } from "next/server";
import { getActiveBusRoutes, isBusApiConfigured } from "@/lib/mta/buses";
import { getAllKnownRoutes, groupRoutesByPrefix } from "@/lib/gtfs/bus-routes";
import type { ApiResponse, ApiErrorResponse } from "@/types/api";

export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache for 5 minutes

interface BusRoutesResponse {
  routes: string[];
  byGroup: Record<string, string[]>;
  isLive: boolean;
  totalCount: number;
}

export async function GET(): Promise<NextResponse<ApiResponse<BusRoutesResponse> | ApiErrorResponse>> {
  try {
    // Check if API key is configured
    if (!isBusApiConfigured()) {
      // Return static data
      const routes = getAllKnownRoutes();
      const byGroup = groupRoutesByPrefix(routes);
      
      return NextResponse.json({
        success: true,
        data: {
          routes,
          byGroup,
          isLive: false,
          totalCount: routes.length,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Fetch active routes from API
    const { routes, isLive } = await getActiveBusRoutes();
    const byGroup = groupRoutesByPrefix(routes);

    return NextResponse.json({
      success: true,
      data: {
        routes,
        byGroup,
        isLive,
        totalCount: routes.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching bus routes:", error);
    
    // Fall back to static data on error
    const routes = getAllKnownRoutes();
    const byGroup = groupRoutesByPrefix(routes);
    
    return NextResponse.json({
      success: true,
      data: {
        routes,
        byGroup,
        isLive: false,
        totalCount: routes.length,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

