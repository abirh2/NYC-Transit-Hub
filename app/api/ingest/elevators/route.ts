/**
 * Elevator/Escalator Status Ingestion Endpoint
 * POST /api/ingest/elevators
 * 
 * Fetches elevator/escalator outage data and stores it in the database.
 * This endpoint should be called periodically (every 5-10 minutes) via cron.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchCurrentOutages, fetchAllEquipment } from "@/lib/mta";
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
    // Fetch current outages and all equipment in parallel
    const [outages, allEquipment] = await Promise.all([
      fetchCurrentOutages(),
      fetchAllEquipment(),
    ]);

    // Create a map of equipment IDs that have outages
    const outageIds = new Set(outages.map(o => o.equipmentId));
    
    // Combine equipment data with outage status
    const combinedData = allEquipment.map(eq => {
      const outage = outages.find(o => o.equipmentId === eq.equipmentId);
      return {
        ...eq,
        isActive: !outageIds.has(eq.equipmentId),
        outageReason: outage?.outageReason ?? null,
        outageStartTime: outage?.outageStartTime ?? null,
        estimatedReturn: outage?.estimatedReturn ?? null,
      };
    });

    // Also add any outages for equipment not in the equipment list
    for (const outage of outages) {
      if (!allEquipment.find(eq => eq.equipmentId === outage.equipmentId)) {
        combinedData.push(outage);
      }
    }

    recordsProcessed = combinedData.length;

    // Upsert each equipment status
    for (const equipment of combinedData) {
      try {
        const existing = await db.elevatorStatus.findUnique({
          where: { equipmentId: equipment.equipmentId },
        });

        await db.elevatorStatus.upsert({
          where: { equipmentId: equipment.equipmentId },
          create: {
            equipmentId: equipment.equipmentId,
            stationName: equipment.stationName,
            equipmentType: equipment.equipmentType,
            serving: equipment.serving,
            adaCompliant: equipment.adaCompliant,
            isActive: equipment.isActive,
            outageReason: equipment.outageReason,
            outageStartTime: equipment.outageStartTime,
            estimatedReturn: equipment.estimatedReturn,
          },
          update: {
            stationName: equipment.stationName,
            equipmentType: equipment.equipmentType,
            serving: equipment.serving,
            adaCompliant: equipment.adaCompliant,
            isActive: equipment.isActive,
            outageReason: equipment.outageReason,
            outageStartTime: equipment.outageStartTime,
            estimatedReturn: equipment.estimatedReturn,
          },
        });

        if (existing) {
          recordsUpdated++;
        } else {
          recordsCreated++;
        }
      } catch (err) {
        errors.push(`Failed to upsert equipment ${equipment.equipmentId}: ${err}`);
      }
    }

    // Update feed status
    await db.feedStatus.upsert({
      where: { id: "elevators" },
      create: {
        id: "elevators",
        name: "Elevator/Escalator Status",
        lastFetch: new Date(),
        lastSuccess: new Date(),
        recordCount: outages.length,
      },
      update: {
        lastFetch: new Date(),
        lastSuccess: new Date(),
        lastError: errors.length > 0 ? errors[0] : null,
        recordCount: outages.length,
      },
    });

    return NextResponse.json({
      success: errors.length === 0,
      feedId: "elevators",
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      recordsDeleted: 0,
      errors,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    try {
      await db.feedStatus.upsert({
        where: { id: "elevators" },
        create: {
          id: "elevators",
          name: "Elevator/Escalator Status",
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
      feedId: "elevators",
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
    endpoint: "/api/ingest/elevators",
    method: "POST",
    description: "Ingests elevator/escalator status into the database",
    note: "This endpoint requires database connection",
  });
}

