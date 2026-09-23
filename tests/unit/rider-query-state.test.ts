import { describe, expect, it } from "vitest";

import {
  buildPlanQueryString,
  parsePlanQueryState,
  type PlanQueryState,
} from "@/lib/transit/rider-query-state";

describe("rider utility plan query state", () => {
  it("hydrates complete origin, destination, station, and accessibility context", () => {
    const state = parsePlanQueryState(new URLSearchParams({
      from: "47-50 Sts-Rockefeller Ctr",
      fromLat: "40.75866",
      fromLon: "-73.98133",
      fromStation: "D15",
      to: "Bryant Park",
      toLat: "40.7535965",
      toLon: "-73.9832326",
      accessible: "true",
    }));

    expect(state).toEqual({
      from: {
        name: "47-50 Sts-Rockefeller Ctr",
        latitude: 40.75866,
        longitude: -73.98133,
        stationId: "D15",
      },
      to: {
        name: "Bryant Park",
        latitude: 40.7535965,
        longitude: -73.9832326,
      },
      accessible: true,
    });
  });

  it("does not hydrate partial, invalid, or out-of-NYC coordinate context", () => {
    const state = parsePlanQueryState(new URLSearchParams({
      from: "Incomplete",
      fromLat: "40.75",
      to: "Los Angeles",
      toLat: "34.0522",
      toLon: "-118.2437",
    }));

    expect(state).toEqual({ from: null, to: null, accessible: false });
  });

  it("serializes known context without deleting unrelated query parameters", () => {
    const state: PlanQueryState = {
      from: {
        name: "Times Sq-42 St",
        latitude: 40.75529,
        longitude: -73.9875,
        stationId: "127",
      },
      to: null,
      accessible: true,
    };

    const query = buildPlanQueryString(state, new URLSearchParams("campaign=home&to=stale"));
    const params = new URLSearchParams(query);

    expect(params.get("campaign")).toBe("home");
    expect(params.get("from")).toBe("Times Sq-42 St");
    expect(params.get("fromStation")).toBe("127");
    expect(params.has("to")).toBe(false);
    expect(params.get("accessible")).toBe("true");
  });
});

