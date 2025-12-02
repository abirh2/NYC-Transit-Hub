/**
 * Crowding System Configuration
 * Reference stations and thresholds
 */

import type { SubwayLine, CrowdingLevel } from "@/types/mta";

// ============================================================================
// Reference Stations
// ============================================================================

/**
 * Reference stations for headway measurement
 * These are typically mid-town / busy stations with high traffic
 * We use the parent station ID (without N/S suffix)
 */
export const REFERENCE_STATIONS: Record<SubwayLine, string> = {
  "1": "127", // Times Sq - 42 St
  "2": "127", // Times Sq - 42 St
  "3": "127", // Times Sq - 42 St
  "4": "631", // Grand Central - 42 St
  "5": "631", // Grand Central - 42 St
  "6": "631", // Grand Central - 42 St
  "7": "723", // Grand Central - 42 St
  "A": "A27", // 42 St - Port Authority
  "C": "A27", // 42 St - Port Authority
  "E": "A27", // 42 St - Port Authority
  "B": "D16", // 42 St - Bryant Pk
  "D": "D16", // 42 St - Bryant Pk
  "F": "D16", // 42 St - Bryant Pk
  "M": "D16", // 42 St - Bryant Pk
  "N": "R16", // Times Sq - 42 St
  "Q": "R16", // Times Sq - 42 St
  "R": "R16", // Times Sq - 42 St
  "W": "R16", // Times Sq - 42 St
  "L": "L03", // 14 St - Union Sq
  "G": "G24", // Metropolitan Av
  "J": "M22", // Canal St
  "Z": "M22", // Canal St
  "S": "901", // Grand Central (Shuttle) - using 42 St shuttle ID
  "SIR": "S01", // St. George
  "SF": "S01", // Franklin Av (placeholder)
  "SR": "S01", // Rockaway Park (placeholder)
};

// ============================================================================
// Thresholds
// ============================================================================

/**
 * Headway thresholds for crowding levels (in minutes)
 */
export const CROWDING_THRESHOLDS = {
  LOW: 6,      // < 6 mins headway
  MEDIUM: 12,  // 6-12 mins headway
  HIGH: 12,    // > 12 mins headway
};

/**
 * Score range definitions (0-100 scale)
 */
export const SCORE_RANGES: Record<CrowdingLevel, { min: number; max: number }> = {
  LOW: { min: 0, max: 33 },
  MEDIUM: { min: 34, max: 66 },
  HIGH: { min: 67, max: 100 },
};

/**
 * Scoring weights for multi-factor algorithm
 */
export const SCORING_WEIGHTS = {
  headway: 0.35,   // Train frequency
  demand: 0.35,    // Time-of-day demand
  delay: 0.20,     // Service delays
  alerts: 0.10,    // Active service alerts
};

