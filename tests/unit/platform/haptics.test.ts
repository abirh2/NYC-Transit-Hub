import { describe, expect, it } from "vitest";

import { createWebHapticsAdapter } from "@/lib/platform/haptics";

describe("web haptics adapter", () => {
  it("is a safe no-op", async () => {
    const haptics = createWebHapticsAdapter();

    await expect(haptics.selection()).resolves.toBeUndefined();
    await expect(haptics.success()).resolves.toBeUndefined();
  });
});
