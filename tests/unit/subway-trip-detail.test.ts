import { describe, expect, it } from "vitest";

import { buildMissingSelectionDetail, buildSubwayTripDetail } from "@/components/realtime/detailContent";
import { getSubwayTripRiderContext } from "@/lib/transit/subway-trip-detail";
import type { Departure, SubwayTrip, TransitRoute } from "@/types/transit";

const route: TransitRoute = { id: "D", displayName: "D", longName: "6 Avenue Express", mode: "subway", color: "#FF6319", textColor: "#FFFFFF", agencyId: "MTA NYCT" };
const trip: SubwayTrip = {
  id: "selected-D", mode: "subway", route, direction: "southbound", destination: "Coney Island-Stillwell Av", startDate: "20260916", startTime: "12:00:00", scheduleRelationship: "scheduled",
  stopTimeUpdates: [
    { stopId: "D14S", stationId: "D14", sequence: 14, arrivalTime: new Date("2026-09-16T16:00:00Z"), departureTime: new Date("2026-09-16T16:01:00Z"), delaySeconds: 0, scheduleRelationship: "scheduled" },
    { stopId: "D15S", stationId: "D15", sequence: 15, arrivalTime: new Date("2026-09-16T16:04:00Z"), departureTime: null, delaySeconds: 0, scheduleRelationship: "scheduled" },
    { stopId: "D16S", stationId: "D16", sequence: 16, arrivalTime: new Date("2026-09-16T16:06:00Z"), departureTime: null, delaySeconds: 0, scheduleRelationship: "scheduled" },
  ],
  progress: { state: "approaching", source: "vehicle", previousStopId: "D14S", nextStopId: "D15S", timestamp: new Date("2026-09-16T16:03:00Z") },
  vehicleId: "D 1234", updatedAt: new Date("2026-09-16T16:03:00Z"), isAssigned: true,
};

function departure(tripId: string, minutesAway: number): Departure {
  return { id: `${tripId}:D15S`, mode: "subway", tripId, routeId: "D", stopId: "D15S", stationId: "D15", direction: "southbound", destination: "Coney Island-Stillwell Av", predictedArrival: new Date(`2026-09-16T16:${String(3 + minutesAway).padStart(2, "0")}:00Z`), predictedDeparture: null, delaySeconds: 0, status: "realtime", minutesAway };
}

describe("buildSubwayTripDetail", () => {
  it("describes the selected trip and keeps following departures selectable", () => {
    const content = buildSubwayTripDetail({ trip, selectedDeparture: departure("selected-D", 1), followingDepartures: [departure("following-D-1", 18), departure("following-D-2", 26)], boardingStopId: "D15", stationName: (stopId) => ({ D14S: "7 Av", D15S: "47-50 Sts-Rockefeller Ctr", D16S: "42 St" })[stopId] ?? stopId, isStale: false });
    expect(content.title).toBe("Coney Island-Stillwell Av");
    expect(content.status?.label).toBe("Approaching 47-50 Sts-Rockefeller Ctr");
    expect(content.rows).toEqual(expect.arrayContaining([{ label: "Boarding at", value: "47-50 Sts-Rockefeller Ctr" }, { label: "Stops away", value: "Due at boarding station" }]));
    expect(content.progressStops?.map((stop) => stop.state)).toEqual(["completed", "next", "upcoming"]);
    expect(content.arrivals?.map((arrival) => arrival.id)).toEqual(["following-D-1", "following-D-2"]);
    expect(content.footnote).toContain("estimated");
  });

  it("offers same-platform service without changing trip identity", () => {
    const content = buildSubwayTripDetail({ trip, selectedDeparture: departure("selected-D", 1), followingDepartures: [], platformDepartures: [departure("following-F-1", 8)], stationName: (stopId) => stopId, isStale: false });
    expect(content.secondaryArrivals?.[0]?.id).toBe("following-F-1");
  });
});

describe("getSubwayTripRiderContext", () => {
  it("calculates stops away from ordered stop sequence", () => {
    const context = getSubwayTripRiderContext({ trip: { ...trip, progress: { state: "between-stops", source: "inferred", previousStopId: "D14S", nextStopId: "D15S", timestamp: null } }, boardingStopId: "D16" });
    expect(context.stopsAway).toBe(1);
    expect(context.lifecycle).toBe("en-route");
  });

  it("omits stops away after the train passed the boarding stop", () => {
    const context = getSubwayTripRiderContext({ trip: { ...trip, progress: { state: "between-stops", source: "vehicle", previousStopId: "D15S", nextStopId: "D16S", timestamp: null } }, boardingStopId: "D15" });
    expect(context.stopsAway).toBeNull();
    expect(context.lifecycle).toBe("passed-boarding-stop");
  });
});

describe("expired trip detail", () => {
  it("keeps route context and offers current departures", () => {
    const content = buildMissingSelectionDetail({
      kind: "vehicle",
      label: "Train no longer reporting",
      badge: { kind: "subway", line: "D" },
      arrivals: [{ id: "next-D", primary: "Coney Island-Stillwell Av", secondary: "Southbound", minutesAway: 6, state: "advisory" }],
    });
    expect(content.notice).toContain("no longer active");
    expect(content.arrivals?.[0]?.id).toBe("next-D");
  });
});
