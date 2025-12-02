/**
 * Crowding System - Legacy Entry Point
 * 
 * This file maintained for backward compatibility.
 * New code should import from @/lib/crowding/ directly.
 * 
 * The crowding system has been refactored into a module:
 * - lib/crowding/index.ts - Main exports
 * - lib/crowding/headway.ts - Headway calculation
 * - lib/crowding/config.ts - Configuration
 * - lib/crowding/demand.ts - Time-of-day demand patterns
 * - lib/crowding/delays.ts - Delay impact
 * - lib/crowding/alerts.ts - Alert severity
 * - lib/crowding/score.ts - Multi-factor scoring
 * - lib/crowding/segments.ts - Segment definitions
 */

// Re-export everything from the new module structure
export * from "./crowding/index";
