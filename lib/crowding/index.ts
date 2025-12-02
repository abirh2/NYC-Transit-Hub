/**
 * Crowding System - Main Entry Point
 * Exports both legacy (simple) and enhanced (multi-factor) crowding functions
 */

import type { SubwayLine, RouteCrowding, CrowdingLevel } from "@/types/mta";
import { calculateRouteHeadways } from "./headway";
import { REFERENCE_STATIONS, CROWDING_THRESHOLDS } from "./config";

// Re-export all modules
export { REFERENCE_STATIONS, CROWDING_THRESHOLDS, SCORING_WEIGHTS, SCORE_RANGES } from "./config";
export { calculateRouteHeadways, calculateHeadwaysFromArrivals, calculateSegmentHeadways, normalizeHeadway } from "./headway";
export { getCurrentTimeContext, getTimeContext, getDemandMultiplier, getDemandMultiplierForStation, isPeakDirection, normalizeDemand } from "./demand";
export { getRouteDelays, normalizeDelay, calculateDelayImpact, getDelaySeverity } from "./delays";
export { getRouteAlertImpact, getNetworkAlertImpact, normalizeAlertImpact, getAlertCategory, isStationAffected } from "./alerts";
export { calculateCrowdingScore, scoreToLevel, levelToScore, calculateSegmentScore, getScoreColor, getScoreDescription, getDominantFactor, getDominantFactorExplanation } from "./score";
export { LINE_SEGMENTS, getLineSegments, getSegmentStations, findStationSegment, getTotalSegmentCount } from "./segments";

// Enhanced crowding system  
export { calculateSegmentCrowding, calculateRouteCrowdingEnhanced, getNetworkCrowdingEnhanced } from "./enhanced";

// Export types used by enhanced system
export type { HeadwayData } from "./headway";
export type { DelayData } from "./delays";
export type { AlertImpact } from "./alerts";

// ============================================================================
// Legacy API (Simple Headway-Based Crowding)
// Maintained for backward compatibility
// ============================================================================

/**
 * Calculate crowding for a specific route (legacy simple version)
 * @deprecated Use enhanced segment-level crowding for more accurate results
 */
export async function calculateRouteCrowding(routeId: SubwayLine): Promise<RouteCrowding> {
  const headwayData = await calculateRouteHeadways(routeId);

  if (!headwayData || headwayData.arrivalCount < 2) {
    return createEmptyCrowding(routeId);
  }

  const avgHeadway = headwayData.avgHeadwayMin;

  // Determine level using legacy thresholds
  let level: CrowdingLevel = "LOW";
  if (avgHeadway > CROWDING_THRESHOLDS.HIGH) {
    level = "HIGH";
  } else if (avgHeadway > CROWDING_THRESHOLDS.LOW) {
    level = "MEDIUM";
  }

  return {
    routeId,
    crowdingLevel: level,
    avgHeadwayMin: avgHeadway,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get crowding for all subway routes (legacy simple version)
 * @deprecated Use enhanced network crowding for more accurate results
 */
export async function getNetworkCrowding(): Promise<RouteCrowding[]> {
  const routes = Object.keys(REFERENCE_STATIONS) as SubwayLine[];

  const results = await Promise.all(
    routes.map(route => calculateRouteCrowding(route))
  );

  return results;
}

/**
 * Create empty crowding data when insufficient information
 */
function createEmptyCrowding(routeId: SubwayLine): RouteCrowding {
  return {
    routeId,
    crowdingLevel: "LOW", // Default to low if unknown
    avgHeadwayMin: 0,
    timestamp: new Date().toISOString(),
  };
}

