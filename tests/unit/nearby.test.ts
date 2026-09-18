import { describe, expect, it } from "vitest";
import {
  createBusDeepLink,
  createTrainDeepLink,
  formatDepartureEta,
  getRiderDirectionLabel,
  groupDeparturesByDirection,
  selectNextDeparture,
  sortNearbyLocations,
  sortUniqueDepartures,
} from "@/lib/transit/nearby";
import type { Departure } from "@/types/transit";

const now = new Date("2026-09-17T12:00:00.000Z");
function departure(overrides: Partial<Departure> = {}): Departure {
  return {
    id: "dep-1",
    mode: "subway",
    tripId: "trip-1",
    routeId: "D",
    stopId: "D15N",
    stationId: "D15",
    direction: "northbound",
    destination: "Norwood-205 St",
    predictedArrival: new Date("2026-09-17T12:06:00.000Z"),
    predictedDeparture: null,
    delaySeconds: 0,
    status: "realtime",
    minutesAway: 6,
    ...overrides,
  };
}

describe("nearby train helpers", () => {
  it("groups departures by direction and sorts each group chronologically", () => {
    const groups = groupDeparturesByDirection([
      departure({ id: "later", tripId: "later", predictedArrival: new Date("2026-09-17T12:18:00Z") }),
      departure({ id: "south", tripId: "south", direction: "southbound", predictedArrival: new Date("2026-09-17T12:08:00Z") }),
      departure({ id: "first", tripId: "first", predictedArrival: new Date("2026-09-17T12:04:00Z") }),
    ]);
    expect(groups.map((group) => group.direction)).toEqual(["northbound", "southbound"]);
    expect(groups[0].departures.map((item) => item.tripId)).toEqual(["first", "later"]);
  });

  it("deduplicates multiple platform records without losing trip identity", () => {
    const duplicate = departure({ id: "same-trip-on-another-platform", stopId: "D15S" });
    expect(sortUniqueDepartures([departure(), duplicate])).toHaveLength(1);
    expect(selectNextDeparture([duplicate], now)?.tripId).toBe("trip-1");
  });

  it("selects the chronological next departure from absolute timestamps", () => {
    const next = departure({ predictedArrival: new Date("2026-09-17T12:02:00Z") });
    const later = departure({ id: "later", tripId: "later", predictedArrival: new Date("2026-09-17T12:20:00Z") });
    expect(selectNextDeparture([later, next], now)?.id).toBe("dep-1");
    expect(formatDepartureEta(next.predictedArrival, now)).toBe("2 min");
    expect(formatDepartureEta(new Date("2026-09-17T12:00:20Z"), now)).toBe("Due");
  });

  it("uses rider-facing direction language", () => {
    expect(getRiderDirectionLabel("southbound")).toBe("Downtown / Brooklyn");
    expect(getRiderDirectionLabel("northbound", "Norwood-205 St")).toBe("Norwood-205 St");
  });

  it("builds a realtime deep link with exact trip context", () => {
    const link = createTrainDeepLink(departure({ tripId: "073850_D..S03R/encoded+identity" }));
    expect(link).toContain("mode=subway");
    expect(link).toContain("route=D");
    expect(link).toContain("station=D15");
    expect(link).toContain("stop=D15N");
    expect(link).toContain("trip=073850_D..S03R%2Fencoded%2Bidentity");
  });

  it("builds an exact bus trip link and sorts mixed locations by distance", () => {
    const busDeparture = departure({
      mode: "bus",
      routeId: "M1",
      stopId: "400001",
      stationId: null,
      tripId: "bus/trip+1",
    });
    expect(createBusDeepLink(busDeparture)).toContain("trip=bus%2Ftrip%2B1");

    const locations = sortNearbyLocations([
      {
        id: "bus:far",
        mode: "bus",
        distanceMiles: 0.4,
        stopGroup: {
          id: "far",
          name: "Far stop",
          mode: "bus",
          location: { latitude: 40.7, longitude: -73.9 },
          distanceMiles: 0.4,
          routeIds: ["M1"],
          stops: [],
        },
      },
      {
        id: "subway:near",
        mode: "subway",
        distanceMiles: 0.1,
        station: {
          id: "near",
          sourceIds: ["near"],
          name: "Near station",
          mode: "subway",
          location: null,
          stops: [],
          routeIds: ["1"],
        },
      },
    ]);
    expect(locations.map((location) => location.id)).toEqual(["subway:near", "bus:far"]);
  });
});
