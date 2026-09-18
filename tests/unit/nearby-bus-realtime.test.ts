import { describe, expect, it } from "vitest";

import {
  getNearbyBusRealtime,
  MAX_NEARBY_BUS_CONCURRENCY,
  MAX_NEARBY_BUS_STOP_IDS,
  normalizeNearbyBusStopIds,
} from "@/lib/transit/nearby-bus-service";
import type { RealtimeSnapshot } from "@/types/transit";

function emptySnapshot(state: RealtimeSnapshot["sourceState"] = "empty"): RealtimeSnapshot {
  return {
    mode: "bus",
    generatedAt: new Date("2026-09-18T12:00:00Z"),
    feedTimestamp: null,
    sourceState: state,
    departures: [],
    trips: [],
    vehicles: [],
  };
}

describe("nearby bus realtime service", () => {
  it("deduplicates, validates, and caps stop IDs", () => {
    const input = [" a ", "a", "bad id", ...Array.from({ length: 20 }, (_, index) => `s${index}`)];
    const result = normalizeNearbyBusStopIds(input);
    expect(result[0]).toBe("a");
    expect(result).toHaveLength(MAX_NEARBY_BUS_STOP_IDS);
    expect(result).not.toContain("bad id");
  });

  it("bounds concurrency and isolates failures in request order", async () => {
    let active = 0;
    let peak = 0;
    const stopIds = Array.from({ length: 8 }, (_, index) => `s${index}`);
    const results = await getNearbyBusRealtime(stopIds, {
      fetchSnapshot: async (stopId) => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 2));
        active -= 1;
        if (stopId === "s3") throw new Error("upstream failed");
        return emptySnapshot();
      },
    });
    expect(peak).toBeLessThanOrEqual(MAX_NEARBY_BUS_CONCURRENCY);
    expect(results.map((result) => result.stopId)).toEqual(stopIds);
    expect(results[3]).toMatchObject({ sourceState: "unavailable", error: "upstream failed" });
    expect(results[4].sourceState).toBe("empty");
  });
});
