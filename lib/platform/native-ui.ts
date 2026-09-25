import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

import { platformRuntime } from "./runtime";

export function getNativeStatusBarAppearance(theme: string | undefined) {
  const isLight = theme === "light";
  return {
    backgroundColor: isLight ? "#f5f5f5" : "#0a0a0a",
    style: isLight ? Style.Dark : Style.Light,
  };
}

export async function syncNativeStatusBar(theme: string | undefined): Promise<void> {
  if (!platformRuntime.isNative) return;
  const appearance = getNativeStatusBarAppearance(theme);
  try {
    await Promise.all([
      StatusBar.setOverlaysWebView({ overlay: false }),
      StatusBar.setStyle({ style: appearance.style }),
      StatusBar.setBackgroundColor({ color: appearance.backgroundColor }),
    ]);
  } catch {
    // The web app remains usable if a native appearance plugin is unavailable.
  }
}

export async function hideNativeSplash(): Promise<void> {
  if (!platformRuntime.isNative) return;
  try {
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch {
    // Startup must not fail if the native splash plugin is unavailable.
  }
}
