import { describe, expect, it } from "vitest";

import { filterAndSortOutages, hydrateEquipmentOutage } from "@/lib/transit/accessibility-status";
import type { EquipmentOutage } from "@/types/mta";

const outage = (overrides: Partial<EquipmentOutage>): EquipmentOutage => ({
  equipmentId: "EL1",
  stationName: "14 St-Union Sq",
  borough: "Manhattan",
  equipmentType: "ELEVATOR",
  serving: "street to mezzanine",
  adaCompliant: true,
  isActive: false,
  outageReason: "Repair",
  outageStartTime: new Date("2026-09-20T12:00:00Z"),
  estimatedReturn: null,
  trainLines: ["4", "5", "6"],
  ...overrides,
});

describe("accessibility status helpers", () => {
  it("hydrates feed dates", () => {
    const hydrated = hydrateEquipmentOutage({
      ...outage({}),
      outageStartTime: "2026-09-21T12:00:00Z",
      estimatedReturn: "2026-09-23T12:00:00Z",
    });
    expect(hydrated.outageStartTime).toBeInstanceOf(Date);
    expect(hydrated.estimatedReturn).toBeInstanceOf(Date);
  });

  it("composes station, line, equipment, and ADA filters", () => {
    const outages = [
      outage({ equipmentId: "EL1" }),
      outage({ equipmentId: "ES1", stationName: "Times Sq-42 St", equipmentType: "ESCALATOR", adaCompliant: false, trainLines: ["7"] }),
    ];
    expect(filterAndSortOutages(outages, {
      stationSearch: "union",
      lines: ["4"],
      equipmentTypes: ["ELEVATOR"],
      adaOnly: true,
      sortBy: "station",
    }).map((item) => item.equipmentId)).toEqual(["EL1"]);
  });

  it("places unknown return times after known estimates", () => {
    const result = filterAndSortOutages([
      outage({ equipmentId: "unknown" }),
      outage({ equipmentId: "known", estimatedReturn: new Date("2026-09-23T12:00:00Z") }),
    ], { stationSearch: "", lines: [], equipmentTypes: [], adaOnly: false, sortBy: "return" });
    expect(result.map((item) => item.equipmentId)).toEqual(["known", "unknown"]);
  });
});
