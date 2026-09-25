import { describe, expect, it } from "vitest";

import { shouldRefreshAfterResume } from "@/lib/platform/lifecycle";

describe("shouldRefreshAfterResume", () => {
  it("refreshes only when active realtime data is stale", () => {
    expect(shouldRefreshAfterResume({
      lastRefreshAt: 1_000,
      resumedAt: 31_001,
      staleAfterMs: 30_000,
    })).toBe(true);
    expect(shouldRefreshAfterResume({
      lastRefreshAt: 20_000,
      resumedAt: 31_001,
      staleAfterMs: 30_000,
    })).toBe(false);
  });
});
