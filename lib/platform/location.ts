import { Geolocation as CapacitorGeolocation } from "@capacitor/geolocation";
import type {
  GeolocationPlugin,
  PermissionStatus,
  Position,
  PositionOptions as NativePositionOptions,
} from "@capacitor/geolocation";

import { platformRuntime } from "./runtime";

export interface AppLocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export type AppLocationPermission =
  | "prompt"
  | "granted"
  | "denied"
  | "restricted"
  | "unavailable";

export type AppLocationErrorKind =
  | "denied"
  | "restricted"
  | "unavailable"
  | "timeout"
  | "temporary";

export class AppLocationError extends Error {
  constructor(
    public readonly kind: AppLocationErrorKind,
    public readonly code: string | number,
    message: string,
  ) {
    super(message);
    this.name = "AppLocationError";
  }
}

export interface AppLocationOptions {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
}

export interface LocationAdapter {
  checkPermission: () => Promise<AppLocationPermission>;
  requestPermission: () => Promise<AppLocationPermission>;
  getCurrentPosition: (options?: AppLocationOptions) => Promise<AppLocationPosition>;
}

interface WebLocationDependencies {
  geolocation?: globalThis.Geolocation;
  permissions?: Permissions;
}

const DEFAULT_LOCATION_OPTIONS: Required<AppLocationOptions> = {
  enableHighAccuracy: false,
  maximumAge: 60_000,
  timeout: 10_000,
};

function toSharedPosition(position: {
  coords: Pick<Position["coords"], "latitude" | "longitude" | "accuracy">;
  timestamp: number;
}): AppLocationPosition {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    timestamp: position.timestamp,
  };
}

function mapPermission(status: PermissionStatus["location"]): AppLocationPermission {
  if (status === "prompt-with-rationale") return "prompt";
  return status;
}

function webError(error: GeolocationPositionError): AppLocationError {
  if (error.code === error.PERMISSION_DENIED) {
    return new AppLocationError(
      "denied",
      error.code,
      "Location access was denied. Allow NYC Transit Hub to use your location in Settings, or search by place.",
    );
  }
  if (error.code === 3) {
    return new AppLocationError(
      "timeout",
      error.code,
      "Location request timed out. Move somewhere with a clearer signal and try again.",
    );
  }
  return new AppLocationError(
    "temporary",
    error.code,
    "Unable to determine your location. Try again or search by place.",
  );
}

function nativeError(error: unknown): AppLocationError {
  const code = typeof error === "object" && error && "code" in error
    ? String(error.code)
    : "native-location-error";
  if (code === "OS-PLUG-GLOC-0003") {
    return new AppLocationError("denied", code, "Location access is off. Allow NYC Transit Hub to use your location in iOS Settings, or search by place.");
  }
  if (code === "OS-PLUG-GLOC-0008") {
    return new AppLocationError("restricted", code, "Location is restricted on this iPhone. You can still search by station or place.");
  }
  if (code === "OS-PLUG-GLOC-0007") {
    return new AppLocationError("unavailable", code, "Location Services are unavailable. Turn them on in iOS Settings or search by place.");
  }
  if (code === "OS-PLUG-GLOC-0010") {
    return new AppLocationError("timeout", code, "Location took too long. Move somewhere with a clearer signal and try again.");
  }
  return new AppLocationError("temporary", code, "NYC Transit Hub couldn’t determine your location. Try again or search by place.");
}

export function createWebLocationAdapter(
  dependencies: WebLocationDependencies = {
    geolocation: typeof navigator === "undefined" ? undefined : navigator.geolocation,
    permissions: typeof navigator === "undefined" ? undefined : navigator.permissions,
  },
): LocationAdapter {
  return {
    async checkPermission() {
      if (!dependencies.geolocation) return "unavailable";
      if (!dependencies.permissions) return "prompt";
      try {
        const status = await dependencies.permissions.query({ name: "geolocation" });
        return mapPermission(status.state);
      } catch {
        return "prompt";
      }
    },
    async requestPermission() {
      return this.checkPermission();
    },
    async getCurrentPosition(options = {}) {
      if (!dependencies.geolocation) {
        throw new AppLocationError("unavailable", 0, "Location is unavailable in this browser. Search by station or place instead.");
      }
      return new Promise((resolve, reject) => {
        dependencies.geolocation?.getCurrentPosition(
          (position) => resolve(toSharedPosition(position)),
          (error) => reject(webError(error)),
          { ...DEFAULT_LOCATION_OPTIONS, ...options },
        );
      });
    },
  };
}

