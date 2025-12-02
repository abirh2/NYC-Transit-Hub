/**
 * Headway Calculation Module
 * Calculates train headways (time between trains) from GTFS-RT data
 */

import { extractArrivals, fetchSubwayFeed } from "@/lib/mta/gtfs-rt";
import { SUBWAY_LINE_TO_FEED_MAP } from "@/lib/mta/config";
import type { SubwayLine, TrainArrival } from "@/types/mta";
import { REFERENCE_STATIONS } from "./config";

// ============================================================================
// Types
// ============================================================================

export interface HeadwayData {
  avgHeadwayMin: number;
  headwaysByDirection: {
    northbound: number[];
    southbound: number[];
  };
  arrivalCount: number;
}

// ============================================================================
// Headway Calculation
// ============================================================================

/**
 * Calculate headways for a specific route at a reference station
 */
export async function calculateRouteHeadways(
  routeId: SubwayLine,
  stationId?: string
): Promise<HeadwayData | null> {
  const feedKey = SUBWAY_LINE_TO_FEED_MAP[routeId];
  if (!feedKey) {
    return null;
  }

  const feed = await fetchSubwayFeed(feedKey);
  if (!feed) {
    return null;
  }

  const targetStation = stationId || REFERENCE_STATIONS[routeId];
  if (!targetStation) {
    return null;
  }

  // Get arrivals for this route at the station
  const arrivals = extractArrivals(feed, {
    stationId: targetStation,
    routeId,
    limit: 8, // Look at next 8 trains
  });

  if (arrivals.length < 2) {
    return null;
  }

  return calculateHeadwaysFromArrivals(arrivals);
}

/**
 * Calculate headways from a list of train arrivals
 */
export function calculateHeadwaysFromArrivals(arrivals: TrainArrival[]): HeadwayData {
  const northArrivals = arrivals.filter(a => a.direction === "N");
  const southArrivals = arrivals.filter(a => a.direction === "S");

  const northHeadways = calculateDirectionHeadways(northArrivals);
  const southHeadways = calculateDirectionHeadways(southArrivals);

  const allHeadways = [...northHeadways, ...southHeadways];
  const avgHeadway = allHeadways.length > 0
    ? allHeadways.reduce((sum, val) => sum + val, 0) / allHeadways.length
    : 0;

  return {
    avgHeadwayMin: Math.round(avgHeadway * 10) / 10,
    headwaysByDirection: {
      northbound: northHeadways,
      southbound: southHeadways,
    },
    arrivalCount: arrivals.length,
  };
}

/**
 * Calculate headways for arrivals in a single direction
 */
function calculateDirectionHeadways(arrivals: TrainArrival[]): number[] {
  if (arrivals.length < 2) {
    return [];
  }

  const headways: number[] = [];

  for (let i = 0; i < arrivals.length - 1; i++) {
    const t1 = arrivals[i].arrivalTime.getTime();
    const t2 = arrivals[i + 1].arrivalTime.getTime();
    const diffMin = (t2 - t1) / 1000 / 60;

    // Filter out unrealistic outliers (< 1 min or > 60 min)
    if (diffMin >= 1 && diffMin < 60) {
      headways.push(diffMin);
    }
  }

  return headways;
}

/**
 * Calculate headways across multiple stations for segment analysis
 */
export async function calculateSegmentHeadways(
  routeId: SubwayLine,
  stationIds: string[]
): Promise<Map<string, HeadwayData>> {
  const results = new Map<string, HeadwayData>();

  // Fetch all headways in parallel
  const headwayPromises = stationIds.map(async (stationId) => {
    const data = await calculateRouteHeadways(routeId, stationId);
    return { stationId, data };
  });

  const settled = await Promise.all(headwayPromises);

  for (const { stationId, data } of settled) {
    if (data) {
      results.set(stationId, data);
    }
  }

  return results;
}

/**
 * Normalize headway to 0-1 scale for scoring
 * 0 = frequent service (low crowding)
 * 1 = infrequent service (high crowding)
 */
export function normalizeHeadway(avgHeadwayMin: number): number {
  // Use a sigmoid-like curve
  // 3 min = 0.1, 6 min = 0.3, 12 min = 0.6, 20 min = 0.9
  const normalized = Math.min(avgHeadwayMin / 20, 1.0);
  return Math.round(normalized * 100) / 100;
}

