/**
 * MTA Service Alerts Client
 * Fetches and parses service alerts from MTA JSON feeds
 * 
 * VERIFIED against real API response on 2024-11-28
 * API uses snake_case field names
 */

import { z } from "zod";
import type { ServiceAlert, AlertSeverity, AlertType } from "@/types/mta";
import { ALERT_FEED_URLS } from "./config";

// ============================================================================
// Zod Schemas for Validation (matching actual MTA API response)
// ============================================================================

const TranslationSchema = z.object({
  text: z.string(),
  language: z.string().optional(),
});

const TranslatedStringSchema = z.object({
  translation: z.array(TranslationSchema),
});

const TimeRangeSchema = z.object({
  start: z.number().optional(),
  end: z.number().optional(),
});

// MTA Mercury extension for entity selector
const MercuryEntitySelectorSchema = z.object({
  sort_order: z.string().optional(),
}).optional();

const EntitySelectorSchema = z.object({
  agency_id: z.string().optional(),
  route_id: z.string().optional(),
  route_type: z.number().optional(),
  stop_id: z.string().optional(),
  "transit_realtime.mercury_entity_selector": MercuryEntitySelectorSchema,
});

// MTA Mercury extension for alert
const MercuryAlertSchema = z.object({
  created_at: z.number().optional(),
  updated_at: z.number().optional(),
  alert_type: z.string().optional(),
  display_before_active: z.number().optional(),
  human_readable_active_period: TranslatedStringSchema.optional(),
}).optional();

const AlertSchema = z.object({
  active_period: z.array(TimeRangeSchema).optional(),
  informed_entity: z.array(EntitySelectorSchema).optional(),
  header_text: TranslatedStringSchema.optional(),
  description_text: TranslatedStringSchema.optional(),
  cause: z.string().optional(),
  effect: z.string().optional(),
  severity_level: z.string().optional(),
  "transit_realtime.mercury_alert": MercuryAlertSchema,
});

const AlertEntitySchema = z.object({
  id: z.string(),
  alert: AlertSchema.optional(),
});

// MTA Mercury feed header extension
const MercuryFeedHeaderSchema = z.object({
  mercury_version: z.string().optional(),
}).optional();

const AlertFeedSchema = z.object({
  header: z.object({
    gtfs_realtime_version: z.string(),
    incrementality: z.string().optional(),
    timestamp: z.number(),
    "transit_realtime.mercury_feed_header": MercuryFeedHeaderSchema,
  }),
  entity: z.array(AlertEntitySchema),
});

// Type inference from schema (used for documentation)
// type AlertFeedResponse = z.infer<typeof AlertFeedSchema>;

// ============================================================================
// Alert Fetching
// ============================================================================

/**
 * Fetch alerts from MTA JSON feed
 */
export async function fetchAlerts(
  feed: keyof typeof ALERT_FEED_URLS = "subway"
): Promise<ServiceAlert[]> {
  const url = ALERT_FEED_URLS[feed];
  
  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch alerts: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return parseAlertFeed(data);
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return [];
  }
}

/**
 * Parse and normalize alert feed response
 */
