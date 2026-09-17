import { describe, it, expect } from "vitest";
import {
  createRealtimeSearchParams,
  parseRealtimeSearchParams,
  DEFAULT_REALTIME_MODE,
  DEFAULT_REALTIME_VIEW,
  type RealtimeSelection,
} from "@/lib/transit/deep-link";

describe("parseRealtimeSearchParams", () => {
  it("defaults to the subway map when no params are present", () => {
    const selection = parseRealtimeSearchParams(new URLSearchParams());

    expect(selection.mode).toBe(DEFAULT_REALTIME_MODE);
    expect(selection.view).toBe(DEFAULT_REALTIME_VIEW);
    expect(selection.routeId).toBeUndefined();
  });

  it("reads every supported mode", () => {
    for (const mode of ["subway", "bus", "lirr", "metro-north"] as const) {
      expect(parseRealtimeSearchParams(new URLSearchParams({ mode })).mode).toBe(
        mode,
      );
    }
  });

  // The dashboard already links to `/realtime?mode=bus`, which the previous
  // page ignored entirely.
  it("honors the mode links emitted elsewhere in the app", () => {
    expect(
      parseRealtimeSearchParams(new URLSearchParams("mode=bus")).mode,
    ).toBe("bus");
    expect(
      parseRealtimeSearchParams(new URLSearchParams("mode=lirr")).mode,
    ).toBe("lirr");
  });

  it("falls back to defaults for unrecognized values instead of throwing", () => {
    const selection = parseRealtimeSearchParams(
      new URLSearchParams({ mode: "monorail", view: "hologram", direction: "up" }),
    );

    expect(selection.mode).toBe(DEFAULT_REALTIME_MODE);
    expect(selection.view).toBe(DEFAULT_REALTIME_VIEW);
    expect(selection.direction).toBeUndefined();
  });

  it("treats blank and whitespace-only values as absent", () => {
    const selection = parseRealtimeSearchParams(
      new URLSearchParams("mode=subway&route=&station=%20%20&trip="),
    );

    expect(selection.routeId).toBeUndefined();
    expect(selection.stationId).toBeUndefined();
    expect(selection.tripId).toBeUndefined();
  });

  it("passes opaque source identifiers through without rewriting them", () => {
    const tripId = "073850_D..S03R/encoded+identity";
    const selection = parseRealtimeSearchParams(
      new URLSearchParams(
        `mode=subway&route=D&station=D15&trip=${encodeURIComponent(tripId)}`,
      ),
    );

    expect(selection.routeId).toBe("D");
    expect(selection.stationId).toBe("D15");
    expect(selection.tripId).toBe(tripId);
  });

  it("reads a bus stop selection", () => {
    const selection = parseRealtimeSearchParams(
      new URLSearchParams("mode=bus&route=M15%2B&stop=400001"),
    );

    expect(selection.mode).toBe("bus");
    expect(selection.routeId).toBe("M15+");
    expect(selection.stopId).toBe("400001");
  });
});

describe("realtime selection round-trip", () => {
  const cases: RealtimeSelection[] = [
    { mode: "subway", view: "map" },
    { mode: "subway", routeId: "D", view: "map" },
    { mode: "subway", routeId: "D", stationId: "D15", view: "map" },
    { mode: "subway", routeId: "D", direction: "southbound", view: "diagram" },
    {
      mode: "subway",
      routeId: "D",
      tripId: "073850_D..S03R/encoded+identity",
      view: "map",
    },
    { mode: "bus", routeId: "M15+", view: "map" },
    { mode: "bus", routeId: "M15+", stopId: "400001", view: "map" },
    { mode: "lirr", routeId: "babylon", direction: "inbound", view: "diagram" },
    { mode: "metro-north", routeId: "hudson", view: "map" },
  ];

  // Reloading a shared URL has to restore the exact same map context.
  it.each(cases)("survives serialize then parse: %o", (selection) => {
    const params = createRealtimeSearchParams(selection);
    const parsed = parseRealtimeSearchParams(
      new URLSearchParams(params.toString()),
    );

    expect(parsed).toEqual(selection);
  });
});
