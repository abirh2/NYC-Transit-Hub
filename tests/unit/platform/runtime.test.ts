import { describe, expect, it } from "vitest";

import { readPlatformRuntime } from "@/lib/platform/runtime";

describe("readPlatformRuntime", () => {
  it("uses Capacitor runtime detection instead of the user agent", () => {
    expect(readPlatformRuntime({
      getPlatform: () => "ios",
      isNativePlatform: () => true,
    })).toEqual({ isNative: true, isIOS: true, platform: "ios" });
  });

  it("reports an ordinary browser as web", () => {
    expect(readPlatformRuntime({
      getPlatform: () => "web",
      isNativePlatform: () => false,
    })).toEqual({ isNative: false, isIOS: false, platform: "web" });
  });
});