function parseAlertFeed(data: unknown): ServiceAlert[] {
  const result = AlertFeedSchema.safeParse(data);
  
  if (!result.success) {
    console.error("Failed to parse alert feed:", result.error.issues);
    return [];
  }
  
  const alerts: ServiceAlert[] = [];
  
  for (const entity of result.data.entity) {
    if (!entity.alert) continue;
    
    const alert = entity.alert;
    
    // Extract affected routes from informed entities
    const affectedRoutes: string[] = [];
    const affectedStops: string[] = [];
    
    for (const informed of alert.informed_entity ?? []) {
      if (informed.route_id) {
        affectedRoutes.push(informed.route_id);
      }
      if (informed.stop_id) {
        affectedStops.push(informed.stop_id);
      }
    }
    
    // Get translated text (prefer English, skip HTML versions)
    const headerText = getTranslatedText(alert.header_text);
    const descriptionText = getTranslatedText(alert.description_text);
    
    // Skip alerts without header text
    if (!headerText) continue;
    
    // Parse time periods
    const activePeriod = alert.active_period?.[0];
    const activePeriodStart = activePeriod?.start 
      ? new Date(activePeriod.start * 1000) 
      : null;
    const activePeriodEnd = activePeriod?.end 
      ? new Date(activePeriod.end * 1000) 
      : null;
    
    // Get alert type from MTA Mercury extension
    const mercuryAlert = alert["transit_realtime.mercury_alert"];
    const mtaAlertType = mercuryAlert?.alert_type;
    
    // Map severity
    const severity = mapSeverity(alert.severity_level, alert.effect, mtaAlertType);
    
    // Map alert type
    const alertType = mapAlertType(alert.effect, alert.cause, headerText, mtaAlertType);
    
    alerts.push({
      id: entity.id,
      affectedRoutes: [...new Set(affectedRoutes)], // Dedupe
      affectedStops: [...new Set(affectedStops)],
      headerText,
      descriptionText,
      severity,
      alertType,
      activePeriodStart,
      activePeriodEnd,
    });
  }
  
  return alerts;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract text from translated string (prefer English, skip HTML)
 */
function getTranslatedText(
  translatedString: z.infer<typeof TranslatedStringSchema> | undefined
): string | null {
  if (!translatedString?.translation?.length) return null;
  
  // Try to find English translation (not HTML)
  const english = translatedString.translation.find(
    t => (t.language === "en" || !t.language) && !t.language?.includes("html")
  );
  
  return english?.text ?? translatedString.translation[0].text ?? null;
}

/**
 * Map GTFS effect/severity to our severity enum
 */
function mapSeverity(
  severityLevel: string | undefined,
  effect: string | undefined,
  mtaAlertType: string | undefined
): AlertSeverity {
  // Check explicit severity first
  if (severityLevel) {
    const upper = severityLevel.toUpperCase();
    if (upper.includes("SEVERE")) return "SEVERE";
    if (upper.includes("WARNING")) return "WARNING";
    if (upper.includes("INFO")) return "INFO";
  }
  
  // Check MTA alert type
  if (mtaAlertType) {
    const upper = mtaAlertType.toUpperCase();
    if (upper.includes("SUSPEND") || upper.includes("NO SERVICE")) return "SEVERE";
    if (upper.includes("DELAY")) return "WARNING";
  }
  
  // Infer from effect
  if (effect) {
    const upper = effect.toUpperCase();
    if (upper === "NO_SERVICE") return "SEVERE";
    if (upper === "SIGNIFICANT_DELAYS") return "WARNING";
    if (upper === "REDUCED_SERVICE") return "WARNING";
    if (upper === "DETOUR") return "WARNING";
  }
  
  return "INFO";
}

/**
 * Map GTFS effect/cause to our alert type enum
 */
function mapAlertType(
  effect: string | undefined,
  cause: string | undefined,
  headerText: string,
  mtaAlertType: string | undefined
): AlertType {
  const header = headerText.toLowerCase();
  
  // Check MTA-specific alert type first
  if (mtaAlertType) {
    const upper = mtaAlertType.toUpperCase();
    if (upper.includes("DELAY")) return "DELAY";
    if (upper.includes("PLANNED") || upper.includes("SCHEDULE")) return "PLANNED_WORK";
    if (upper.includes("REROUTE") || upper.includes("LOCAL")) return "SERVICE_CHANGE";
    if (upper.includes("SUSPEND")) return "STATION_CLOSURE";
  }
  
  // Check header text for common patterns
  if (header.includes("delay")) return "DELAY";
  if (header.includes("planned work") || header.includes("planned service change")) return "PLANNED_WORK";
  if (header.includes("shuttle") && header.includes("bus")) return "SHUTTLE_BUS";
  if (header.includes("station closed") || header.includes("bypass")) return "STATION_CLOSURE";
  if (header.includes("reroute") || header.includes("detour")) return "DETOUR";
  if (header.includes("running on the local") || header.includes("express to local")) return "SERVICE_CHANGE";
  
  // Check effect
  if (effect) {
    const upper = effect.toUpperCase();
    if (upper === "DETOUR") return "DETOUR";
    if (upper === "NO_SERVICE") return "STATION_CLOSURE";
    if (upper === "REDUCED_SERVICE") return "REDUCED_SERVICE";
    if (upper === "SIGNIFICANT_DELAYS") return "DELAY";
    if (upper === "MODIFIED_SERVICE") return "SERVICE_CHANGE";
  }
  
  // Check cause
  if (cause) {
    const upper = cause.toUpperCase();
    if (upper === "CONSTRUCTION" || upper === "MAINTENANCE") return "PLANNED_WORK";
  }
  
  return "OTHER";
}

/**
 * Filter alerts by criteria
 */
export function filterAlerts(
  alerts: ServiceAlert[],
  options?: {
    routeId?: string;
    severity?: AlertSeverity;
    activeOnly?: boolean;
  }
): ServiceAlert[] {
  let filtered = alerts;
  
  if (options?.routeId) {
    filtered = filtered.filter(a => 
      a.affectedRoutes.includes(options.routeId!)
    );
  }
  
  if (options?.severity) {
    filtered = filtered.filter(a => a.severity === options.severity);
  }
  
  if (options?.activeOnly) {
    const now = new Date();
    filtered = filtered.filter(a => {
      // No end time means still active
      if (!a.activePeriodEnd) return true;
      return a.activePeriodEnd > now;
    });
  }
  
  return filtered;
}
