import { describe, expect, it } from "vitest";

import { getAllBusStops, getNearbyBusStops } from "@/lib/gtfs/bus-stops";
import { normalizeSiriActivities } from "@/lib/transit/bus-adapter";
import { normalizeSubwayStations } from "@/lib/transit/station-adapter";

describe("normalizeSubwayStations", () => {
  it("models one rider-facing complex with its directional platform stops", () => {
    const stations = normalizeSubwayStations([
      {
        stopId: "D15",
        stopName: "47-50 Sts-Rockefeller Ctr",
        stopLat: 40.7587,
        stopLon: -73.9819,
        locationType: 1,
        parentStation: null,
      },
      {
        stopId: "D15N",
        stopName: "47-50 Sts-Rockefeller Ctr",
        stopLat: 40.7587,
        stopLon: -73.9819,
        locationType: 0,
        parentStation: "D15",
      },
      {
        stopId: "D15S",
        stopName: "47-50 Sts-Rockefeller Ctr",
        stopLat: 40.7587,
        stopLon: -73.9819,
        locationType: 0,
        parentStation: "D15",
      },
    ]);

    expect(stations).toHaveLength(1);
    expect(stations[0]).toMatchObject({
      id: "D15",
      sourceIds: ["D15"],
      mode: "subway",
    });
    expect(stations[0].stops).toEqual([
      expect.objectContaining({ id: "D15N", stationId: "D15", direction: "northbound" }),
      expect.objectContaining({ id: "D15S", stationId: "D15", direction: "southbound" }),
    ]);
  });

  it("retains every source complex and platform when display names merge", () => {
    const stations = normalizeSubwayStations([
      {
        stopId: "127",
        stopName: "Times Sq-42 St",
        stopLat: 40.7553,
        stopLon: -73.9875,
        locationType: 1,
        parentStation: null,
      },
      {
        stopId: "127N",
        stopName: "Times Sq-42 St",
        stopLat: 40.7553,
        stopLon: -73.9875,
        locationType: 0,
        parentStation: "127",
      },
      {
        stopId: "A27",
        stopName: "Times Sq-42 St",
        stopLat: 40.7573,
        stopLon: -73.9897,
        locationType: 1,
        parentStation: null,
      },
      {
        stopId: "A27S",
        stopName: "Times Sq-42 St",
        stopLat: 40.7573,
        stopLon: -73.9897,
        locationType: 0,
        parentStation: "A27",
      },
    ]);

    expect(stations[0].sourceIds).toEqual(["127", "A27"]);
    expect(stations[0].stops.map((stop) => stop.id)).toEqual(["127N", "A27S"]);
  });
});

describe("normalizeSiriActivities", () => {
  it("preserves bus trip identity and actual vehicle coordinates", () => {
    const snapshot = normalizeSiriActivities(
      [
        {
          RecordedAtTime: "2026-09-16T16:00:00Z",
          MonitoredVehicleJourney: {
            LineRef: "MTA NYCT_M15",
            DirectionRef: "0",
            FramedVehicleJourneyRef: {
              DataFrameRef: "2026-09-16",
              DatedVehicleJourneyRef: "M15-trip-42",
            },
            DestinationName: "East Harlem 125 St",
            JourneyPatternRef: "M15-pattern",
            VehicleRef: "bus-123",
            VehicleLocation: { Latitude: 40.72, Longitude: -73.99 },
            Bearing: 15,
            MonitoredCall: {
              StopPointRef: "MTA_401234",
              StopPointName: "1 Av/E 42 St",
              ExpectedArrivalTime: "2026-09-16T16:04:00Z",
              ExpectedDepartureTime: "2026-09-16T16:05:00Z",
              DistanceFromStop: 250,
              ArrivalProximityText: "approaching",
            },
          },
        },
      ],
      { now: new Date("2026-09-16T16:00:00Z") },
    );

    expect(snapshot.trips[0]).toMatchObject({
      id: "M15-trip-42",
      mode: "bus",
      direction: "outbound",
      destination: "East Harlem 125 St",
      vehicleId: "bus-123",
      nextStopName: "1 Av/E 42 St",
      distanceFromNextStopMeters: 250,
      progressStatus: "approaching",
    });
    expect(snapshot.departures[0]).toMatchObject({
      tripId: "M15-trip-42",
      routeId: "M15",
      stopId: "401234",
      minutesAway: 4,
    });
    expect(snapshot.vehicles[0].position).toEqual({
      source: "actual",
      coordinates: { latitude: 40.72, longitude: -73.99 },
      bearing: 15,
      speedMetersPerSecond: null,
      timestamp: new Date("2026-09-16T16:00:00Z"),
    });
  });
});

describe("nearby bus stops", () => {
  it("starts from static stops and includes routes serving each stop", () => {
    const firstStop = getAllBusStops()[0];
    const nearby = getNearbyBusStops(firstStop.lat, firstStop.lon, 0.01, 5);

    expect(nearby[0]).toMatchObject({
      id: firstStop.id,
      mode: "bus",
      distanceMiles: 0,
    });
    expect(nearby[0].routeIds.length).toBeGreaterThan(0);
  });
});
