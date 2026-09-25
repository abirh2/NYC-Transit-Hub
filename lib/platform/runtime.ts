import { Capacitor } from "@capacitor/core";

export type AppPlatform = "web" | "ios" | "android";

export interface PlatformRuntime {
  isNative: boolean;
  isIOS: boolean;
  platform: AppPlatform;
}

interface CapacitorRuntime {
  getPlatform: () => string;
  isNativePlatform: () => boolean;
}

export function readPlatformRuntime(
  capacitor: CapacitorRuntime = Capacitor,
): PlatformRuntime {
  const detectedPlatform = capacitor.getPlatform();
  const platform: AppPlatform = detectedPlatform === "ios" || detectedPlatform === "android"
    ? detectedPlatform
    : "web";
  const isNative = capacitor.isNativePlatform();

  return {
    isNative,
    isIOS: isNative && platform === "ios",
    platform,
  };
}

export const platformRuntime = readPlatformRuntime();
