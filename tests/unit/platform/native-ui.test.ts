import { Style } from "@capacitor/status-bar";
import { describe, expect, it } from "vitest";

import { getNativeStatusBarAppearance } from "@/lib/platform/native-ui";

describe("native status bar appearance", () => {
  it("uses dark content on light backgrounds and light content on dark backgrounds", () => {
    expect(getNativeStatusBarAppearance("light")).toEqual({
      backgroundColor: "#f5f5f5",
      style: Style.Dark,
    });
    expect(getNativeStatusBarAppearance("dark")).toEqual({
      backgroundColor: "#0a0a0a",
      style: Style.Light,
    });
  });
});
