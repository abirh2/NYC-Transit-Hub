import { App } from "@capacitor/app";
import type { AppPlugin } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";

import { platformRuntime } from "./runtime";

export interface ResumeFreshness {
  lastRefreshAt: number;
  resumedAt: number;
  staleAfterMs: number;
}

export function shouldRefreshAfterResume({
  lastRefreshAt,
  resumedAt,
  staleAfterMs,
}: ResumeFreshness): boolean {
  return resumedAt - lastRefreshAt >= staleAfterMs;
}

export interface LifecycleAdapter {
  subscribe: (events: { onPause: () => void; onResume: () => void }) => () => void;
}

type NativeApp = Pick<AppPlugin, "addListener">;

export function createNativeLifecycleAdapter(plugin: NativeApp = App): LifecycleAdapter {
  return {
    subscribe({ onPause, onResume }) {
      const handles: PluginListenerHandle[] = [];
      let disposed = false;
      void Promise.all([
        plugin.addListener("pause", onPause),
        plugin.addListener("resume", onResume),
      ]).then((nextHandles) => {
        if (disposed) {
          nextHandles.forEach((handle) => { void handle.remove(); });
        } else {
          handles.push(...nextHandles);
        }
      }).catch(() => undefined);
      return () => {
        disposed = true;
        handles.forEach((handle) => { void handle.remove(); });
      };
    },
  };
}

export function createWebLifecycleAdapter(browserDocument: Document = document): LifecycleAdapter {
  return {
    subscribe({ onPause, onResume }) {
      const handleVisibility = () => {
        if (browserDocument.visibilityState === "hidden") onPause();
        else onResume();
      };
      browserDocument.addEventListener("visibilitychange", handleVisibility);
      return () => browserDocument.removeEventListener("visibilitychange", handleVisibility);
    },
  };
}

let sharedLifecycleAdapter: LifecycleAdapter | null = null;

export function getLifecycleAdapter(): LifecycleAdapter {
  sharedLifecycleAdapter ??= platformRuntime.isNative
    ? createNativeLifecycleAdapter()
    : createWebLifecycleAdapter();
  return sharedLifecycleAdapter;
}
