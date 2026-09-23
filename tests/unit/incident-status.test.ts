import { describe, expect, it } from "vitest";
import {
  classifyIncidentStatus,
  partitionIncidentsByStatus,
} from "@/lib/incidents/status";
import type { ServiceAlert } from "@/types/mta";

const now = new Date("2026-09-23T12:00:00Z");

function incident(overrides: Partial<ServiceAlert>): ServiceAlert {
  return {
    id: "alert-1",
    affectedRoutes: ["A"],
    affectedStops: [],
    headerText: "Service change",
    descriptionText: null,
    severity: "INFO",
    alertType: "SERVICE_CHANGE",
    activePeriodStart: null,
    activePeriodEnd: null,
    ...overrides,
  };
}

describe("incident status", () => {
  it("does not classify future work as active", () => {
    expect(
      classifyIncidentStatus(
        incident({ activePeriodStart: new Date("2026-09-24T12:00:00Z") }),
        now,
      ),
    ).toBe("upcoming");
  });

  it("classifies an ended alert as resolved", () => {
    expect(
      classifyIncidentStatus(
        incident({ activePeriodEnd: new Date("2026-09-23T11:59:00Z") }),
        now,
      ),
    ).toBe("resolved");
  });

  it("partitions active, upcoming, and resolved alerts without dropping types", () => {
    const active = incident({ id: "active" });
    const upcoming = incident({
      id: "upcoming-delay",
      alertType: "DELAY",
      activePeriodStart: new Date("2026-09-24T12:00:00Z"),
    });
    const resolved = incident({
      id: "resolved",
      activePeriodEnd: new Date("2026-09-23T11:00:00Z"),
    });

    expect(partitionIncidentsByStatus([active, upcoming, resolved], now)).toEqual({
      active: [active],
      upcoming: [upcoming],
      resolved: [resolved],
    });
  });
});
