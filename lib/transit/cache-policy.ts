/** Freshness differs by data class; keep feed clients aligned here. */
export const TRANSIT_CACHE_SECONDS = {
  staticMetadata: 60 * 60,
  realtime: 30,
  alerts: 60,
} as const;

/** A feed older than this is returned with `sourceState: "stale"`. */
export const REALTIME_STALE_AFTER_MS = 2 * 60 * 1000;
