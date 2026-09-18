import { describe, expect, it } from "vitest";

import { getBusTripDetail } from "@/lib/transit/bus-trip-detail";
import type { BusTrip, Departure } from "@/types/transit";

const route = { id: "M1", displayName: "M1", longName: null, mode: "bus" as const, color: "#fff", textColor: "#000", agencyId: "MTA" };
const trip: BusTrip = {
  id: "trip-1", mode: "bus", route, direction: "southbound", destination: "East Village",
  startDate: null, startTime: null, scheduleRelationship: "scheduled", stopTimeUpdates: [],
  progress: { state: "approaching", source: "vehicle", nextStopId: "next", previousStopId: null, timestamp: null },
  vehicleId: "vehicle-1", updatedAt: null, journeyPatternId: null, boardingStopId: "stop-1",
  nextStopName: "Next", distanceFromNextStopMeters: null, progressStatus: "2 stops away",
};
const departure: Departure = {
  id: "d1", mode: "bus", tripId: "trip-1", routeId: "M1", stopId: "stop-1", stationId: null,
  direction: "southbound", destination: "East Village", predictedArrival: new Date("2026-09-18T12:05:00Z"),
  predictedDeparture: null, delaySeconds: 0, status: "realtime", minutesAway: 5,
};

describe("getBusTripDetail", () => {
  it("resolves exact trip identity across reordered snapshots", () => {
    const model = getBusTripDetail({ selectedTripId: "trip-1", boardingStopId: "stop-1", trips: [trip], departures: [{ ...departure, tripId: "other", id: "other" }, departure], vehicles: [] });
    expect(model.departure?.id).toBe("d1");
    expect(model.lifecycle).toBe("approaching");
  });

  it("does not preserve an ETA after the trip passes the boarding stop", () => {
    const model = getBusTripDetail({ selectedTripId: "trip-1", boardingStopId: "stop-1", trips: [trip], departures: [], vehicles: [] });
    expect(model.lifecycle).toBe("passed");
    expect(model.departure).toBeNull();
  });

  it("reports disappeared selections and offers following buses", () => {
    const following = { ...departure, id: "d2", tripId: "trip-2" };
    const model = getBusTripDetail({ selectedTripId: "missing", boardingStopId: "stop-1", trips: [], departures: [following], vehicles: [] });
    expect(model.lifecycle).toBe("disappeared");
    expect(model.followingDepartures.map((item) => item.tripId)).toEqual(["trip-2"]);
  });
});
