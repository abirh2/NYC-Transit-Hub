/**
 * Multi-Factor Crowding Score Module
 * Combines headway, demand, delay, and alert data into a comprehensive crowding score
 */

import type { CrowdingFactors, CrowdingLevel, TimeContext } from "@/types/mta";
import { SCORING_WEIGHTS, SCORE_RANGES } from "./config";
import { normalizeHeadway } from "./headway";
import { normalizeDemand } from "./demand";
import { normalizeDelay, type DelayData } from "./delays";
import { normalizeAlertImpact, type AlertImpact } from "./alerts";

// ============================================================================
// Score Calculation
// ============================================================================

/**
 * Calculate comprehensive crowding score from all factors
 * Returns 0-100 scale
 */
export function calculateCrowdingScore(
  avgHeadwayMin: number,
  demandMultiplier: number,
  delayData: DelayData | null,
  alertImpact: AlertImpact | null,
  timeContext: TimeContext
): {
  score: number;
  level: CrowdingLevel;
  factors: CrowdingFactors;
} {
  // Normalize each factor to 0-1 scale
  const headwayFactor = normalizeHeadway(avgHeadwayMin);
  const demandFactor = normalizeDemand(demandMultiplier);
  const delayFactor = delayData ? normalizeDelay(delayData.avgDelaySeconds) : 0;
  const alertFactor = alertImpact ? normalizeAlertImpact(alertImpact) : 0;

  // Apply weights
  const weightedScore =
    (headwayFactor * SCORING_WEIGHTS.headway) +
    (demandFactor * SCORING_WEIGHTS.demand) +
    (delayFactor * SCORING_WEIGHTS.delay) +
    (alertFactor * SCORING_WEIGHTS.alerts);

  // Adjust for peak direction
  let finalScore = weightedScore;
  if (timeContext.isPeakDirection) {
    // Peak direction gets a 1.2x multiplier (capped at 1.0)
    finalScore = Math.min(weightedScore * 1.2, 1.0);
  }

  // Convert to 0-100 scale
  const score = Math.round(finalScore * 100);

  // Determine level
  const level = scoreToLevel(score);

  return {
    score,
    level,
    factors: {
      headway: Math.round(headwayFactor * 100) / 100,
      demand: Math.round(demandFactor * 100) / 100,
      delay: Math.round(delayFactor * 100) / 100,
      alerts: Math.round(alertFactor * 100) / 100,
    },
  };
}

/**
 * Convert numerical score to crowding level
 */
export function scoreToLevel(score: number): CrowdingLevel {
  if (score >= SCORE_RANGES.HIGH.min) {
    return "HIGH";
  } else if (score >= SCORE_RANGES.MEDIUM.min) {
    return "MEDIUM";
  } else {
    return "LOW";
  }
}

/**
 * Convert crowding level to score range midpoint
 */
export function levelToScore(level: CrowdingLevel): number {
  const range = SCORE_RANGES[level];
  return Math.floor((range.min + range.max) / 2);
}

// ============================================================================
// Segment Scoring
// ============================================================================

/**
 * Calculate crowding score for a segment based on multiple station samples
 */
export function calculateSegmentScore(
  stationScores: Array<{
    score: number;
    factors: CrowdingFactors;
  }>
): {
  avgScore: number;
  avgFactors: CrowdingFactors;
  level: CrowdingLevel;
} {
  if (stationScores.length === 0) {
    return {
      avgScore: 0,
      avgFactors: { headway: 0, demand: 0, delay: 0, alerts: 0 },
      level: "LOW",
    };
  }

  // Calculate averages
  const avgScore = Math.round(
    stationScores.reduce((sum, s) => sum + s.score, 0) / stationScores.length
  );

  const avgFactors: CrowdingFactors = {
    headway: stationScores.reduce((sum, s) => sum + s.factors.headway, 0) / stationScores.length,
    demand: stationScores.reduce((sum, s) => sum + s.factors.demand, 0) / stationScores.length,
    delay: stationScores.reduce((sum, s) => sum + s.factors.delay, 0) / stationScores.length,
    alerts: stationScores.reduce((sum, s) => sum + s.factors.alerts, 0) / stationScores.length,
  };

  // Round factors
  avgFactors.headway = Math.round(avgFactors.headway * 100) / 100;
  avgFactors.demand = Math.round(avgFactors.demand * 100) / 100;
  avgFactors.delay = Math.round(avgFactors.delay * 100) / 100;
  avgFactors.alerts = Math.round(avgFactors.alerts * 100) / 100;

  return {
    avgScore,
    avgFactors,
    level: scoreToLevel(avgScore),
  };
}

// ============================================================================
// Score Utilities
// ============================================================================

/**
 * Get score color for UI display
 */
export function getScoreColor(score: number): "success" | "warning" | "danger" {
  if (score < SCORE_RANGES.MEDIUM.min) {
    return "success";
  } else if (score < SCORE_RANGES.HIGH.min) {
    return "warning";
  } else {
    return "danger";
  }
}

/**
 * Get human-readable score description
 */
export function getScoreDescription(score: number, level: CrowdingLevel): string {
  if (level === "LOW") {
    return "Good service - low crowding expected";
  } else if (level === "MEDIUM") {
    if (score < 50) {
      return "Moderate crowding - still manageable";
    } else {
      return "Busy - expect some crowding";
    }
  } else {
    if (score < 85) {
      return "Heavy crowding - consider alternatives";
    } else {
      return "Severe crowding - major delays or service issues";
    }
  }
}

/**
 * Get dominant factor (the one contributing most to crowding)
 */
export function getDominantFactor(factors: CrowdingFactors): {
  factor: keyof CrowdingFactors;
  value: number;
} {
  const entries = Object.entries(factors) as [keyof CrowdingFactors, number][];
  
  // Find the factor with highest value
  const dominant = entries.reduce((max, [key, value]) => {
    return value > max.value ? { factor: key, value } : max;
  }, { factor: "headway" as keyof CrowdingFactors, value: 0 });

  return dominant;
}

/**
 * Get human-readable dominant factor explanation
 */
export function getDominantFactorExplanation(factor: keyof CrowdingFactors): string {
  switch (factor) {
    case "headway":
      return "Long gaps between trains";
    case "demand":
      return "High passenger demand";
    case "delay":
      return "Service delays";
    case "alerts":
      return "Active service disruptions";
    default:
      return "Multiple factors";
  }
}

