/**
 * Incidents API
 * GET /api/incidents
 * 
 * Returns service incidents (alerts) with filtering and statistics.
 * Extends the alerts functionality with date range filtering and computed stats.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchAlerts } from "@/lib/mta";
import type { IncidentsResponse, IncidentStats, ApiResponse, ApiErrorResponse } from "@/types/api";
import type { ServiceAlert, AlertSeverity, AlertType } from "@/types/mta";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Cache for 60 seconds

/**
 * Filter incidents by the provided criteria
 */
function filterIncidents(
  incidents: ServiceAlert[],
  options: {
    routeId?: string;
    alertType?: AlertType;
    severity?: AlertSeverity;
    from?: Date;
    to?: Date;
    activeOnly?: boolean;
    status?: "active" | "upcoming"; // active = started & not ended, upcoming = not yet started
  }
): ServiceAlert[] {
  let filtered = incidents;
  const now = new Date();

  // Filter by status (active vs upcoming)
  if (options.status === "active") {
    // Active = has started (or no start time) AND hasn't ended
    filtered = filtered.filter(i => {
      const hasStarted = !i.activePeriodStart || i.activePeriodStart <= now;
      const hasEnded = i.activePeriodEnd && i.activePeriodEnd <= now;
      return hasStarted && !hasEnded;
    });
  } else if (options.status === "upcoming") {
    // Upcoming = hasn't started yet (future planned work)
    filtered = filtered.filter(i => {
      return i.activePeriodStart && i.activePeriodStart > now;
    });
  }

  // Filter by route
  if (options.routeId) {
    filtered = filtered.filter(i => 
      i.affectedRoutes.includes(options.routeId!)
    );
  }

  // Filter by alert type
  if (options.alertType) {
    filtered = filtered.filter(i => i.alertType === options.alertType);
  }

  // Filter by severity
  if (options.severity) {
    filtered = filtered.filter(i => i.severity === options.severity);
  }

  // Filter by date range (using activePeriodStart)
  if (options.from) {
    filtered = filtered.filter(i => {
      if (!i.activePeriodStart) return true;
      return i.activePeriodStart >= options.from!;
    });
  }

  if (options.to) {
    filtered = filtered.filter(i => {
      if (!i.activePeriodStart) return true;
      return i.activePeriodStart <= options.to!;
    });
  }

  // Legacy: Filter active only (hasn't ended)
  if (options.activeOnly && !options.status) {
    filtered = filtered.filter(i => {
      // No end time means still active
      if (!i.activePeriodEnd) return true;
      return i.activePeriodEnd > now;
    });
  }

  return filtered;
}

/**
 * Compute statistics from incidents
 */
function computeStats(incidents: ServiceAlert[]): IncidentStats {
  // Count by line
  const lineCounts = new Map<string, number>();
  for (const incident of incidents) {
    for (const line of incident.affectedRoutes) {
      lineCounts.set(line, (lineCounts.get(line) || 0) + 1);
    }
  }
  const byLine = Array.from(lineCounts.entries())
    .map(([line, count]) => ({ line, count }))
    .sort((a, b) => b.count - a.count);

  // Count by type
  const typeCounts = new Map<string, number>();
  for (const incident of incidents) {
    typeCounts.set(incident.alertType, (typeCounts.get(incident.alertType) || 0) + 1);
  }
  const byType = Array.from(typeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Count by severity
  const bySeverity = {
    severe: incidents.filter(i => i.severity === "SEVERE").length,
    warning: incidents.filter(i => i.severity === "WARNING").length,
    info: incidents.filter(i => i.severity === "INFO").length,
  };

  return {
    total: incidents.length,
    byLine,
    byType,
    bySeverity,
  };
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<IncidentsResponse> | ApiErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;

  // Parse query parameters
  const routeId = searchParams.get("routeId") ?? undefined;
  const alertType = searchParams.get("alertType") as AlertType | undefined;
  const severity = searchParams.get("severity") as AlertSeverity | undefined;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const activeOnlyParam = searchParams.get("activeOnly");
  const statusParam = searchParams.get("status") as "active" | "upcoming" | null;
  const limitParam = searchParams.get("limit");

  const from = fromParam ? new Date(fromParam) : undefined;
  const to = toParam ? new Date(toParam) : undefined;
  const activeOnly = activeOnlyParam === "true";
  const status = statusParam ?? undefined;
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  try {
    // Fetch all alerts from MTA
    let incidents = await fetchAlerts("subway");

    // Apply filters
    incidents = filterIncidents(incidents, {
      routeId,
      alertType,
      severity,
      from,
      to,
      activeOnly,
      status,
    });

    // Sort by start time (most recent first), then by severity
    const severityOrder: Record<AlertSeverity, number> = {
      SEVERE: 0,
      WARNING: 1,
      INFO: 2,
    };
    incidents.sort((a, b) => {
      // First by severity
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // Then by start time (most recent first)
      const aTime = a.activePeriodStart?.getTime() ?? 0;
      const bTime = b.activePeriodStart?.getTime() ?? 0;
      return bTime - aTime;
    });

    // Compute stats before limiting
    const stats = computeStats(incidents);

    // Apply limit
    if (limit && limit > 0) {
      incidents = incidents.slice(0, limit);
    }

    return NextResponse.json({
      success: true,
      data: {
        incidents,
        stats,
        lastUpdated: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching incidents:", error);

    return NextResponse.json({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Failed to fetch incidents",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

