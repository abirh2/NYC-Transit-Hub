import { describe, expect, it } from "vitest";

import { getStationNameForDisplay } from "@/lib/gtfs/line-stations";

describe("getStationNameForDisplay", () => {
  it("resolves rerouted platform IDs from other subway lines", () => {
    const canonicalDStations = [
      { id: "D22", name: "Grand St" },
      { id: "D24", name: "Atlantic Av-Barclays Ctr" },
    ];

    expect(getStationNameForDisplay("R30S", canonicalDStations)).toBe(
      "DeKalb Av",
    );
    expect(getStationNameForDisplay("R32S", canonicalDStations)).toBe(
      "Union St",
    );
    expect(getStationNameForDisplay("R33S", canonicalDStations)).toBe(
      "4 Av-9 St",
    );
    expect(getStationNameForDisplay("R34S", canonicalDStations)).toBe(
      "Prospect Av",
    );
  });

  it("prefers the supplied route context before the global station index", () => {
    expect(
      getStationNameForDisplay("R30S", [
        { id: "R30", name: "Route-specific DeKalb Av" },
      ]),
    ).toBe("Route-specific DeKalb Av");
  });

  it("falls back to the raw stop ID only when the station is unknown", () => {
    expect(getStationNameForDisplay("ZZ99S", [])).toBe("Stop ZZ99S");
  });
});
