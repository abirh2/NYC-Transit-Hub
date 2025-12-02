/**
 * Reliability Metrics API
 * GET /api/reliability
 * 
 * Returns reliability metrics aggregated from daily snapshots.
 * Falls back to live alerts if no historical data is available.
 * 
 * Query params:
 * - routeId: Filter by specific subway line (e.g., "A", "F")
 * - days: Number of days to include (default 30, max 30)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchAlerts } from "@/lib/mta";
import type { 
  ReliabilityResponse, 
  LineReliabilitySummary, 
  TimeOfDayBreakdown,
  ApiResponse, 
  ApiErrorResponse 
} from "@/types/api";
import type { ServiceAlert } from "@/types/mta";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Cache for 60 seconds

// Subway routes for validation (excludes shuttles: S, FS, GS, H - infrequent service)
const SUBWAY_ROUTES = [
  "1", "2", "3", "4", "5", "6", "7",
  "A", "C", "E", "B", "D", "F", "M",
  "G", "J", "Z", "L", "N", "Q", "R", "W",
  "SI"
];

/**
 * Compute live alerts fallback when no historical data exists
 */
function computeLiveAlertsFallback(alerts: ServiceAlert[]): {
  total: number;
  byLine: Array<{ line: string; count: number }>;
} {
  const now = new Date();
  const activeAlerts = alerts.filter(a => {
    const hasStarted = !a.activePeriodStart || a.activePeriodStart <= now;
    const hasEnded = a.activePeriodEnd && a.activePeriodEnd <= now;
    return hasStarted && !hasEnded;
  });

  const lineCounts = new Map<string, number>();
  for (const alert of activeAlerts) {
    for (const route of alert.affectedRoutes) {
      if (SUBWAY_ROUTES.includes(route.toUpperCase())) {
        lineCounts.set(route, (lineCounts.get(route) || 0) + 1);
      }
    }
  }

  return {
    total: activeAlerts.length,
    byLine: Array.from(lineCounts.entries())
      .map(([line, count]) => ({ line, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/**
 * Calculate reliability score (0-100) based on incident count
 * Lower incidents = higher score
 */
function calculateReliabilityScore(avgIncidentsPerDay: number): number {
  // Scale: 0 incidents/day = 100, 5+ incidents/day = 0
  const score = Math.max(0, 100 - (avgIncidentsPerDay * 20));
  return Math.round(score);
}

/**
 * Get current date in NYC timezone
 */
function getTodayInNYC(): Date {
  const nycTime = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const nycDate = new Date(nycTime);
  nycDate.setHours(0, 0, 0, 0);
  return nycDate;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ReliabilityResponse> | ApiErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;
  
  // Parse query parameters
  const routeId = searchParams.get("routeId")?.toUpperCase() ?? undefined;
  const daysParam = searchParams.get("days");
  const days = Math.min(30, Math.max(1, daysParam ? parseInt(daysParam, 10) : 30));

  try {
    // Calculate date range in NYC timezone
    // days=1 means "today only", days=7 means "past 7 days including today"
    const todayNYC = getTodayInNYC();
    
    const endDate = new Date(todayNYC);
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date(todayNYC);
    // Subtract (days - 1) to include today in the count
    // days=1 -> subtract 0 days (today only)
    // days=7 -> subtract 6 days (7 days including today)
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    // Fetch historical data from database
    const whereClause = {
      date: { gte: startDate, lte: endDate },
      ...(routeId ? { routeId } : {}),
    };

    const metrics = await db.dailyLineMetrics.findMany({
      where: whereClause,
      orderBy: { date: "asc" },
    });

    const hasHistoricalData = metrics.length > 0;

    // Fetch live alerts for fallback or current status display
    const liveAlerts = await fetchAlerts("subway");
    const liveAlertsFallback = computeLiveAlertsFallback(liveAlerts);

    // Compute aggregated metrics
    let totalIncidents = 0;
    let dataStartDate: string | null = null;

    // Group metrics by route for per-line summary
    const byRouteMap = new Map<string, {
      totalIncidents: number;
      delayCount: number;
      severeCount: number;
      daysWithData: number;
    }>();

    // Aggregate time-of-day totals
    const timeOfDayTotals = {
      amRush: 0,
      midday: 0,
      pmRush: 0,
      evening: 0,
      night: 0,
    };

    // Group by date for daily trend
    const dailyTrendMap = new Map<string, {
      totalIncidents: number;
      delayCount: number;
      severeCount: number;
    }>();

    for (const metric of metrics) {
      totalIncidents += metric.totalIncidents;
      
      if (!dataStartDate) {
        dataStartDate = metric.date.toISOString().split("T")[0];
      }

      // Aggregate by route
      const routeKey = metric.routeId;
      if (!byRouteMap.has(routeKey)) {
        byRouteMap.set(routeKey, {
          totalIncidents: 0,
          delayCount: 0,
          severeCount: 0,
          daysWithData: 0,
        });
      }
      const routeData = byRouteMap.get(routeKey)!;
      routeData.totalIncidents += metric.totalIncidents;
      routeData.delayCount += metric.delayCount;
      routeData.severeCount += metric.severeCount;
      routeData.daysWithData++;

      // Aggregate time of day
      timeOfDayTotals.amRush += metric.amRushIncidents;
      timeOfDayTotals.midday += metric.middayIncidents;
      timeOfDayTotals.pmRush += metric.pmRushIncidents;
      timeOfDayTotals.evening += metric.eveningIncidents;
      timeOfDayTotals.night += metric.nightIncidents;

      // Aggregate by date
      const dateKey = metric.date.toISOString().split("T")[0];
      if (!dailyTrendMap.has(dateKey)) {
        dailyTrendMap.set(dateKey, {
          totalIncidents: 0,
          delayCount: 0,
          severeCount: 0,
        });
      }
      const dayData = dailyTrendMap.get(dateKey)!;
      dayData.totalIncidents += metric.totalIncidents;
      dayData.delayCount += metric.delayCount;
      dayData.severeCount += metric.severeCount;
    }

    // Build per-line summary with reliability scores (include ALL subway lines)
    // Only filter to specific route if routeId param is provided
    const allRoutes = routeId ? [routeId] : SUBWAY_ROUTES;
    
    const byLine: LineReliabilitySummary[] = allRoutes.map(route => {
      const data = byRouteMap.get(route);
      if (data) {
        const avgIncidentsPerDay = data.daysWithData > 0 
          ? data.totalIncidents / data.daysWithData 
          : 0;
        return {
          routeId: route,
          totalIncidents: data.totalIncidents,
          delayCount: data.delayCount,
          severeCount: data.severeCount,
          avgIncidentsPerDay: Math.round(avgIncidentsPerDay * 100) / 100,
          reliabilityScore: calculateReliabilityScore(avgIncidentsPerDay),
        };
      } else {
        // No incidents for this line - perfect score!
        return {
          routeId: route,
          totalIncidents: 0,
          delayCount: 0,
          severeCount: 0,
          avgIncidentsPerDay: 0,
          reliabilityScore: 100,
        };
      }
    }).sort((a, b) => {
      // Sort by reliability score (best first), then by route name
      if (b.reliabilityScore !== a.reliabilityScore) {
        return b.reliabilityScore - a.reliabilityScore;
      }
      return a.routeId.localeCompare(b.routeId);
    });

    // Build time-of-day breakdown
    const byTimeOfDay: TimeOfDayBreakdown[] = [
      { period: "amRush", label: "AM Rush", hours: "6am - 10am", totalIncidents: timeOfDayTotals.amRush },
      { period: "midday", label: "Midday", hours: "10am - 2pm", totalIncidents: timeOfDayTotals.midday },
      { period: "pmRush", label: "PM Rush", hours: "2pm - 6pm", totalIncidents: timeOfDayTotals.pmRush },
      { period: "evening", label: "Evening", hours: "6pm - 10pm", totalIncidents: timeOfDayTotals.evening },
      { period: "night", label: "Night", hours: "10pm - 6am", totalIncidents: timeOfDayTotals.night },
    ];

    // Build daily trend
    const dailyTrend = Array.from(dailyTrendMap.entries())
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const response: ReliabilityResponse = {
      totalIncidents,
      periodDays: days,
      dataStartDate,
      hasHistoricalData,
      byLine,
      byTimeOfDay,
      dailyTrend,
      liveAlerts: hasHistoricalData ? undefined : liveAlertsFallback,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching reliability metrics:", error);

    // Try to return live alerts as fallback on error
    try {
      const liveAlerts = await fetchAlerts("subway");
      const liveAlertsFallback = computeLiveAlertsFallback(liveAlerts);

      const fallbackResponse: ReliabilityResponse = {
        totalIncidents: 0,
        periodDays: days,
        dataStartDate: null,
        hasHistoricalData: false,
        byLine: [],
        byTimeOfDay: [
          { period: "amRush", label: "AM Rush", hours: "6am - 10am", totalIncidents: 0 },
          { period: "midday", label: "Midday", hours: "10am - 2pm", totalIncidents: 0 },
          { period: "pmRush", label: "PM Rush", hours: "2pm - 6pm", totalIncidents: 0 },
          { period: "evening", label: "Evening", hours: "6pm - 10pm", totalIncidents: 0 },
          { period: "night", label: "Night", hours: "10pm - 6am", totalIncidents: 0 },
        ],
        dailyTrend: [],
        liveAlerts: liveAlertsFallback,
        lastUpdated: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        data: fallbackResponse,
        timestamp: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json({
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed to fetch reliability metrics",
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }
  }
}

