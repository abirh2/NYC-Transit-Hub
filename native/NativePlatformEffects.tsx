import { useEffect } from "react";
import { useTheme } from "next-themes";

import { installNativeExternalLinkHandling } from "@/lib/platform/external-links";
import { nativeKeyboard } from "@/lib/platform/keyboard";
import { hideNativeSplash, syncNativeStatusBar } from "@/lib/platform/native-ui";

export function NativePlatformEffects() {
  const { resolvedTheme, theme } = useTheme();

  useEffect(() => {
    void syncNativeStatusBar(resolvedTheme ?? theme);
    void nativeKeyboard.syncTheme(resolvedTheme ?? theme);
  }, [resolvedTheme, theme]);

  useEffect(() => {
    void hideNativeSplash();
  }, []);

  useEffect(() => installNativeExternalLinkHandling(), []);

  useEffect(() => {
    const root = document.documentElement;
    const unsubscribe = nativeKeyboard.subscribe((visible) => {
      if (visible) root.dataset.nativeKeyboardOpen = "true";
      else delete root.dataset.nativeKeyboardOpen;
    });

    return () => {
      delete root.dataset.nativeKeyboardOpen;
      unsubscribe();
    };
  }, []);

  return null;
}
