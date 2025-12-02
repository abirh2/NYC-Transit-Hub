/**
 * Enhanced Crowding System
 * Multi-factor, segment-level crowding analysis
 */

import type { SubwayLine, SegmentCrowding, NetworkCrowding, RouteCrowdingEnhanced, Direction } from "@/types/mta";
import { calculateSegmentHeadways } from "./headway";
import { getCurrentTimeContext, getDemandMultiplier, isPeakDirection } from "./demand";
import { getRouteDelays } from "./delays";
import { getRouteAlertImpact } from "./alerts";
import { calculateCrowdingScore, calculateSegmentScore } from "./score";
import { getLineSegments, getSegmentStations } from "./segments";

// ============================================================================
// Segment-Level Crowding
// ============================================================================

/**
 * Calculate crowding for a single segment of a line
 */
export async function calculateSegmentCrowding(
  routeId: SubwayLine,
  segmentId: string,
  segmentName: string,
  direction: Direction
): Promise<SegmentCrowding | null> {
  const stations = getSegmentStations(routeId, segmentId);
  if (stations.length === 0) {
    return null;
  }

  // Get time context
  const timeContext = getCurrentTimeContext();
  timeContext.isPeakDirection = isPeakDirection(direction, timeContext.hour, timeContext.dayOfWeek);

  // Fetch headways for stations in this segment
  const headwayMap = await calculateSegmentHeadways(routeId, stations);

  // Get delays and alerts for the route
  const [delayData, alertImpact] = await Promise.all([
    getRouteDelays(routeId),
    getRouteAlertImpact(routeId),
  ]);

  // Calculate scores for each station
  const stationScores = [];
  for (const [, headwayData] of headwayMap.entries()) {
    const demandMultiplier = getDemandMultiplier(timeContext.hour, timeContext.dayOfWeek);

    const result = calculateCrowdingScore(
      headwayData.avgHeadwayMin,
      demandMultiplier,
      delayData,
      alertImpact,
      timeContext
    );

    stationScores.push(result);
  }

  // If no valid scores, return null
  if (stationScores.length === 0) {
    return null;
  }

  // Calculate segment-level aggregates
  const segmentResult = calculateSegmentScore(stationScores);

  return {
    routeId,
    mode: "subway",
    direction,
    segmentId,
    segmentName,
    segmentStart: stations[0],
    segmentEnd: stations[stations.length - 1],
    crowdingLevel: segmentResult.level,
    crowdingScore: segmentResult.avgScore,
    factors: segmentResult.avgFactors,
    timestamp: new Date().toISOString(),
    stationsInSegment: stations,
  };
}

/**
 * Calculate crowding for all segments of a specific route
 * Optimized: Only calculate for first segment in each direction as a sample
 */
export async function calculateRouteCrowdingEnhanced(
  routeId: SubwayLine
): Promise<RouteCrowdingEnhanced | null> {
  const segments = getLineSegments(routeId);
  if (segments.length === 0) {
    return null;
  }

  // OPTIMIZATION: Only calculate first 2 segments to reduce API load
  // Full segment analysis can be done on-demand for specific routes
  const sampledSegments = segments.slice(0, Math.min(2, segments.length));
  
  const segmentPromises: Promise<SegmentCrowding | null>[] = [];

  for (const segment of sampledSegments) {
    // Calculate for both northbound and southbound
    segmentPromises.push(
      calculateSegmentCrowding(routeId, segment.id, segment.name, "N"),
      calculateSegmentCrowding(routeId, segment.id, segment.name, "S")
    );
  }

  const segmentResults = (await Promise.all(segmentPromises)).filter(
    (s): s is SegmentCrowding => s !== null
  );

  if (segmentResults.length === 0) {
    return null;
  }

  // Calculate route-level averages
  const avgScore = Math.round(
    segmentResults.reduce((sum, s) => sum + s.crowdingScore, 0) / segmentResults.length
  );

  const avgLevel = avgScore < 34 ? "LOW" : avgScore < 67 ? "MEDIUM" : "HIGH";

  return {
    routeId,
    mode: "subway",
    avgScore,
    avgLevel,
    segments: segmentResults,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Calculate network-wide crowding (enhanced version)
 * Optimized with reduced API calls
 */
export async function getNetworkCrowdingEnhanced(): Promise<NetworkCrowding> {
  const subwayLines: SubwayLine[] = [
    "1", "2", "3", "4", "5", "6", "7",
    "A", "C", "E", "B", "D", "F", "M",
    "G", "J", "Z", "L", "N", "Q", "R", "W",
    "S", "SF", "SR", "SIR"
  ];

  // Process in smaller batches to avoid overwhelming the API
  const BATCH_SIZE = 5;
  const batches: SubwayLine[][] = [];
  for (let i = 0; i < subwayLines.length; i += BATCH_SIZE) {
    batches.push(subwayLines.slice(i, i + BATCH_SIZE));
  }

  const routeResults: RouteCrowdingEnhanced[] = [];
  for (const batch of batches) {
    const batchPromises = batch.map(routeId =>
      calculateRouteCrowdingEnhanced(routeId)
    );
    const batchResults = (await Promise.all(batchPromises)).filter(
      (r): r is RouteCrowdingEnhanced => r !== null
    );
    routeResults.push(...batchResults);
  }

  // Calculate network-wide averages
  const avgScore = routeResults.length > 0
    ? Math.round(
        routeResults.reduce((sum, r) => sum + r.avgScore, 0) / routeResults.length
      )
    : 0;

  const avgLevel = avgScore < 34 ? "LOW" : avgScore < 67 ? "MEDIUM" : "HIGH";

  return {
    avgScore,
    avgLevel,
    timestamp: new Date().toISOString(),
    routes: routeResults,
  };
}

