import { describe, expect, it, vi } from "vitest";
import { KeyboardStyle } from "@capacitor/keyboard";

import {
  createNativeKeyboardAdapter,
  getNativeKeyboardStyle,
} from "@/lib/platform/keyboard";

describe("native keyboard adapter", () => {
  it("matches the native keyboard to the selected app theme", () => {
    expect(getNativeKeyboardStyle("light")).toBe(KeyboardStyle.Light);
    expect(getNativeKeyboardStyle("dark")).toBe(KeyboardStyle.Dark);
    expect(getNativeKeyboardStyle(undefined)).toBe(KeyboardStyle.Default);
  });

  it("reports visibility changes and removes native listeners", async () => {
    const listeners = new Map<string, () => void>();
    const remove = vi.fn(async () => undefined);
    const plugin = {
      addListener: vi.fn(async (eventName: string, listener: () => void) => {
        listeners.set(eventName, listener);
        return { remove };
      }),
      setStyle: vi.fn(async () => undefined),
    };
    const onVisibilityChange = vi.fn();
    const adapter = createNativeKeyboardAdapter(plugin);

    const unsubscribe = adapter.subscribe(onVisibilityChange);
    await vi.waitFor(() => expect(plugin.addListener).toHaveBeenCalledTimes(2));

    listeners.get("keyboardWillShow")?.();
    listeners.get("keyboardWillHide")?.();
    expect(onVisibilityChange.mock.calls).toEqual([[true], [false]]);

    unsubscribe();
    await vi.waitFor(() => expect(remove).toHaveBeenCalledTimes(2));
  });
});
