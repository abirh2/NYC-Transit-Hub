import type {
  Departure,
  ServiceAlert,
  ServiceStatus,
} from "@/types/transit";

type SerializedDeparture = Omit<
  Departure,
  "predictedArrival" | "predictedDeparture"
> & {
  predictedArrival: Date | string;
  predictedDeparture: Date | string | null;
};

interface PrioritizeHomeAlertsInput {
  alerts: readonly ServiceAlert[];
  relevantRouteIds: ReadonlySet<string>;
  relevantStopIds: ReadonlySet<string>;
  now?: Date;
  limit?: number;
}

interface DeriveRouteStatusesInput {
  routeIds: readonly string[];
  alerts: readonly ServiceAlert[];
  now?: Date;
}

const SEVERITY_WEIGHT: Record<ServiceAlert["severity"], number> = {
  SEVERE: 30,
  WARNING: 20,
  INFO: 10,
};

export function hydrateDeparture(departure: SerializedDeparture): Departure {
  return {
    ...departure,
    predictedArrival: new Date(departure.predictedArrival),
    predictedDeparture: departure.predictedDeparture
      ? new Date(departure.predictedDeparture)
      : null,
  };
}

export function isAlertActive(alert: ServiceAlert, now = new Date()): boolean {
  const startsOnTime = !alert.activePeriodStart
    || alert.activePeriodStart.getTime() <= now.getTime();
  const hasNotEnded = !alert.activePeriodEnd
    || alert.activePeriodEnd.getTime() > now.getTime();
  return startsOnTime && hasNotEnded;
}

function matchesAny(values: readonly string[], relevant: ReadonlySet<string>) {
  return values.some((value) => relevant.has(value));
}

export function prioritizeHomeAlerts({
  alerts,
  relevantRouteIds,
  relevantStopIds,
  now = new Date(),
  limit = 3,
}: PrioritizeHomeAlertsInput): ServiceAlert[] {
  return alerts
    .filter((item) => isAlertActive(item, now))
    .map((item, index) => {
      const stopMatch = matchesAny(item.affectedStops, relevantStopIds);
      const routeMatch = matchesAny(item.affectedRoutes, relevantRouteIds);
      return {
        item,
        index,
        score: (stopMatch ? 200 : routeMatch ? 100 : 0)
          + SEVERITY_WEIGHT[item.severity],
      };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(0, limit))
    .map(({ item }) => item);
}

function statusForAlert(alert: ServiceAlert): ServiceStatus["status"] {
  const copy = `${alert.headerText} ${alert.descriptionText ?? ""}`;
  if (/suspend(?:ed|ing|sion)?/i.test(copy)) return "suspended";
  if (alert.alertType === "PLANNED_WORK") return "planned-work";
  if (
    alert.alertType === "DELAY"
    || alert.alertType === "REDUCED_SERVICE"
    || alert.severity === "SEVERE"
    || alert.severity === "WARNING"
  ) {
    return "delays";
  }
  return "unknown";
}

const STATUS_WEIGHT: Record<ServiceStatus["status"], number> = {
  suspended: 5,
  delays: 4,
  "planned-work": 3,
  unknown: 2,
  "good-service": 1,
};

export function deriveRouteStatuses({
  routeIds,
  alerts,
  now = new Date(),
}: DeriveRouteStatusesInput): ServiceStatus[] {
  const activeAlerts = alerts.filter((item) => isAlertActive(item, now));

  return [...new Set(routeIds)].map((routeId) => {
    const relevant = activeAlerts.filter((item) =>
      item.affectedRoutes.includes(routeId));
    const status = relevant
      .map(statusForAlert)
      .sort((a, b) => STATUS_WEIGHT[b] - STATUS_WEIGHT[a])[0]
      ?? "good-service";

    return {
      routeId,
      status,
      updatedAt: now,
      alertIds: relevant.map((item) => item.id),
    };
  });
}

export function extractCommuteRouteIds(route: string | null): string[] {
  if (!route) return [];
  return route
    .split(/\s*(?:→|->|,)\s*/)
    .map((token) => token.trim().toUpperCase())
    .filter((token) => token !== "WALK")
    .filter((token) => /^(?:[A-Z]|\d{1,2}|SI|SIR|[A-Z]{1,3}\d{1,3})$/.test(token))
    .filter((token, index, tokens) => tokens.indexOf(token) === index);
}