type NativeGeolocation = Pick<
  GeolocationPlugin,
  "checkPermissions" | "requestPermissions" | "getCurrentPosition"
>;

export function createNativeLocationAdapter(
  plugin: NativeGeolocation = CapacitorGeolocation,
): LocationAdapter {
  const readPermission = async (action: () => Promise<PermissionStatus>) => {
    try {
      const status = await action();
      return mapPermission(status.location);
    } catch (error) {
      throw nativeError(error);
    }
  };

  return {
    checkPermission: () => readPermission(() => plugin.checkPermissions()),
    requestPermission: () => readPermission(() => plugin.requestPermissions({ permissions: ["location"] })),
    async getCurrentPosition(options = {}) {
      try {
        const nativeOptions: NativePositionOptions = {
          ...DEFAULT_LOCATION_OPTIONS,
          ...options,
        };
        return toSharedPosition(await plugin.getCurrentPosition(nativeOptions));
      } catch (error) {
        throw nativeError(error);
      }
    },
  };
}

export interface LocationSnapshot {
  position: AppLocationPosition | null;
  error: AppLocationError | null;
  isLoading: boolean;
  permissionState: AppLocationPermission;
}

const INITIAL_LOCATION_SNAPSHOT: LocationSnapshot = {
  position: null,
  error: null,
  isLoading: false,
  permissionState: "prompt",
};

export class LocationService {
  private snapshot = INITIAL_LOCATION_SNAPSHOT;
  private readonly listeners = new Set<() => void>();
  private permissionCheck: Promise<void> | null = null;
  private positionRequest: Promise<void> | null = null;

  constructor(private readonly adapter: LocationAdapter) {}

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private update(next: Partial<LocationSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    this.listeners.forEach((listener) => listener());
  }

  checkPermission() {
    if (!this.permissionCheck) {
      this.permissionCheck = this.adapter.checkPermission()
        .then((permissionState) => this.update({ permissionState }))
        .catch((error) => {
          const locationError = error instanceof AppLocationError ? error : nativeError(error);
          this.update({ error: locationError, permissionState: locationError.kind === "restricted" ? "restricted" : "unavailable" });
        })
        .finally(() => {
          this.permissionCheck = null;
        });
    }
    return this.permissionCheck;
  }

  requestLocation(options?: AppLocationOptions) {
    if (this.positionRequest) return this.positionRequest;
    this.update({ isLoading: true, error: null });
    this.positionRequest = (async () => {
      let permissionState = this.snapshot.permissionState;
      if (platformRuntime.isNative && permissionState === "prompt") {
        permissionState = await this.adapter.requestPermission();
        this.update({ permissionState });
      }
      if (permissionState === "denied" || permissionState === "restricted" || permissionState === "unavailable") {
        throw new AppLocationError(permissionState === "denied" ? "denied" : permissionState, "permission", "Location is not available. Search by station or place instead.");
      }
      const position = await this.adapter.getCurrentPosition(options);
      this.update({ position, permissionState: "granted" });
    })()
      .catch((error) => {
        const locationError = error instanceof AppLocationError ? error : nativeError(error);
        const permissionState = locationError.kind === "denied" || locationError.kind === "restricted" || locationError.kind === "unavailable"
          ? locationError.kind
          : this.snapshot.permissionState;
        this.update({ error: locationError, permissionState });
      })
      .finally(() => {
        this.positionRequest = null;
        this.update({ isLoading: false });
      });
    return this.positionRequest;
  }

  clear() {
    this.update({ position: null, error: null });
  }
}

let sharedLocationService: LocationService | null = null;

export function getLocationService(): LocationService {
  sharedLocationService ??= new LocationService(
    platformRuntime.isNative
      ? createNativeLocationAdapter()
      : createWebLocationAdapter(),
  );
  return sharedLocationService;
}

export function resetLocationServiceForTests(): void {
  sharedLocationService = null;
}
