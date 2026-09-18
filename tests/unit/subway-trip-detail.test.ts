import { describe, expect, it } from "vitest";

import { buildSubwayTripDetail } from "@/components/realtime/detailContent";
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

const trip: SubwayTrip = {
  id: "selected-D",
  mode: "subway",
  route,
  direction: "southbound",
  destination: "Coney Island-Stillwell Av",
  startDate: "20260916",
  startTime: "12:00:00",
  scheduleRelationship: "scheduled",
  stopTimeUpdates: [
    {
      stopId: "D14S",
      stationId: "D14",
      sequence: 14,
      arrivalTime: new Date("2026-09-16T16:00:00Z"),
      departureTime: new Date("2026-09-16T16:01:00Z"),
      delaySeconds: 0,
      scheduleRelationship: "scheduled",
    },
    {
      stopId: "D15S",
      stationId: "D15",
      sequence: 15,
      arrivalTime: new Date("2026-09-16T16:04:00Z"),
      departureTime: null,
      delaySeconds: 0,
      scheduleRelationship: "scheduled",
    },
  ],
  progress: {
    state: "approaching",
    source: "vehicle",
    previousStopId: "D14S",
    nextStopId: "D15S",
    timestamp: new Date("2026-09-16T16:03:00Z"),
  },
  vehicleId: "D 1234",
  updatedAt: new Date("2026-09-16T16:03:00Z"),
  isAssigned: true,
};

function departure(tripId: string, minutesAway: number): Departure {
  return {
    id: `${tripId}:D15S`,
    mode: "subway",
    tripId,
    routeId: "D",
    stopId: "D15S",
    stationId: "D15",
    direction: "southbound",
    destination: "Coney Island-Stillwell Av",
    predictedArrival: new Date(`2026-09-16T16:${String(3 + minutesAway).padStart(2, "0")}:00Z`),
    predictedDeparture: null,
    delaySeconds: 0,
    status: "realtime",
    minutesAway,
  };
}

describe("buildSubwayTripDetail", () => {
  it("describes the selected trip and keeps following departures selectable", () => {
    const content = buildSubwayTripDetail({
      trip,
      selectedDeparture: departure("selected-D", 1),
      followingDepartures: [
        departure("following-D-1", 18),
        departure("following-D-2", 26),
      ],
      stationName: (stopId) =>
        ({ D14S: "7 Av", D15S: "47-50 Sts-Rockefeller Ctr" })[stopId] ?? stopId,
      isStale: false,
    });

    expect(content.title).toBe("Coney Island-Stillwell Av");
    expect(content.status?.label).toBe("Approaching 47-50 Sts-Rockefeller Ctr");
    expect(content.progressStops?.map((stop) => stop.state)).toEqual([
      "completed",
      "next",
    ]);
    expect(content.arrivals?.map((arrival) => arrival.id)).toEqual([
      "following-D-1",
      "following-D-2",
    ]);
    expect(content.footnote).toContain("estimated");
  });
});
