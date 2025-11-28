"use client";

/**
 * Geolocation Hook
 * 
 * Provides browser geolocation access with permission handling.
 */

import { useState, useEffect, useCallback, useRef } from "react";

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export type GeolocationPermissionState = "prompt" | "granted" | "denied" | "unsupported";

export interface UseGeolocationOptions {
  /** Enable high accuracy mode (uses more battery) */
  enableHighAccuracy?: boolean;
  /** Maximum age of cached position in milliseconds */
  maximumAge?: number;
  /** Timeout for position request in milliseconds */
  timeout?: number;
  /** Automatically request location on mount */
  autoRequest?: boolean;
}

export interface UseGeolocationReturn {
  /** Current position if available */
  position: GeolocationPosition | null;
  /** Error if location request failed */
  error: GeolocationError | null;
  /** Whether a location request is in progress */
  isLoading: boolean;
  /** Current permission state */
  permissionState: GeolocationPermissionState;
  /** Request location (will prompt for permission if needed) */
  requestLocation: () => void;
  /** Clear position and error state */
  clear: () => void;
}

const DEFAULT_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 60000, // 1 minute cache
  timeout: 10000, // 10 second timeout
};

/**
 * Hook for accessing browser geolocation
 */
export function useGeolocation(options?: UseGeolocationOptions): UseGeolocationReturn {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<GeolocationPermissionState>("prompt");
  
  const watchIdRef = useRef<number | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Check if geolocation is supported
  const isSupported = typeof navigator !== "undefined" && "geolocation" in navigator;

  // Query permission state on mount
  useEffect(() => {
    if (!isSupported) {
      setPermissionState("unsupported");
      return;
    }

    // Check permission state if Permissions API is available
    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          setPermissionState(result.state as GeolocationPermissionState);
          
          // Listen for permission changes
          result.onchange = () => {
            setPermissionState(result.state as GeolocationPermissionState);
          };
        })
        .catch(() => {
          // Permissions API not fully supported, stay at "prompt"
        });
    }
  }, [isSupported]);

  // Auto-request location on mount if option is set and permission is granted
  useEffect(() => {
    if (optionsRef.current?.autoRequest && permissionState === "granted") {
      requestLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionState]);

  const requestLocation = useCallback(() => {
    if (!isSupported) {
      setError({
        code: 0,
        message: "Geolocation is not supported by this browser",
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    const geoOptions: PositionOptions = {
      ...DEFAULT_OPTIONS,
      enableHighAccuracy: optionsRef.current?.enableHighAccuracy ?? DEFAULT_OPTIONS.enableHighAccuracy,
      maximumAge: optionsRef.current?.maximumAge ?? DEFAULT_OPTIONS.maximumAge,
      timeout: optionsRef.current?.timeout ?? DEFAULT_OPTIONS.timeout,
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
        setIsLoading(false);
        setPermissionState("granted");
      },
      (err) => {
        setError({
          code: err.code,
          message: getErrorMessage(err.code),
        });
        setIsLoading(false);
        
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionState("denied");
        }
      },
      geoOptions
    );
  }, [isSupported]);

  const clear = useCallback(() => {
    setPosition(null);
    setError(null);
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    position,
    error,
    isLoading,
    permissionState,
    requestLocation,
    clear,
  };
}

/**
 * Get human-readable error message for geolocation error codes
 */
function getErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return "Location access denied. Please enable location permissions in your browser settings.";
    case 2:
      return "Unable to determine your location. Please try again.";
    case 3:
      return "Location request timed out. Please try again.";
    default:
      return "An unknown error occurred while getting your location.";
  }
}

