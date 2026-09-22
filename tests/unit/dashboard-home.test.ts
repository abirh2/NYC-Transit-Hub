import { describe, expect, it } from "vitest";

import {
  deriveRouteStatuses,
  extractCommuteRouteIds,
  hydrateDeparture,
  prioritizeHomeAlerts,
} from "@/lib/transit/dashboard-home";
import type { ServiceAlert } from "@/types/transit";

const now = new Date("2026-09-22T12:00:00.000Z");

function alert(
  id: string,
  overrides: Partial<ServiceAlert> = {},
): ServiceAlert {
  return {
    id,
    affectedRoutes: [],
    affectedStops: [],
    headerText: id,
    descriptionText: null,
    severity: "INFO",
    alertType: "OTHER",
    activePeriodStart: null,
    activePeriodEnd: null,
    ...overrides,
  };
}

describe("Home dashboard transit helpers", () => {
  it("hydrates serialized departure dates at the client boundary", () => {
    const departure = hydrateDeparture({
      id: "departure-1",
      mode: "subway",
      tripId: "trip-1",
      routeId: "D",
      stopId: "D15S",
      stationId: "D15",
      direction: "southbound",
      destination: "Coney Island-Stillwell Av",
      predictedArrival: "2026-09-22T12:04:00.000Z",
      predictedDeparture: "2026-09-22T12:05:00.000Z",
      delaySeconds: 0,
      status: "realtime",
      minutesAway: 4,
    });

    expect(departure.predictedArrival).toEqual(
      new Date("2026-09-22T12:04:00.000Z"),
    );
    expect(departure.predictedDeparture).toEqual(
      new Date("2026-09-22T12:05:00.000Z"),
    );
  });

  it("prioritizes relevant active alerts ahead of unrelated severe alerts", () => {
    const alerts = [
      alert("system-severe", { severity: "SEVERE", affectedRoutes: ["7"] }),
      alert("saved-route", { severity: "WARNING", affectedRoutes: ["D"] }),
      alert("saved-stop", { severity: "INFO", affectedStops: ["D15S"] }),
      alert("future", {
        severity: "SEVERE",
        affectedRoutes: ["D"],
        activePeriodStart: new Date("2026-09-22T13:00:00.000Z"),
      }),
      alert("expired", {
        severity: "SEVERE",
        affectedRoutes: ["D"],
        activePeriodEnd: new Date("2026-09-22T11:59:59.000Z"),
      }),
    ];

    expect(prioritizeHomeAlerts({
      alerts,
      relevantRouteIds: new Set(["D"]),
      relevantStopIds: new Set(["D15S"]),
      now,
      limit: 3,
    }).map((item) => item.id)).toEqual([
      "saved-stop",
      "saved-route",
      "system-severe",
    ]);
  });

  it("derives concise route service states from the strongest relevant alert", () => {
    const statuses = deriveRouteStatuses({
      routeIds: ["D", "F", "7", "A"],
      alerts: [
        alert("d-delay", {
          affectedRoutes: ["D"],
          severity: "WARNING",
          alertType: "DELAY",
        }),
        alert("f-work", {
          affectedRoutes: ["F"],
          severity: "INFO",
          alertType: "PLANNED_WORK",
        }),
        alert("seven-suspended", {
          affectedRoutes: ["7"],
          severity: "SEVERE",
          headerText: "7 trains are suspended in both directions",
        }),
      ],
      now,
    });

    expect(statuses).toEqual([
      expect.objectContaining({ routeId: "D", status: "delays" }),
      expect.objectContaining({ routeId: "F", status: "planned-work" }),
      expect.objectContaining({ routeId: "7", status: "suspended" }),
      expect.objectContaining({ routeId: "A", status: "good-service" }),
    ]);
  });

  it("extracts only route tokens from the saved commute summary", () => {
    expect(extractCommuteRouteIds("Walk → D → M7 → SIR → F")).toEqual([
      "D",
      "M7",
      "SIR",
      "F",
    ]);
    expect(extractCommuteRouteIds(null)).toEqual([]);
  });
});
