/**
 * Reliability Metrics Ingestion Endpoint
 * POST /api/ingest/reliability
 * 
 * Aggregates current alerts into daily line metrics and stores them in the database.
 * Also cleans up records older than 30 days.
 * This endpoint should be called periodically (every hour or more frequently) via cron.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchAlerts } from "@/lib/mta";
import type { IngestResponse } from "@/types/api";
import type { ServiceAlert } from "@/types/mta";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Get current date in NYC timezone (America/New_York)
 * Returns a Date object set to midnight NYC time
 */
function getTodayInNYC(): Date {
  // Get current time in NYC
  const nycTime = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const nycDate = new Date(nycTime);
  
  // Set to midnight
  nycDate.setHours(0, 0, 0, 0);
  
  return nycDate;
}

/**
 * Get NYC hour from a UTC date
 */
function getNYCHour(date: Date): number {
  const nycTime = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
  return nycTime.getHours();
}

// Time period boundaries (in hours, NYC timezone)
const TIME_PERIODS = {
  amRush: { start: 6, end: 10 },    // 6am - 10am
  midday: { start: 10, end: 14 },   // 10am - 2pm
  pmRush: { start: 14, end: 18 },   // 2pm - 6pm
  evening: { start: 18, end: 22 },  // 6pm - 10pm
  night: { start: 22, end: 6 },     // 10pm - 6am (wraps around)
};

/**
 * Determine which time period an alert falls into based on its start time
 */
function getTimePeriod(alertStartTime: Date | null): keyof typeof TIME_PERIODS {
  if (!alertStartTime) return "midday"; // Default if no start time
  
  // Get hour in NYC timezone
  const hour = getNYCHour(alertStartTime);
  
  if (hour >= TIME_PERIODS.amRush.start && hour < TIME_PERIODS.amRush.end) return "amRush";
  if (hour >= TIME_PERIODS.midday.start && hour < TIME_PERIODS.midday.end) return "midday";
  if (hour >= TIME_PERIODS.pmRush.start && hour < TIME_PERIODS.pmRush.end) return "pmRush";
  if (hour >= TIME_PERIODS.evening.start && hour < TIME_PERIODS.evening.end) return "evening";
  return "night";
}

/**
 * Group alerts by route and compute metrics
 */
function computeMetricsByRoute(alerts: ServiceAlert[]): Map<string, {
  totalIncidents: number;
  delayCount: number;
  severeCount: number;
  serviceChangeCount: number;
  plannedWorkCount: number;
  amRushIncidents: number;
  middayIncidents: number;
  pmRushIncidents: number;
  eveningIncidents: number;
  nightIncidents: number;
}> {
  const metrics = new Map<string, {
    totalIncidents: number;
    delayCount: number;
    severeCount: number;
    serviceChangeCount: number;
    plannedWorkCount: number;
    amRushIncidents: number;
    middayIncidents: number;
    pmRushIncidents: number;
    eveningIncidents: number;
    nightIncidents: number;
  }>();

  // Track which alerts we've counted for each route to avoid double-counting
  const alertsByRoute = new Map<string, Set<string>>();

  for (const alert of alerts) {
    const timePeriod = getTimePeriod(alert.activePeriodStart);

    for (const routeId of alert.affectedRoutes) {
      // Skip non-subway routes
      if (!isSubwayRoute(routeId)) continue;
      
      // Skip if we've already counted this alert for this route
      if (!alertsByRoute.has(routeId)) {
        alertsByRoute.set(routeId, new Set());
      }
      if (alertsByRoute.get(routeId)!.has(alert.id)) continue;
      alertsByRoute.get(routeId)!.add(alert.id);

      // Initialize metrics for this route if needed
      if (!metrics.has(routeId)) {
        metrics.set(routeId, {
          totalIncidents: 0,
          delayCount: 0,
          severeCount: 0,
          serviceChangeCount: 0,
          plannedWorkCount: 0,
          amRushIncidents: 0,
          middayIncidents: 0,
          pmRushIncidents: 0,
          eveningIncidents: 0,
          nightIncidents: 0,
        });
      }

      const routeMetrics = metrics.get(routeId)!;
      routeMetrics.totalIncidents++;

      // Count by type
      if (alert.alertType === "DELAY") routeMetrics.delayCount++;
      if (alert.alertType === "SERVICE_CHANGE" || alert.alertType === "DETOUR") {
        routeMetrics.serviceChangeCount++;
      }
      if (alert.alertType === "PLANNED_WORK") routeMetrics.plannedWorkCount++;
      
      // Count by severity
      if (alert.severity === "SEVERE") routeMetrics.severeCount++;

      // Count by time period
      switch (timePeriod) {
        case "amRush": routeMetrics.amRushIncidents++; break;
        case "midday": routeMetrics.middayIncidents++; break;
        case "pmRush": routeMetrics.pmRushIncidents++; break;
        case "evening": routeMetrics.eveningIncidents++; break;
        case "night": routeMetrics.nightIncidents++; break;
      }
    }
  }

  return metrics;
}

