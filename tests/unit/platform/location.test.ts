import { describe, expect, it, vi } from "vitest";

import {
  createNativeLocationAdapter,
  createWebLocationAdapter,
  LocationService,
} from "@/lib/platform/location";

describe("location adapters", () => {
  it("maps browser coordinates to the shared position shape", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => success({
      coords: { latitude: 40.7128, longitude: -74.006, accuracy: 12 },
      timestamp: 1234,
    } as GeolocationPosition));
    const adapter = createWebLocationAdapter({
      geolocation: { getCurrentPosition } as unknown as Geolocation,
      permissions: undefined,
    });

    await expect(adapter.getCurrentPosition({ timeout: 5_000 })).resolves.toEqual({
      latitude: 40.7128,
      longitude: -74.006,
      accuracy: 12,
      timestamp: 1234,
    });
  });

  it("maps native prompt-with-rationale and restricted errors", async () => {
    const adapter = createNativeLocationAdapter({
      checkPermissions: vi.fn().mockResolvedValue({
        location: "prompt-with-rationale",
        coarseLocation: "prompt-with-rationale",
      }),
      requestPermissions: vi.fn(),
      getCurrentPosition: vi.fn().mockRejectedValue({
        code: "OS-PLUG-GLOC-0008",
      }),
    });

    await expect(adapter.checkPermission()).resolves.toBe("prompt");
    await expect(adapter.getCurrentPosition()).rejects.toMatchObject({
      kind: "restricted",
    });
  });

  it("maps native timeout and unavailable errors", async () => {
    const timeoutAdapter = createNativeLocationAdapter({
      checkPermissions: vi.fn(),
      requestPermissions: vi.fn(),
      getCurrentPosition: vi.fn().mockRejectedValue({ code: "OS-PLUG-GLOC-0010" }),
    });
    const unavailableAdapter = createNativeLocationAdapter({
      checkPermissions: vi.fn(),
      requestPermissions: vi.fn(),
      getCurrentPosition: vi.fn().mockRejectedValue({ code: "OS-PLUG-GLOC-0007" }),
    });

    await expect(timeoutAdapter.getCurrentPosition()).rejects.toMatchObject({ kind: "timeout" });
    await expect(unavailableAdapter.getCurrentPosition()).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("coalesces concurrent location reads across consumers", async () => {
    const getCurrentPosition = vi.fn().mockResolvedValue({
      latitude: 40.7128,
      longitude: -74.006,
      accuracy: 12,
      timestamp: 1234,
    });
    const service = new LocationService({
      checkPermission: vi.fn().mockResolvedValue("granted"),
      requestPermission: vi.fn().mockResolvedValue("granted"),
      getCurrentPosition,
    });

    await Promise.all([
      service.requestLocation(),
      service.requestLocation(),
    ]);

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(service.getSnapshot().position?.latitude).toBe(40.7128);
  });
});
