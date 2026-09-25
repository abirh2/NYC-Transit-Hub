"use client";

import { useEffect, useRef, useState } from "react";
import {
  getLifecycleAdapter,
  getNetworkService,
  platformRuntime,
  shouldRefreshAfterResume,
} from "@/lib/platform";

interface VisiblePollingState {
  isOnline: boolean;
}

/**
 * Runs one interval only while the document is visible and online. Returning to
 * a usable state triggers one immediate refresh, then restarts the interval.
 * The consumer remains responsible for its initial fetch.
 */
export function useVisiblePolling(
  callback: () => void,
  intervalMs: number,
  enabled = true,
): VisiblePollingState {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const intervalRef = useRef<number | null>(null);
  // Keep the first server and client render identical. The effect below reads
  // the actual browser state immediately after hydration.
  const [isOnline, setIsOnline] = useState(true);
  const onlineRef = useRef(isOnline);

  useEffect(() => {
    const networkService = getNetworkService();
    const lifecycle = getLifecycleAdapter();
    const initialNetwork = networkService.getSnapshot();
    onlineRef.current = initialNetwork.connected;
    let isActive = true;
    let lastRefreshAt = Date.now();

    const stop = () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const start = (refreshNow: boolean) => {
      stop();
      if (!enabled || !onlineRef.current || !isActive) {
        return;
      }

      if (refreshNow) {
        lastRefreshAt = Date.now();
        callbackRef.current();
      }
      intervalRef.current = window.setInterval(
        () => {
          lastRefreshAt = Date.now();
          callbackRef.current();
        },
        intervalMs,
      );
    };

    const unsubscribeNetwork = networkService.subscribe(() => {
      const status = networkService.getSnapshot();
      const wasOnline = onlineRef.current;
      onlineRef.current = status.connected;
      setIsOnline(status.connected);
      if (!status.connected) stop();
      else if (!wasOnline) start(true);
    });
    const unsubscribeLifecycle = lifecycle.subscribe({
      onPause() {
        isActive = false;
        stop();
      },
      onResume() {
        isActive = true;
        const refreshNow = platformRuntime.isNative
          ? shouldRefreshAfterResume({
              lastRefreshAt,
              resumedAt: Date.now(),
              staleAfterMs: intervalMs,
            })
          : true;
        start(refreshNow);
      },
    });
    start(false);

    return () => {
      stop();
      unsubscribeNetwork();
      unsubscribeLifecycle();
    };
  }, [enabled, intervalMs]);

  return { isOnline };
}