/**
 * Check if a route ID is a subway line
 */
function isSubwayRoute(routeId: string): boolean {
  const subwayRoutes = [
    "1", "2", "3", "4", "5", "6", "7",
    "A", "C", "E", "B", "D", "F", "M",
    "G", "J", "Z", "L", "N", "Q", "R", "W",
    "S", "SI", "SIR", "FS", "GS", "H"
  ];
  return subwayRoutes.includes(routeId.toUpperCase());
}

/**
 * Filter to only active alerts (started and not ended)
 */
function filterActiveAlerts(alerts: ServiceAlert[]): ServiceAlert[] {
  const now = new Date();
  return alerts.filter(alert => {
    const hasStarted = !alert.activePeriodStart || alert.activePeriodStart <= now;
    const hasEnded = alert.activePeriodEnd && alert.activePeriodEnd <= now;
    return hasStarted && !hasEnded;
  });
}

export async function POST(): Promise<NextResponse<IngestResponse>> {
  const startTime = Date.now();
  const errors: string[] = [];
  let recordsProcessed = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;
  let recordsDeleted = 0;

  try {
    // Step 1: Clean up old data (older than 30 days in NYC timezone)
    const thirtyDaysAgo = getTodayInNYC();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleteResult = await db.dailyLineMetrics.deleteMany({
      where: { date: { lt: thirtyDaysAgo } },
    });
    recordsDeleted = deleteResult.count;

    // Step 2: Fetch current alerts
    const allAlerts = await fetchAlerts("subway");
    const activeAlerts = filterActiveAlerts(allAlerts);
    recordsProcessed = activeAlerts.length;

    // Step 3: Compute metrics by route
    const metricsByRoute = computeMetricsByRoute(activeAlerts);

    // Step 4: Upsert daily metrics for today (NYC timezone)
    const today = getTodayInNYC();

    for (const [routeId, metrics] of metricsByRoute) {
      try {
        // Check if record exists
        const existing = await db.dailyLineMetrics.findUnique({
          where: { date_routeId: { date: today, routeId } },
        });

        if (existing) {
          // Update with latest metrics (replace, don't accumulate)
          await db.dailyLineMetrics.update({
            where: { id: existing.id },
            data: {
              totalIncidents: metrics.totalIncidents,
              delayCount: metrics.delayCount,
              severeCount: metrics.severeCount,
              serviceChangeCount: metrics.serviceChangeCount,
              plannedWorkCount: metrics.plannedWorkCount,
              amRushIncidents: metrics.amRushIncidents,
              middayIncidents: metrics.middayIncidents,
              pmRushIncidents: metrics.pmRushIncidents,
              eveningIncidents: metrics.eveningIncidents,
              nightIncidents: metrics.nightIncidents,
            },
          });
          recordsUpdated++;
        } else {
          // Create new record
          await db.dailyLineMetrics.create({
            data: {
              date: today,
              routeId,
              ...metrics,
            },
          });
          recordsCreated++;
        }
      } catch (err) {
        errors.push(`Failed to upsert metrics for ${routeId}: ${err}`);
      }
    }

    // Step 5: Update feed status
    await db.feedStatus.upsert({
      where: { id: "reliability" },
      create: {
        id: "reliability",
        name: "Reliability Metrics",
        lastFetch: new Date(),
        lastSuccess: new Date(),
        recordCount: metricsByRoute.size,
      },
      update: {
        lastFetch: new Date(),
        lastSuccess: new Date(),
        lastError: errors.length > 0 ? errors[0] : null,
        recordCount: metricsByRoute.size,
      },
    });

    return NextResponse.json({
      success: errors.length === 0,
      feedId: "reliability",
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      recordsDeleted,
      errors,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    try {
      await db.feedStatus.upsert({
        where: { id: "reliability" },
        create: {
          id: "reliability",
          name: "Reliability Metrics",
          lastFetch: new Date(),
          lastError: errorMessage,
          recordCount: 0,
        },
        update: {
          lastFetch: new Date(),
          lastError: errorMessage,
        },
      });
    } catch {
      // Ignore feed status update errors
    }

    return NextResponse.json({
      success: false,
      feedId: "reliability",
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      recordsDeleted,
      errors: [errorMessage],
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/ingest/reliability",
    method: "POST",
    description: "Aggregates current alerts into daily reliability metrics and cleans up old data",
    note: "This endpoint requires database connection. Run periodically via cron.",
  });
}

