import { describe, expect, it } from "vitest";

import { createApiUrlResolver } from "@/lib/api/client";

describe("createApiUrlResolver", () => {
  it("keeps web API requests same-origin", () => {
    const apiUrl = createApiUrlResolver({ target: "web" });

    expect(apiUrl("/api/trains/realtime?limit=10")).toBe(
      "/api/trains/realtime?limit=10",
    );
  });

  it("points native API requests at the hosted backend", () => {
    const apiUrl = createApiUrlResolver({
      target: "ios",
      apiBaseUrl: "https://nyctransithub.vercel.app/",
    });

    expect(apiUrl("/api/trains/realtime?limit=10")).toBe(
      "https://nyctransithub.vercel.app/api/trains/realtime?limit=10",
    );
  });

  it("rejects non-API paths", () => {
    const apiUrl = createApiUrlResolver({ target: "web" });

    expect(() => apiUrl("/data/gtfs/stops.json")).toThrow(
      "API paths must start with /api/",
    );
  });

  it.each([
    "http://nyctransithub.vercel.app",
    "https://user:password@nyctransithub.vercel.app",
    "https://nyctransithub.vercel.app/backend",
  ])("rejects unsafe native API base %s", (apiBaseUrl) => {
    expect(() => createApiUrlResolver({ target: "ios", apiBaseUrl })).toThrow();
  });
});
