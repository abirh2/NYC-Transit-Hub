"use client";

import { useEffect, useRef, useState } from "react";

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
    onlineRef.current = navigator.onLine;
    setIsOnline(onlineRef.current);

    const stop = () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const start = (refreshNow: boolean) => {
      stop();
      if (!enabled || !onlineRef.current || document.visibilityState === "hidden") {
        return;
      }

      if (refreshNow) callbackRef.current();
      intervalRef.current = window.setInterval(
        () => callbackRef.current(),
        intervalMs,
      );
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") stop();
      else start(true);
    };

    const handleOnline = () => {
      onlineRef.current = true;
      setIsOnline(true);
      start(true);
    };

    const handleOffline = () => {
      onlineRef.current = false;
      setIsOnline(false);
      stop();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    start(false);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [enabled, intervalMs]);

  return { isOnline };
}
