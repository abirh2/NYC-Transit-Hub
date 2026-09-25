import { describe, expect, it, vi } from "vitest";

import { createWebNetworkAdapter } from "@/lib/platform/network";

describe("web network adapter", () => {
  it("reads browser connectivity and emits online/offline context", async () => {
    const listeners = new Map<string, EventListener>();
    const browserWindow = {
      addEventListener: vi.fn((name: string, listener: EventListener) => listeners.set(name, listener)),
      removeEventListener: vi.fn(),
    };
    const adapter = createWebNetworkAdapter(
      { onLine: true },
      browserWindow as unknown as Window,
    );
    const listener = vi.fn();
    const unsubscribe = adapter.subscribe(listener);

    await expect(adapter.getStatus()).resolves.toEqual({ connected: true, connectionType: "unknown" });
    listeners.get("offline")?.(new Event("offline"));
    expect(listener).toHaveBeenCalledWith({ connected: false, connectionType: "none" });
    unsubscribe();
    expect(browserWindow.removeEventListener).toHaveBeenCalledTimes(2);
  });
});
