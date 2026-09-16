import { describe, expect, it } from "vitest";

import { normalizeSubwayFeed } from "@/lib/transit/subway-adapter";
import type { MtaFeedMessage } from "@/types/gtfs";

const feed = {
  header: {
    gtfsRealtimeVersion: "2.0",
    incrementality: "FULL_DATASET",
    timestamp: 1_789_573_200,
  },
  entity: [
    {
      id: "trip-update",
      tripUpdate: {
        trip: {
          tripId: "073850_D..S03R/encoded+identity",
          routeId: "D",
          directionId: 1,
          startDate: "20260916",
          startTime: "12:00:00",
          scheduleRelationship: "SCHEDULED",
          nyctTripDescriptor: {
            trainId: "D 1234",
            isAssigned: true,
            direction: "SOUTH",
          },
        },
        stopTimeUpdate: [
          {
            stopSequence: 1,
            stopId: "D13S",
            arrival: { time: 1_789_573_080, delay: 0 },
            departure: { time: 1_789_573_110, delay: 0 },
          },
          {
            stopSequence: 2,
            stopId: "D14S",
            arrival: { time: 1_789_573_320, delay: 15 },
            departure: { time: 1_789_573_350, delay: 15 },
          },
          {
            stopSequence: 3,
            stopId: "D15S",
            arrival: { time: 1_789_573_500, delay: 15 },
            departure: { time: 1_789_573_530, delay: 15 },
          },
        ],
        timestamp: 1_789_573_200,
      },
    },
    {
      id: "vehicle",
      vehicle: {
        trip: {
          tripId: "073850_D..S03R/encoded+identity",
          routeId: "D",
        },
        vehicle: { id: "D 1234", label: "D train 1234" },
        currentStopSequence: 2,
        stopId: "D14S",
        currentStatus: "IN_TRANSIT_TO",
        timestamp: 1_789_573_200,
      },
    },
  ],
} as unknown as MtaFeedMessage;

describe("normalizeSubwayFeed", () => {
  it("preserves a feed trip as one identifiable entity with ordered stops", () => {
    const snapshot = normalizeSubwayFeed(feed, {
      now: new Date(1_789_573_200 * 1000),
      getStopName: (stopId) =>
        ({ D13S: "7 Av", D14S: "47-50 Sts-Rockefeller Ctr", D15S: "42 St-Bryant Pk" })[
          stopId
        ] ?? null,
    });

    expect(snapshot.trips).toHaveLength(1);
    expect(snapshot.trips[0]).toMatchObject({
      id: "073850_D..S03R/encoded+identity",
      mode: "subway",
      direction: "southbound",
      destination: "42 St-Bryant Pk",
      vehicleId: "D 1234",
      isAssigned: true,
    });
    expect(snapshot.trips[0].stopTimeUpdates.map((update) => update.stopId)).toEqual([
      "D13S",
      "D14S",
      "D15S",
    ]);
  });

  it("creates future departures that retain the exact trip identity", () => {
    const snapshot = normalizeSubwayFeed(feed, {
      now: new Date(1_789_573_200 * 1000),
    });

    expect(snapshot.departures.map((departure) => departure.stopId)).toEqual([
      "D14S",
      "D15S",
    ]);
    expect(snapshot.departures.every((departure) => departure.tripId === snapshot.trips[0].id)).toBe(
      true,
    );
    expect(snapshot.trips[0].route).toMatchObject({
      id: "D",
      mode: "subway",
      color: "#FF6319",
    });
  });

  it("represents subway progress as inferred stop-to-stop context", () => {
    const snapshot = normalizeSubwayFeed(feed, {
      now: new Date(1_789_573_200 * 1000),
    });

    expect(snapshot.trips[0].progress).toEqual({
      state: "between-stops",
      source: "vehicle",
      previousStopId: "D13S",
      nextStopId: "D14S",
      timestamp: new Date(1_789_573_200 * 1000),
      progressRatio: null,
    });
    expect(snapshot.vehicles[0].position).toMatchObject({
      source: "inferred",
      previousStopId: "D13S",
      nextStopId: "D14S",
    });
  });

  it("treats a null protobuf vehicle position as missing coordinates", () => {
    const feedWithNullPosition = structuredClone(feed) as unknown as {
      entity: Array<{ vehicle?: { position?: unknown } }>;
    };
    feedWithNullPosition.entity[1].vehicle!.position = null;

    const snapshot = normalizeSubwayFeed(feedWithNullPosition as unknown as MtaFeedMessage, {
      now: new Date(1_789_573_200 * 1000),
    });

    expect(snapshot.vehicles[0].position).toMatchObject({
      source: "inferred",
      previousStopId: "D13S",
      nextStopId: "D14S",
    });
  });
});
