import { describe, expect, it } from "vitest";
import {
  classifyTransitRequest,
  TRANSIT_RUNTIME_CACHE,
} from "@/lib/transit/cache-policy";

describe("classifyTransitRequest", () => {
  it.each([
    "/api/trains/realtime",
    "/api/buses/realtime?routeId=M15",
    "/api/buses/nearby",
    "/api/alerts",
    "/api/incidents",
    "/api/elevators/upcoming",
    "/api/lirr/realtime",
    "/api/metro-north/realtime",
  ])("classifies %s as realtime", (path) => {
    expect(classifyTransitRequest(path)).toBe("realtime");
  });

  it.each([
    "/api/reliability",
    "/api/metrics/crowding",
    "/api/status",
    "/api/commute/summary",
  ])("classifies %s as slow-changing", (path) => {
    expect(classifyTransitRequest(path)).toBe("slow-changing");
  });

  it.each([
    "/api/stations?search=Times",
    "/api/routes",
    "/api/buses/stops",
    "/api/buses/routes",
    "/api/lirr/stations",
    "/api/metro-north/stations",
    "/data/gtfs/subway-geometry/A.json",
  ])("classifies %s as static", (path) => {
    expect(classifyTransitRequest(path)).toBe("static");
  });

  it("leaves unknown and mutation endpoints uncached", () => {
    expect(classifyTransitRequest("/api/auth/callback")).toBe("uncached");
    expect(classifyTransitRequest("/api/ingest/subway")).toBe("uncached");
  });

  it("keeps realtime cache age below the UI stale threshold", () => {
    expect(TRANSIT_RUNTIME_CACHE.realtime.maxAgeSeconds * 1_000).toBeLessThan(
      TRANSIT_RUNTIME_CACHE.realtime.staleAfterMs,
    );
  });
});
