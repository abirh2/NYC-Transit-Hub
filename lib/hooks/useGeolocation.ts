"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

import {
  getLocationService,
  type AppLocationError,
  type AppLocationOptions,
  type AppLocationPermission,
  type AppLocationPosition,
} from "@/lib/platform/location";

export type GeolocationPosition = AppLocationPosition;
export type GeolocationError = AppLocationError;
export type GeolocationPermissionState = AppLocationPermission;

export interface UseGeolocationOptions extends AppLocationOptions {
  /** Automatically read location only after permission is already granted. */
  autoRequest?: boolean;
}

export interface UseGeolocationReturn {
  position: GeolocationPosition | null;
  error: GeolocationError | null;
  isLoading: boolean;
  permissionState: GeolocationPermissionState;
  requestLocation: () => void;
  clear: () => void;
}

/**
 * Shared location state for every page. Permission and position requests are
 * coalesced by the service so Home, Nearby, Realtime, and boards cannot prompt
 * independently.
 */
export function useGeolocation(options?: UseGeolocationOptions): UseGeolocationReturn {
  const service = getLocationService();
  const snapshot = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );
  const hasAutoRequestedRef = useRef(false);

  useEffect(() => {
    void service.checkPermission();
  }, [service]);

  const requestLocation = useCallback(() => {
    void service.requestLocation(options);
  }, [options, service]);

  useEffect(() => {
    if (
      options?.autoRequest &&
      snapshot.permissionState === "granted" &&
      !snapshot.position &&
      !hasAutoRequestedRef.current
    ) {
      hasAutoRequestedRef.current = true;
      requestLocation();
    }
  }, [options?.autoRequest, requestLocation, snapshot.permissionState, snapshot.position]);

  const clear = useCallback(() => service.clear(), [service]);

  return {
    ...snapshot,
    requestLocation,
    clear,
  };
}
