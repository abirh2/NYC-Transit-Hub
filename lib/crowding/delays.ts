/**
 * Delay Impact Module
 * Extracts and normalizes delay information from GTFS-RT feeds
 */

import { fetchSubwayFeed } from "@/lib/mta/gtfs-rt";
import { SUBWAY_LINE_TO_FEED_MAP } from "@/lib/mta/config";
import type { SubwayLine } from "@/types/mta";

// ============================================================================
// Types
// ============================================================================

export interface DelayData {
  avgDelaySeconds: number;
  delayedTripsCount: number;
  totalTripsChecked: number;
  maxDelay: number;
  percentDelayed: number;
}

// ============================================================================
// Delay Extraction
// ============================================================================

/**
 * Get delay information for a specific route
 */
export async function getRouteDelays(routeId: SubwayLine): Promise<DelayData | null> {
  const feedKey = SUBWAY_LINE_TO_FEED_MAP[routeId];
  if (!feedKey) {
    return null;
  }

  const feed = await fetchSubwayFeed(feedKey);
  if (!feed) {
    return null;
  }

  const delays: number[] = [];
  let totalTrips = 0;
  let delayedTrips = 0;

  for (const entity of feed.entity) {
    if (!entity.tripUpdate) continue;

    const tripUpdate = entity.tripUpdate;
    const trip = tripUpdate.trip;

    // Filter for this specific route
    if (trip.routeId !== routeId) {
      continue;
    }

    totalTrips++;

    // Check trip-level delay
    const tripDelay = tripUpdate.delay || 0;
    
    if (tripDelay !== 0) {
      delays.push(tripDelay);
    }

    // Also check stop-level delays
    for (const stopTime of tripUpdate.stopTimeUpdate) {
      const stopDelay = stopTime.arrival?.delay || 0;
      if (stopDelay > 0) {
        delays.push(stopDelay);
        delayedTrips++;
        break; // Count trip only once
      }
    }
  }

  if (totalTrips === 0) {
    return null;
  }

  const avgDelay = delays.length > 0
    ? delays.reduce((sum, d) => sum + d, 0) / delays.length
    : 0;

  const maxDelay = delays.length > 0 ? Math.max(...delays) : 0;

  return {
    avgDelaySeconds: Math.round(avgDelay),
    delayedTripsCount: delayedTrips,
    totalTripsChecked: totalTrips,
    maxDelay,
    percentDelayed: totalTrips > 0 ? (delayedTrips / totalTrips) * 100 : 0,
  };
}

/**
 * Normalize delay to 0-1 scale for scoring
 * 0 = on-time, 1 = significant delays
 */
export function normalizeDelay(avgDelaySeconds: number): number {
  // Delay impact curve:
  // 0-60s (0-1 min) = minimal impact (0.0-0.2)
  // 60-180s (1-3 min) = moderate impact (0.2-0.5)
  // 180-300s (3-5 min) = high impact (0.5-0.8)
  // 300+ (5+ min) = severe impact (0.8-1.0)

  if (avgDelaySeconds <= 0) {
    return 0;
  }

  if (avgDelaySeconds <= 60) {
    return avgDelaySeconds / 300; // 0-0.2
  } else if (avgDelaySeconds <= 180) {
    return 0.2 + ((avgDelaySeconds - 60) / 400); // 0.2-0.5
  } else if (avgDelaySeconds <= 300) {
    return 0.5 + ((avgDelaySeconds - 180) / 400); // 0.5-0.8
  } else {
    // Cap at 1.0
    return Math.min(0.8 + ((avgDelaySeconds - 300) / 1500), 1.0);
  }
}

/**
 * Calculate delay impact considering both magnitude and frequency
 */
export function calculateDelayImpact(delayData: DelayData): number {
  // Weight both the average delay and the percentage of delayed trains
  const delayMagnitude = normalizeDelay(delayData.avgDelaySeconds);
  const delayFrequency = delayData.percentDelayed / 100;

  // Combine: 60% magnitude, 40% frequency
  return (delayMagnitude * 0.6) + (delayFrequency * 0.4);
}

/**
 * Get delay severity category
 */
export function getDelaySeverity(avgDelaySeconds: number): "none" | "minor" | "moderate" | "major" | "severe" {
  if (avgDelaySeconds <= 0) return "none";
  if (avgDelaySeconds <= 60) return "minor";
  if (avgDelaySeconds <= 180) return "moderate";
  if (avgDelaySeconds <= 300) return "major";
  return "severe";
}

