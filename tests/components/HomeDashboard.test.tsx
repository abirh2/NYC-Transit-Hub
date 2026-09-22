import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HomeDashboard } from "@/components/dashboard/HomeDashboard";

const hookState = vi.hoisted(() => ({
  position: {
    latitude: 40.758,
    longitude: -73.9855,
    accuracy: 10,
    timestamp: 1,
  },
  favorites: [{
    stationId: "D15",
    stationName: "47-50 Sts-Rockefeller Ctr",
    addedAt: "2026-09-22T00:00:00.000Z",
  }],
}));

vi.mock("@/lib/hooks", () => ({
  useGeolocation: () => ({
    position: hookState.position,
    error: null,
    isLoading: false,
    permissionState: "granted",
    requestLocation: vi.fn(),
    clear: vi.fn(),
  }),
  useStationPreferences: () => ({
    primaryStation: {
      stationId: "D15",
      stationName: "47-50 Sts-Rockefeller Ctr",
      addedAt: "2026-09-22T00:00:00.000Z",
    },
    favorites: hookState.favorites,
    isLoaded: true,
  }),
}));

vi.mock("@/components/dashboard/ReliabilityCard", () => ({
  ReliabilityCard: () => <div>Reliability metric preview</div>,
}));
vi.mock("@/components/dashboard/IncidentsCard", () => ({
  IncidentsCard: () => <div>Incident metric preview</div>,
}));
vi.mock("@/components/dashboard/CrowdingCard", () => ({
  CrowdingCard: () => <div>Crowding metric preview</div>,
}));

const station = {
  id: "D15",
  name: "47-50 Sts-Rockefeller Ctr",
  latitude: 40.758,
  longitude: -73.981,
  distance: 0.12,
  sourceIds: ["D15"],
  routeIds: ["D", "F"],
  stops: [{
    id: "D15S",
    stationId: "D15",
    name: "47-50 Sts-Rockefeller Ctr",
    mode: "subway",
    direction: "southbound",
    location: { latitude: 40.758, longitude: -73.981 },
    platformCode: null,
    routeIds: ["D", "F"],
  }],
};

function response<T>(data: T) {
  return Promise.resolve(new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }));
}

describe("HomeDashboard request ownership", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith("/api/stations?near=")) {
        return response({ stations: [station] });
      }
      if (url.startsWith("/api/stations?id=")) {
        return response({ stations: [station] });
      }
      if (url.startsWith("/api/buses/stops")) {
        return response({ groups: [] });
      }
      if (url.startsWith("/api/trains/realtime")) {
        return response({
          sourceState: "ok",
          departures: [{
            id: "departure-1",
            mode: "subway",
            tripId: "trip-1",
            routeId: "D",
            stopId: "D15S",
            stationId: "D15",
            direction: "southbound",
            destination: "Coney Island-Stillwell Av",
            predictedArrival: "2099-09-22T12:04:00.000Z",
            predictedDeparture: null,
            delaySeconds: 0,
            status: "realtime",
            minutesAway: 4,
          }],
        });
      }
      if (url.startsWith("/api/alerts")) return response({ alerts: [] });
      if (url.startsWith("/api/commute/summary")) {
        return response({
          isAuthenticated: false,
          isConfigured: false,
          leaveIn: null,
          arriveBy: null,
          duration: null,
          route: null,
          status: null,
          delayMinutes: null,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deduplicates an overlapping nearby and saved-station realtime request", async () => {
    render(<HomeDashboard />);

    const links = await screen.findAllByRole("link", {
      name: /D train to Coney Island-Stillwell Av/i,
    });
    expect(links[0]).toHaveAttribute("href", expect.stringContaining("trip=trip-1"));

    await waitFor(() => {
      const realtimeCalls = vi.mocked(fetch).mock.calls.filter(([input]) =>
        String(input).startsWith("/api/trains/realtime?stationId=D15"));
      expect(realtimeCalls).toHaveLength(1);
    });
  });
});
