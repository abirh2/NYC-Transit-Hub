import { describe, expect, it } from "vitest";

import {
  PRODUCTION_API_ORIGIN,
  resolveNativeApiBaseUrl,
} from "@/scripts/native-build-config";

describe("resolveNativeApiBaseUrl", () => {
  it("uses the production backend when no override is provided", () => {
    expect(resolveNativeApiBaseUrl()).toBe(PRODUCTION_API_ORIGIN);
  });

  it("accepts a public HTTPS origin", () => {
    expect(resolveNativeApiBaseUrl("https://preview.example.com")).toBe(
      "https://preview.example.com",
    );
  });

  it.each([
    "http://example.com",
    "https://user:password@example.com",
    "https://example.com/api",
    "https://example.com?environment=test",
    "https://example.com#preview",
    "https://localhost:3000",
    "https://localhost.",
    "https://127.0.0.1:3000",
    "https://10.0.0.5",
    "https://172.16.1.5",
    "https://192.168.1.5",
    "https://169.254.1.5",
    "https://backend.local",
    "https://[::1]",
    "https://[fd00::1]",
    "https://[::ffff:127.0.0.1]",
  ])("rejects an unsafe release API base: %s", (value) => {
    expect(() => resolveNativeApiBaseUrl(value)).toThrow();
  });
});
