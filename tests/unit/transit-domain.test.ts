import { describe, expect, it } from "vitest";

import {
  getDeparturesByDirection,
  getDeparturesByRoute,
  getDeparturesForStop,
  getFollowingDepartures,
} from "@/lib/transit/departures";
import {
  getDirectionLabel,
  normalizeBusDirection,
  normalizeSubwayDirection,
} from "@/lib/transit/direction";
import { mergeRealtimeSnapshots } from "@/lib/transit/realtime-service";
import { createRealtimeSearchParams } from "@/lib/transit/deep-link";
import type { Departure, SubwayTrip, TransitRoute } from "@/types/transit";

const route: TransitRoute = {
  id: "D",
  displayName: "D",
  longName: "6 Avenue Express",
  mode: "subway",
  color: "#FF6319",
  textColor: "#FFFFFF",
  agencyId: "MTA NYCT",
};

function makeTrip(id: string, direction: SubwayTrip["direction"]): SubwayTrip {
  return {
    id,
    mode: "subway",
    route,
    direction,
    destination: "Coney Island-Stillwell Av",
    startDate: "20260916",
    startTime: "12:00:00",
    scheduleRelationship: "scheduled",
    stopTimeUpdates: [],
    progress: { state: "unknown", source: "inferred" },
    vehicleId: null,
    updatedAt: new Date("2026-09-16T16:00:00Z"),
    isAssigned: true,
  };
}

function makeDeparture(
  trip: SubwayTrip,
  stopId: string,
  predictedArrival: string,
): Departure {
  return {
    id: `${trip.id}:${stopId}`,
    mode: "subway",
    tripId: trip.id,
    routeId: trip.route.id,
    stopId,
    stationId: stopId.replace(/[NS]$/, ""),
    direction: trip.direction,
    destination: trip.destination,
    predictedArrival: new Date(predictedArrival),
    predictedDeparture: null,
    delaySeconds: 0,
    status: "realtime",
    minutesAway: null,
  };
}

describe("transit direction normalization", () => {
  it("normalizes MTA subway codes and extension values", () => {
    expect(normalizeSubwayDirection("N")).toBe("northbound");
    expect(normalizeSubwayDirection("SOUTH")).toBe("southbound");
    expect(normalizeSubwayDirection("EAST")).toBe("eastbound");
    expect(normalizeSubwayDirection("WEST")).toBe("westbound");
  });

  it("normalizes SIRI direction refs without embedding rider labels", () => {
    expect(normalizeBusDirection("0")).toBe("outbound");
    expect(normalizeBusDirection("1")).toBe("inbound");
    expect(normalizeBusDirection("unexpected")).toBe("unknown");
  });

  it("keeps contextual rider labels outside the machine direction", () => {
    expect(getDirectionLabel("northbound", "Uptown & The Bronx")).toBe(
      "Uptown & The Bronx",
    );
    expect(getDirectionLabel("southbound")).toBe("Southbound");
  });
});

describe("departure queries", () => {
  const downtownTrip = makeTrip("trip-downtown", "southbound");
  const followingTrip = makeTrip("trip-following", "southbound");
  const uptownTrip = makeTrip("trip-uptown", "northbound");
  const departures = [
    makeDeparture(followingTrip, "D15S", "2026-09-16T16:08:00Z"),
    makeDeparture(uptownTrip, "D15N", "2026-09-16T16:04:00Z"),
    makeDeparture(downtownTrip, "D15S", "2026-09-16T16:03:00Z"),
  ];

  it("returns station or stop departures in chronological order", () => {
    expect(getDeparturesForStop(departures, "D15").map((item) => item.tripId)).toEqual([
      "trip-downtown",
      "trip-uptown",
      "trip-following",
    ]);
  });

  it("filters by normalized direction and route", () => {
    expect(
      getDeparturesByDirection(departures, "southbound").map((item) => item.tripId),
    ).toEqual(["trip-downtown", "trip-following"]);
    expect(getDeparturesByRoute(departures, "D")).toHaveLength(3);
  });

  it("finds following trains after a selected trip", () => {
    expect(
      getFollowingDepartures(departures, {
        selectedTripId: "trip-downtown",
        stopId: "D15S",
      }).map((item) => item.tripId),
    ).toEqual(["trip-following"]);
  });

  it("defaults following-train lookup to the selected departure's stop", () => {
    const otherStopDeparture = makeDeparture(
      followingTrip,
      "D16S",
      "2026-09-16T16:06:00Z",
    );

    expect(
      getFollowingDepartures([...departures, otherStopDeparture], {
        selectedTripId: "trip-downtown",
      }).map((item) => item.stopId),
    ).toEqual(["D15S"]);
  });
});

describe("realtime snapshots", () => {
  it("merges feed snapshots without duplicating trips or departures", () => {
    const trip = makeTrip("trip-downtown", "southbound");
    const departure = makeDeparture(trip, "D15S", "2026-09-16T16:03:00Z");
    const snapshot = mergeRealtimeSnapshots("subway", [
      {
        mode: "subway",
        generatedAt: new Date("2026-09-16T16:00:00Z"),
        feedTimestamp: new Date("2026-09-16T15:59:55Z"),
        sourceState: "ok",
        trips: [trip],
        departures: [departure],
        vehicles: [],
      },
      {
        mode: "subway",
        generatedAt: new Date("2026-09-16T16:00:01Z"),
        feedTimestamp: new Date("2026-09-16T15:59:58Z"),
        sourceState: "stale",
        trips: [trip],
        departures: [departure],
        vehicles: [],
      },
    ]);

    expect(snapshot.trips).toHaveLength(1);
    expect(snapshot.departures).toHaveLength(1);
    expect(snapshot.feedTimestamp).toEqual(new Date("2026-09-16T15:59:58Z"));
    expect(snapshot.sourceState).toBe("stale");
  });
});

describe("realtime deep-link parameters", () => {
  it("round-trips source trip IDs that require URL encoding", () => {
    const tripId = "073850_D..S03R/encoded+identity";
    const params = createRealtimeSearchParams({
      mode: "subway",
      routeId: "D",
      stationId: "D15",
      direction: "southbound",
      tripId,
    });

    expect(params.get("trip")).toBe(tripId);
    expect(params.toString()).toContain("trip=073850_D..S03R%2Fencoded%2Bidentity");
  });
});
