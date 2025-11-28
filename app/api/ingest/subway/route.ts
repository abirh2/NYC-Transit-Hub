/**
 * Subway Feed Ingestion Endpoint
 * POST /api/ingest/subway
 * 
 * Fetches all subway GTFS-RT feeds and stores trip updates in the database.
 * This endpoint should be called periodically (every 30-60 seconds) via cron.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchAllSubwayFeeds, extractArrivals, getFeedTimestamp } from "@/lib/mta";
import type { IngestResponse } from "@/types/api";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // 30 second timeout

export async function POST(): Promise<NextResponse<IngestResponse>> {
  const startTime = Date.now();
  const errors: string[] = [];
  let recordsProcessed = 0;
  let recordsCreated = 0;

  try {
    // Fetch all subway feeds in parallel
    const feeds = await fetchAllSubwayFeeds();
    
    if (feeds.size === 0) {
      return NextResponse.json({
        success: false,
        feedId: "subway",
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsDeleted: 0,
        errors: ["Failed to fetch any subway feeds"],
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }

    // Process each feed
    for (const [feedId, feed] of feeds) {
      try {
        const arrivals = extractArrivals(feed);
        const feedTimestamp = getFeedTimestamp(feed);
        recordsProcessed += arrivals.length;

        // Upsert each arrival to the database
        for (const arrival of arrivals) {
          try {
            await db.realtimeTrip.upsert({
              where: {
                tripId_nextStopId: {
                  tripId: arrival.tripId,
                  nextStopId: arrival.stopId,
                },
              },
              create: {
                tripId: arrival.tripId,
                routeId: arrival.routeId,
                direction: arrival.direction,
                headsign: arrival.headsign,
                nextStopId: arrival.stopId,
                arrivalTime: arrival.arrivalTime,
                departureTime: arrival.departureTime,
                delay: arrival.delay,
                isAssigned: arrival.isAssigned,
                feedTimestamp,
              },
              update: {
                routeId: arrival.routeId,
                direction: arrival.direction,
                headsign: arrival.headsign,
                arrivalTime: arrival.arrivalTime,
                departureTime: arrival.departureTime,
                delay: arrival.delay,
                isAssigned: arrival.isAssigned,
                feedTimestamp,
              },
            });
            recordsCreated++; // Simplified - could track upsert type
          } catch (err) {
            errors.push(`Failed to upsert trip ${arrival.tripId}: ${err}`);
          }
        }
      } catch (err) {
        errors.push(`Failed to process feed ${feedId}: ${err}`);
      }
    }

    // Clean up old records (older than 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const deleted = await db.realtimeTrip.deleteMany({
      where: {
        arrivalTime: {
          lt: twoHoursAgo,
        },
      },
    });

    // Update feed status
    await db.feedStatus.upsert({
      where: { id: "subway" },
      create: {
        id: "subway",
        name: "Subway GTFS-RT",
        lastFetch: new Date(),
        lastSuccess: new Date(),
        recordCount: recordsProcessed,
      },
      update: {
        lastFetch: new Date(),
        lastSuccess: new Date(),
        lastError: errors.length > 0 ? errors[0] : null,
        recordCount: recordsProcessed,
      },
    });

    return NextResponse.json({
      success: errors.length === 0,
      feedId: "subway",
      recordsProcessed,
      recordsCreated,
      recordsUpdated: 0,
      recordsDeleted: deleted.count,
      errors,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Try to update feed status with error
    try {
      await db.feedStatus.upsert({
        where: { id: "subway" },
        create: {
          id: "subway",
          name: "Subway GTFS-RT",
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
      feedId: "subway",
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

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/ingest/subway",
    method: "POST",
    description: "Ingests all subway GTFS-RT feeds into the database",
    note: "This endpoint requires database connection",
  });
}

