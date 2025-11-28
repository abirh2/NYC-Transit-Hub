/**
 * Alerts Feed Ingestion Endpoint
 * POST /api/ingest/alerts
 * 
 * Fetches service alerts and stores them in the database.
 * This endpoint should be called periodically (every 1-5 minutes) via cron.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchAlerts } from "@/lib/mta";
import type { IngestResponse } from "@/types/api";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(): Promise<NextResponse<IngestResponse>> {
  const startTime = Date.now();
  const errors: string[] = [];
  let recordsProcessed = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;

  try {
    // Fetch alerts from MTA
    const alerts = await fetchAlerts("subway");
    recordsProcessed = alerts.length;

    if (alerts.length === 0) {
      // No alerts might be valid (good service day)
      await db.feedStatus.upsert({
        where: { id: "alerts" },
        create: {
          id: "alerts",
          name: "Service Alerts",
          lastFetch: new Date(),
          lastSuccess: new Date(),
          recordCount: 0,
        },
        update: {
          lastFetch: new Date(),
          lastSuccess: new Date(),
          recordCount: 0,
        },
      });

      return NextResponse.json({
        success: true,
        feedId: "alerts",
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsDeleted: 0,
        errors: [],
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    // Get existing alert IDs
    const existingAlerts = await db.alert.findMany({
      select: { id: true },
    });
    const existingIds = new Set(existingAlerts.map(a => a.id));
    const newIds = new Set(alerts.map(a => a.id));

    // Delete alerts that are no longer active
    const idsToDelete = [...existingIds].filter(id => !newIds.has(id));
    if (idsToDelete.length > 0) {
      await db.alert.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }

    // Upsert each alert
    for (const alert of alerts) {
      try {
        const wasExisting = existingIds.has(alert.id);
        
        await db.alert.upsert({
          where: { id: alert.id },
          create: {
            id: alert.id,
            affectedRoutes: alert.affectedRoutes,
            affectedStops: alert.affectedStops,
            headerText: alert.headerText,
            descriptionText: alert.descriptionText,
            severity: alert.severity,
            alertType: alert.alertType,
            activePeriodStart: alert.activePeriodStart,
            activePeriodEnd: alert.activePeriodEnd,
          },
          update: {
            affectedRoutes: alert.affectedRoutes,
            affectedStops: alert.affectedStops,
            headerText: alert.headerText,
            descriptionText: alert.descriptionText,
            severity: alert.severity,
            alertType: alert.alertType,
            activePeriodStart: alert.activePeriodStart,
            activePeriodEnd: alert.activePeriodEnd,
          },
        });

        if (wasExisting) {
          recordsUpdated++;
        } else {
          recordsCreated++;
        }
      } catch (err) {
        errors.push(`Failed to upsert alert ${alert.id}: ${err}`);
      }
    }

    // Update feed status
    await db.feedStatus.upsert({
      where: { id: "alerts" },
      create: {
        id: "alerts",
        name: "Service Alerts",
        lastFetch: new Date(),
        lastSuccess: new Date(),
        recordCount: alerts.length,
      },
      update: {
        lastFetch: new Date(),
        lastSuccess: new Date(),
        lastError: errors.length > 0 ? errors[0] : null,
        recordCount: alerts.length,
      },
    });

    return NextResponse.json({
      success: errors.length === 0,
      feedId: "alerts",
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      recordsDeleted: idsToDelete.length,
      errors,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    try {
      await db.feedStatus.upsert({
        where: { id: "alerts" },
        create: {
          id: "alerts",
          name: "Service Alerts",
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
      feedId: "alerts",
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      recordsDeleted: 0,
      errors: [errorMessage],
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/ingest/alerts",
    method: "POST",
    description: "Ingests service alerts into the database",
    note: "This endpoint requires database connection",
  });
}

