import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  locationSearchRequestSchema,
  searchLocations,
} from "@/lib/transit/location-search";

const { searchStations } = vi.hoisted(() => ({ searchStations: vi.fn() }));

vi.mock("@/lib/gtfs", () => ({
  searchStations,
}));

describe("location search", () => {
  beforeEach(() => {
    searchStations.mockReset();
    vi.unstubAllGlobals();
  });

  it("validates bounded query and result limits", () => {
    expect(locationSearchRequestSchema.safeParse({ query: "  Bryant Park  ", limit: "8" }).data)
      .toEqual({ query: "Bryant Park", limit: 8 });
    expect(locationSearchRequestSchema.safeParse({ query: "B", limit: "8" }).success).toBe(false);
    expect(locationSearchRequestSchema.safeParse({ query: "B".repeat(101), limit: "8" }).success).toBe(false);
    expect(locationSearchRequestSchema.safeParse({ query: "Bryant Park", limit: "11" }).success).toBe(false);
  });

  it("combines stable station and NYC place results", async () => {
    searchStations.mockReturnValue([{
      id: "D15",
      name: "47-50 Sts-Rockefeller Ctr",
      latitude: 40.75866,
      longitude: -73.98133,
    }]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      osm_type: "node",
      osm_id: 4242,
      display_name: "Bryant Park, Manhattan, New York, United States",
      name: "Bryant Park",
      lat: "40.7535965",
      lon: "-73.9832326",
      type: "park",
      address: {
        neighbourhood: "Midtown South",
        borough: "Manhattan",
      },
    }]), { status: 200 })));

    await expect(searchLocations("Bryant Park", 8)).resolves.toEqual([
      {
        id: "station:D15",
        kind: "station",
        name: "47-50 Sts-Rockefeller Ctr",
        description: "Subway station",
        latitude: 40.75866,
        longitude: -73.98133,
        stationId: "D15",
      },
      {
        id: "place:node:4242",
        kind: "place",
        name: "Bryant Park",
        description: "Midtown South, Manhattan",
        latitude: 40.7535965,
        longitude: -73.9832326,
      },
    ]);
  });

  it("drops invalid provider results and keeps station matches when geocoding fails", async () => {
    searchStations.mockReturnValue([{
      id: "127",
      name: "Times Sq-42 St",
      latitude: 40.75529,
      longitude: -73.9875,
    }]);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("provider unavailable")));

    await expect(searchLocations("Times Square", 6)).resolves.toEqual([{
      id: "station:127",
      kind: "station",
      name: "Times Sq-42 St",
      description: "Subway station",
      latitude: 40.75529,
      longitude: -73.9875,
      stationId: "127",
    }]);
  });
});
