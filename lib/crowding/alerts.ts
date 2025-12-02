/**
 * Alert Impact Module
 * Integrates service alert severity into crowding assessment
 */

import { fetchAlerts } from "@/lib/mta/alerts";
import type { ServiceAlert, AlertSeverity, AlertType } from "@/types/mta";

// ============================================================================
// Types
// ============================================================================

export interface AlertImpact {
  activeAlerts: number;
  severeAlerts: number;
  avgSeverity: number; // 0-1 scale
  affectedStations: Set<string>;
  alertTypes: Map<AlertType, number>;
}

// ============================================================================
// Alert Severity Scoring
// ============================================================================

/**
 * Severity weights for different alert types
 */
const ALERT_SEVERITY_WEIGHTS: Record<AlertType, number> = {
  DELAY: 0.7,
  STATION_CLOSURE: 1.0,
  DETOUR: 0.8,
  REDUCED_SERVICE: 0.9,
  SERVICE_CHANGE: 0.6,
  PLANNED_WORK: 0.4,
  SHUTTLE_BUS: 0.8,
  OTHER: 0.3,
};

/**
 * Base severity weights
 */
const BASE_SEVERITY_WEIGHTS: Record<AlertSeverity, number> = {
  SEVERE: 1.0,
  WARNING: 0.6,
  INFO: 0.2,
};

/**
 * Calculate impact score for a single alert
 */
function calculateAlertScore(alert: ServiceAlert): number {
  const baseSeverity = BASE_SEVERITY_WEIGHTS[alert.severity] || 0.5;
  const typeWeight = ALERT_SEVERITY_WEIGHTS[alert.alertType] || 0.5;

  // Check if alert is currently active
  const now = new Date();
  const isActive =
    (!alert.activePeriodStart || alert.activePeriodStart <= now) &&
    (!alert.activePeriodEnd || alert.activePeriodEnd >= now);

  if (!isActive) {
    return 0; // Don't count inactive alerts
  }

  // Combine base severity and type weight
  return (baseSeverity * 0.6) + (typeWeight * 0.4);
}

// ============================================================================
// Alert Impact Analysis
// ============================================================================

/**
 * Get alert impact for a specific route
 */
export async function getRouteAlertImpact(routeId: string): Promise<AlertImpact> {
  const alerts = await fetchAlerts("subway");

  // Filter alerts affecting this route
  const routeAlerts = alerts.filter(alert =>
    alert.affectedRoutes.includes(routeId)
  );

  return analyzeAlerts(routeAlerts);
}

/**
 * Get alert impact for multiple routes (for network-wide view)
 */
export async function getNetworkAlertImpact(): Promise<AlertImpact> {
  const alerts = await fetchAlerts("subway");
  return analyzeAlerts(alerts);
}

/**
 * Analyze a set of alerts to determine overall impact
 */
function analyzeAlerts(alerts: ServiceAlert[]): AlertImpact {
  const now = new Date();
  
  // Filter for active alerts only
  const activeAlerts = alerts.filter(alert => {
    const isActive =
      (!alert.activePeriodStart || alert.activePeriodStart <= now) &&
      (!alert.activePeriodEnd || alert.activePeriodEnd >= now);
    return isActive;
  });

  const affectedStations = new Set<string>();
  const alertTypes = new Map<AlertType, number>();
  let severeAlerts = 0;
  let totalSeverity = 0;

  for (const alert of activeAlerts) {
    // Track affected stations
    alert.affectedStops.forEach(stop => affectedStations.add(stop));

    // Track alert types
    alertTypes.set(alert.alertType, (alertTypes.get(alert.alertType) || 0) + 1);

    // Count severe alerts
    if (alert.severity === "SEVERE") {
      severeAlerts++;
    }

    // Calculate severity score
    const score = calculateAlertScore(alert);
    totalSeverity += score;
  }

  const avgSeverity = activeAlerts.length > 0
    ? totalSeverity / activeAlerts.length
    : 0;

  return {
    activeAlerts: activeAlerts.length,
    severeAlerts,
    avgSeverity: Math.round(avgSeverity * 100) / 100,
    affectedStations,
    alertTypes,
  };
}

/**
 * Normalize alert impact to 0-1 scale for scoring
 * 0 = no alerts, 1 = major service disruptions
 */
export function normalizeAlertImpact(alertImpact: AlertImpact): number {
  if (alertImpact.activeAlerts === 0) {
    return 0;
  }

  // Weight both the number of alerts and their severity
  const alertCountFactor = Math.min(alertImpact.activeAlerts / 5, 1.0); // Cap at 5 alerts
  const severityFactor = alertImpact.avgSeverity;

  // Severe alerts get extra weight
  const severeBonus = alertImpact.severeAlerts > 0 ? 0.2 : 0;

  // Combine factors
  const normalized = (alertCountFactor * 0.4) + (severityFactor * 0.6) + severeBonus;

  return Math.min(normalized, 1.0);
}

/**
 * Get alert impact category
 */
export function getAlertCategory(alertImpact: AlertImpact): "none" | "minor" | "moderate" | "major" {
  if (alertImpact.activeAlerts === 0) return "none";
  if (alertImpact.severeAlerts > 0) return "major";
  if (alertImpact.activeAlerts > 2) return "moderate";
  return "minor";
}

/**
 * Check if a specific station is affected by alerts
 */
export function isStationAffected(stationId: string, alertImpact: AlertImpact): boolean {
  return alertImpact.affectedStations.has(stationId);
}

