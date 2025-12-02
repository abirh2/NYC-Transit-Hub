/**
 * Time-of-Day Demand Module
 * Uses historical ridership patterns to estimate demand at different times
 */

import demandData from "@/data/crowding/demand-patterns.json";
import type { TimeContext } from "@/types/mta";

// ============================================================================
// Types
// ============================================================================

interface DemandPatterns {
  patterns: Record<string, Record<string, Record<string, number>>>;
  rushHourInfo: {
    rushHours: Record<string, { hours: number[]; days: number[] }>;
    avgRushDemand: number;
    avgOffPeakDemand: number;
    rushMultiplier: number;
  };
  metadata: {
    maxRidership: number;
    stationCount: number;
    generatedAt: string;
    dataRange: string;
    note?: string;
  };
}

const patterns = demandData as DemandPatterns;

// ============================================================================
// Time Context
// ============================================================================

/**
 * Get time context for the current moment
 */
export function getCurrentTimeContext(): TimeContext {
  const now = new Date();
  return getTimeContext(now);
}

/**
 * Get time context for a specific time
 */
export function getTimeContext(date: Date): TimeContext {
  const hour = date.getHours();
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

  const isRushHour = checkIsRushHour(hour, dayOfWeek);
  const isPeakDirection = false; // Will be set by caller based on direction
  const demandMultiplier = getDemandMultiplier(hour, dayOfWeek);

  return {
    hour,
    dayOfWeek,
    isRushHour,
    isPeakDirection,
    demandMultiplier,
  };
}

/**
 * Check if current time is rush hour
 */
export function checkIsRushHour(hour: number, dayOfWeek: number): boolean {
  const { rushHours } = patterns.rushHourInfo;

  for (const period in rushHours) {
    const { hours, days } = rushHours[period];
    if (days.includes(dayOfWeek) && hours.includes(hour)) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// Demand Calculation
// ============================================================================

/**
 * Get demand multiplier for a specific station, hour, and day
 * Returns 0-1 scale where 1.0 = peak demand
 */
export function getDemandMultiplierForStation(
  stationComplex: string,
  hour: number,
  dayOfWeek: number
): number {
  // Check if we have patterns for this station
  if (!patterns.patterns[stationComplex]) {
    // Fallback to generic rush hour logic
    return getDemandMultiplier(hour, dayOfWeek);
  }

  const stationPatterns = patterns.patterns[stationComplex];

  // Check if we have data for this day and hour
  if (stationPatterns[dayOfWeek] && stationPatterns[dayOfWeek][hour] !== undefined) {
    return stationPatterns[dayOfWeek][hour];
  }

  // Fallback to generic
  return getDemandMultiplier(hour, dayOfWeek);
}

/**
 * Get generic demand multiplier based on time of day
 * Used when station-specific data unavailable
 */
export function getDemandMultiplier(hour: number, dayOfWeek: number): number {
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  if (isWeekday) {
    // Weekday pattern
    if (hour >= 7 && hour <= 9) {
      return 0.9; // Morning rush
    } else if (hour >= 17 && hour <= 19) {
      return 0.95; // Evening rush
    } else if (hour >= 10 && hour <= 16) {
      return 0.45; // Midday
    } else if (hour >= 20 && hour <= 22) {
      return 0.4; // Evening
    } else if (hour >= 23 || hour <= 5) {
      return 0.1; // Late night/early morning
    } else {
      return 0.25; // Early morning (6am)
    }
  } else {
    // Weekend pattern
    if (hour >= 12 && hour <= 18) {
      return 0.65; // Weekend afternoon/evening
    } else if (hour >= 9 && hour <= 11) {
      return 0.4; // Weekend morning
    } else if (hour >= 19 && hour <= 22) {
      return 0.45; // Weekend evening
    } else {
      return 0.15; // Weekend late night
    }
  }
}

/**
 * Check if direction is peak direction for current time
 * Peak direction: Inbound AM, Outbound PM
 */
export function isPeakDirection(
  direction: "N" | "S" | "E" | "W" | "inbound" | "outbound",
  hour: number,
  dayOfWeek: number
): boolean {
  // Only apply to weekdays
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // Convert compass directions to inbound/outbound
  // For NYC: North/East generally = away from Manhattan, South/West = toward Manhattan
  const isInbound = direction === "S" || direction === "W" || direction === "inbound";
  const isOutbound = direction === "N" || direction === "E" || direction === "outbound";

  // Morning rush (7-10am): Inbound is peak
  if (hour >= 7 && hour <= 10) {
    return isInbound;
  }

  // Evening rush (5-8pm): Outbound is peak
  if (hour >= 17 && hour <= 20) {
    return isOutbound;
  }

  return false;
}

/**
 * Normalize demand to 0-1 scale for scoring
 * Already normalized in our data, but this allows for adjustments
 */
export function normalizeDemand(demandMultiplier: number): number {
  return Math.min(Math.max(demandMultiplier, 0), 1);
}

// ============================================================================
// Metadata
// ============================================================================

/**
 * Get demand pattern metadata
 */
export function getDemandMetadata() {
  return patterns.metadata;
}

/**
 * Get rush hour configuration
 */
export function getRushHourInfo() {
  return patterns.rushHourInfo;
}

