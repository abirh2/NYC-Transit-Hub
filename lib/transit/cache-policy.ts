export type TransitCacheClass =
  | "realtime"
  | "slow-changing"
  | "static"
  | "uncached";

/**
 * Runtime caching and rider-facing freshness are separate limits. A cached
 * realtime response expires well before the UI's stale threshold, so an old
 * ETA cannot look current merely because the service worker had a response.
 */
export const TRANSIT_RUNTIME_CACHE = {
  realtime: {
    maxAgeSeconds: 45,
    staleAfterMs: 2 * 60 * 1_000,
  },
  "slow-changing": {
    maxAgeSeconds: 5 * 60,
  },
  static: {
    maxAgeSeconds: 24 * 60 * 60,
  },
} as const;

/** Server-side feed revalidation values retained for existing MTA clients. */
export const TRANSIT_CACHE_SECONDS = {
  staticMetadata: 60 * 60,
  realtime: 30,
  alerts: 60,
} as const;

export const REALTIME_STALE_AFTER_MS =
  TRANSIT_RUNTIME_CACHE.realtime.staleAfterMs;

const REALTIME_PREFIXES = [
  "/api/trains/realtime",
  "/api/buses/realtime",
  "/api/buses/nearby",
  "/api/alerts",
  "/api/incidents",
  "/api/elevators",
  "/api/lirr/realtime",
  "/api/metro-north/realtime",
] as const;

const SLOW_CHANGING_PREFIXES = [
  "/api/reliability",
  "/api/metrics/crowding",
  "/api/status",
  "/api/commute/summary",
] as const;

function pathnameFromPathOrUrl(pathOrUrl: string): string {
  try {
    return new URL(pathOrUrl, "https://transit.local").pathname;
  } catch {
    return pathOrUrl.split("?", 1)[0];
  }
}

export function classifyTransitRequest(pathOrUrl: string): TransitCacheClass {
  const pathname = pathnameFromPathOrUrl(pathOrUrl);

  if (REALTIME_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return "realtime";
  }

  if (SLOW_CHANGING_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return "slow-changing";
  }

  if (
    pathname === "/api/stations" ||
    pathname === "/api/routes" ||
    pathname === "/api/buses/stops" ||
    pathname === "/api/buses/routes" ||
    pathname === "/api/lirr/stations" ||
    pathname === "/api/metro-north/stations" ||
    pathname.startsWith("/data/gtfs/")
  ) {
    return "static";
  }

  return "uncached";
}
