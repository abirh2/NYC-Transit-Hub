import { useEffect } from "react";
import { useTheme } from "next-themes";

import { installNativeExternalLinkHandling } from "@/lib/platform/external-links";
import { hideNativeSplash, syncNativeStatusBar } from "@/lib/platform/native-ui";

export function NativePlatformEffects() {
  const { resolvedTheme, theme } = useTheme();

  useEffect(() => {
    void syncNativeStatusBar(resolvedTheme ?? theme);
  }, [resolvedTheme, theme]);

  useEffect(() => {
    void hideNativeSplash();
  }, []);

  useEffect(() => installNativeExternalLinkHandling(), []);

  return null;
}
