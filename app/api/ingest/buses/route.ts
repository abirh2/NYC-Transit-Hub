/**
 * Bus Feed Ingestion Endpoint
 * POST /api/ingest/buses
 * 
 * Fetches bus GTFS-RT feeds and stores trip updates in the database.
 * Requires MTA_BUS_API_KEY environment variable.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getBusArrivals, isBusApiConfigured } from "@/lib/mta";
import type { IngestResponse } from "@/types/api";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(): Promise<NextResponse<IngestResponse>> {
  const startTime = Date.now();
  const errors: string[] = [];
  let recordsProcessed = 0;
  let recordsCreated = 0;

  // Check if API key is configured
  if (!isBusApiConfigured()) {
    return NextResponse.json({
      success: false,
      feedId: "buses",
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsDeleted: 0,
      errors: ["MTA_BUS_API_KEY environment variable not configured"],
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }, { status: 400 });
  }

  try {
    // Fetch bus arrivals
    const arrivals = await getBusArrivals();
    recordsProcessed = arrivals.length;

    if (arrivals.length === 0) {
      await db.feedStatus.upsert({
        where: { id: "buses" },
        create: {
          id: "buses",
          name: "Bus GTFS-RT",
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
        feedId: "buses",
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsDeleted: 0,
        errors: [],
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    // Clear old bus data and insert fresh
    // (Bus data is very real-time, no need for update logic)
    await db.busTrip.deleteMany({});

    // Insert new records
    for (const arrival of arrivals) {
      try {
        await db.busTrip.create({
          data: {
            vehicleId: arrival.vehicleId,
            tripId: arrival.tripId,
            routeId: arrival.routeId,
            latitude: arrival.latitude,
            longitude: arrival.longitude,
            bearing: arrival.bearing,
            nextStopId: arrival.nextStopId,
            nextStopName: arrival.nextStopName,
            arrivalTime: arrival.arrivalTime,
            distanceFromStop: arrival.distanceFromStop,
            progressStatus: arrival.progressStatus,
            feedTimestamp: new Date(),
          },
        });
        recordsCreated++;
      } catch (err) {
        // Skip duplicate key errors (can happen with upsert race conditions)
        if (String(err).includes("Unique constraint")) {
          continue;
        }
        errors.push(`Failed to insert bus trip: ${err}`);
      }
    }

    // Update feed status
    await db.feedStatus.upsert({
      where: { id: "buses" },
      create: {
        id: "buses",
        name: "Bus GTFS-RT",
        lastFetch: new Date(),
        lastSuccess: new Date(),
        recordCount: arrivals.length,
      },
      update: {
        lastFetch: new Date(),
        lastSuccess: new Date(),
        lastError: errors.length > 0 ? errors[0] : null,
        recordCount: arrivals.length,
      },
    });

    return NextResponse.json({
      success: errors.length === 0,
      feedId: "buses",
      recordsProcessed,
      recordsCreated,
      recordsUpdated: 0,
      recordsDeleted: 0,
      errors,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    try {
      await db.feedStatus.upsert({
        where: { id: "buses" },
        create: {
          id: "buses",
          name: "Bus GTFS-RT",
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
      feedId: "buses",
      recordsProcessed,
      recordsCreated,
      recordsUpdated: 0,
      recordsDeleted: 0,
      errors: [errorMessage],
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function GET() {
  const configured = isBusApiConfigured();
  
  return NextResponse.json({
    endpoint: "/api/ingest/buses",
    method: "POST",
    description: "Ingests bus GTFS-RT feeds into the database",
    apiKeyConfigured: configured,
    note: configured 
      ? "API key is configured" 
      : "Set MTA_BUS_API_KEY environment variable to enable",
  });
}

