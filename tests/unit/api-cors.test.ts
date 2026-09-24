import { describe, expect, it } from "vitest";

import {
  createCorsHeaders,
  isNativeCorsRoute,
} from "@/lib/api/cors";

describe("native API CORS policy", () => {
  it("allows the production Capacitor origin", () => {
    const headers = createCorsHeaders("capacitor://localhost");

    expect(headers).toEqual({
      "Access-Control-Allow-Headers": "Accept, Content-Type",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Origin": "capacitor://localhost",
      Vary: "Origin",
    });
  });

  it("does not emit CORS headers for unknown origins", () => {
    expect(createCorsHeaders("https://malicious.example")).toBeNull();
  });

  it.each([
    "/api/trains/realtime",
    "/api/buses/nearby",
    "/api/routes/trip",
    "/api/metrics/crowding",
  ])("allows public native reads at %s", (pathname) => {
    expect(isNativeCorsRoute(pathname)).toBe(true);
  });

  it.each([
    "/api/commute/settings",
    "/api/commute/summary",
    "/api/ingest/subway",
    "/auth/callback",
  ])("keeps sensitive route %s outside native CORS", (pathname) => {
    expect(isNativeCorsRoute(pathname)).toBe(false);
  });
});
