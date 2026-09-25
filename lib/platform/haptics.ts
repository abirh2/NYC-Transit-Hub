import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import type { HapticsPlugin } from "@capacitor/haptics";

import { platformRuntime } from "./runtime";

export interface HapticsAdapter {
  selection: () => Promise<void>;
  success: () => Promise<void>;
}

export function createWebHapticsAdapter(): HapticsAdapter {
  return {
    selection: async () => undefined,
    success: async () => undefined,
  };
}

type NativeHaptics = Pick<HapticsPlugin, "impact" | "notification">;

export function createNativeHapticsAdapter(plugin: NativeHaptics = Haptics): HapticsAdapter {
  const safely = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch {
      // Haptics are optional polish and must never interrupt a rider action.
    }
  };
  return {
    selection: () => safely(() => plugin.impact({ style: ImpactStyle.Light })),
    success: () => safely(() => plugin.notification({ type: NotificationType.Success })),
  };
}

export const haptics = platformRuntime.isNative
  ? createNativeHapticsAdapter()
  : createWebHapticsAdapter();
