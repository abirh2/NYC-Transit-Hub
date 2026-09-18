import { describe, expect, it } from "vitest";

import { parseSubwayRealtimePayload } from "@/lib/transit/realtime-client-payload";

const payload = {
  trips: [
    {
      id: "trip-D-1",
      mode: "subway",
      route: {
        id: "D",
        displayName: "D",
        longName: "6 Avenue Express",
        mode: "subway",
        color: "#FF6319",
        textColor: "#FFFFFF",
        agencyId: "MTA NYCT",
      },
      direction: "southbound",
      destination: "Coney Island-Stillwell Av",
      startDate: "20260916",
      startTime: "12:00:00",
      scheduleRelationship: "scheduled",
      stopTimeUpdates: [
        {
          stopId: "D15S",
          stationId: "D15",
          sequence: 15,
          arrivalTime: "2026-09-16T16:04:00.000Z",
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
        timestamp: "2026-09-16T16:03:00.000Z",
      },
      vehicleId: "D 1234",
      updatedAt: "2026-09-16T16:03:00.000Z",
      isAssigned: true,
    },
  ],
  departures: [
    {
      id: "trip-D-1:D15S:15",
      mode: "subway",
      tripId: "trip-D-1",
      routeId: "D",
      stopId: "D15S",
      stationId: "D15",
      direction: "southbound",
      destination: "Coney Island-Stillwell Av",
      predictedArrival: "2026-09-16T16:04:00.000Z",
      predictedDeparture: null,
      delaySeconds: 0,
      status: "realtime",
      minutesAway: 1,
    },
  ],
  sourceState: "ok",
  feedTimestamp: "2026-09-16T16:03:00.000Z",
  lastUpdated: "2026-09-16T16:03:01.000Z",
};

describe("parseSubwayRealtimePayload", () => {
  it("hydrates normalized trip and departure timestamps as Dates", () => {
    const result = parseSubwayRealtimePayload(payload);

    expect(result.trips[0].updatedAt).toBeInstanceOf(Date);
    expect(result.trips[0].stopTimeUpdates[0].arrivalTime).toBeInstanceOf(Date);
    expect(result.departures[0].predictedArrival).toBeInstanceOf(Date);
    expect(result.feedTimestamp).toBeInstanceOf(Date);
    expect(result.lastUpdated).toBeInstanceOf(Date);
  });

  it("rejects malformed progress data at the client boundary", () => {
    const malformed = structuredClone(payload);
    malformed.trips[0].progress = {
      state: "between-stops",
      source: "vehicle",
      nextStopId: "D15S",
    } as never;

    expect(() => parseSubwayRealtimePayload(malformed)).toThrow();
  });
});
