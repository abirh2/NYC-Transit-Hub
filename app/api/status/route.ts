/**
 * System Status API
 * GET /api/status
 * 
 * Returns overall system health and feed status.
 */

import { NextResponse } from "next/server";
import { isBusApiConfigured } from "@/lib/mta";
import type { SystemStatusResponse, ApiResponse } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<ApiResponse<SystemStatusResponse>>> {
  const busConfigured = isBusApiConfigured();
  
  // For now, return basic status without database
  // Will be enhanced when database is connected
  const feeds = [
    {
      id: "subway",
      name: "Subway GTFS-RT",
      lastFetch: null,
      lastSuccess: null,
      lastError: null,
      recordCount: 0,
      isHealthy: true, // Feeds don't require API key
    },
    {
      id: "alerts",
      name: "Service Alerts",
      lastFetch: null,
      lastSuccess: null,
      lastError: null,
      recordCount: 0,
      isHealthy: true,
    },
    {
      id: "elevators",
      name: "Elevator/Escalator Status",
      lastFetch: null,
      lastSuccess: null,
      lastError: null,
      recordCount: 0,
      isHealthy: true,
    },
    {
      id: "buses",
      name: "Bus GTFS-RT",
      lastFetch: null,
      lastSuccess: null,
      lastError: busConfigured ? null : "API key not configured",
      recordCount: 0,
      isHealthy: busConfigured,
    },
  ];

  const unhealthyCount = feeds.filter(f => !f.isHealthy).length;
  const overallHealth = 
    unhealthyCount === 0 ? "healthy" :
    unhealthyCount < feeds.length ? "degraded" :
    "down";

  return NextResponse.json({
    success: true,
    data: {
      feeds,
      overallHealth,
      lastUpdated: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  });
}

