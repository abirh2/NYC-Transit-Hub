/**
 * Service Alerts API
 * GET /api/alerts
 * 
 * Returns current service alerts.
 * Works in two modes:
 * 1. If database is available, reads from DB
 * 2. Falls back to fetching directly from MTA
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchAlerts, filterAlerts } from "@/lib/mta";
import type { AlertsResponse, ApiResponse, ApiErrorResponse } from "@/types/api";
import type { AlertSeverity } from "@/types/mta";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Cache for 60 seconds

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AlertsResponse> | ApiErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;
  
  // Parse query parameters
  const routeId = searchParams.get("routeId") ?? undefined;
  const severity = searchParams.get("severity") as AlertSeverity | undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  try {
    // Fetch alerts directly from MTA (no database required)
    let alerts = await fetchAlerts("subway");
    
    // Apply filters
    alerts = filterAlerts(alerts, {
      routeId,
      severity,
      activeOnly: true,
    });

    // Sort by severity FIRST (SEVERE first, then WARNING, then INFO)
    const severityOrder: Record<AlertSeverity, number> = {
      SEVERE: 0,
      WARNING: 1,
      INFO: 2,
    };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Apply limit AFTER sorting so we get the most important alerts
    if (limit && limit > 0) {
      alerts = alerts.slice(0, limit);
    }

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        totalCount: alerts.length,
        lastUpdated: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    
    return NextResponse.json({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Failed to fetch alerts",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

