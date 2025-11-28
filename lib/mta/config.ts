/**
 * MTA Feed Configuration
 * All feed URLs and API settings
 */

// ============================================================================
// Subway GTFS-RT Feed URLs (Protobuf format, no API key required)
// ============================================================================

export const SUBWAY_FEED_URLS = {
  // A, C, E, and Rockaway Shuttle
  ace: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace",
  // B, D, F, M, and Franklin Shuttle
  bdfm: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
  // G
  g: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g",
  // J, Z
  jz: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz",
  // N, Q, R, W
  nqrw: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
  // L
  l: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l",
  // 1, 2, 3, 4, 5, 6, 7, and 42nd Street Shuttle
  "1234567": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  // Staten Island Railway
  sir: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si",
} as const;

export type SubwayFeedKey = keyof typeof SUBWAY_FEED_URLS;

// ============================================================================
// Regional Rail GTFS-RT Feed URLs (Protobuf format)
// ============================================================================

export const RAIL_FEED_URLS = {
  lirr: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/lirr%2Fgtfs-lirr",
  metroNorth: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr",
} as const;

// ============================================================================
// Service Alerts (JSON format, no API key required)
// ============================================================================

export const ALERT_FEED_URLS = {
  all: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fall-alerts.json",
  subway: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts.json",
  bus: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fbus-alerts.json",
  lirr: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Flirr-alerts.json",
  metroNorth: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fmnr-alerts.json",
} as const;

// ============================================================================
// Elevator/Escalator Status (JSON format)
// ============================================================================

export const ELEVATOR_FEED_URLS = {
  currentOutages: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene.json",
  upcomingOutages: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene_upcoming.json",
  allEquipment: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene_equipments.json",
} as const;

// ============================================================================
// Bus GTFS-RT (Requires API key)
// ============================================================================

export const BUS_FEED_URLS = {
  tripUpdates: "https://gtfsrt.prod.obanyc.com/tripUpdates",
  vehiclePositions: "https://gtfsrt.prod.obanyc.com/vehiclePositions",
  alerts: "https://gtfsrt.prod.obanyc.com/alerts",
} as const;

// ============================================================================
// Feed Metadata
// ============================================================================

export const FEED_INFO = {
  subway: {
    name: "Subway GTFS-RT",
    refreshInterval: 30, // seconds
    format: "protobuf" as const,
  },
  alerts: {
    name: "Service Alerts",
    refreshInterval: 60,
    format: "json" as const,
  },
  elevators: {
    name: "Elevator/Escalator Status",
    refreshInterval: 300, // 5 minutes
    format: "json" as const,
  },
  buses: {
    name: "Bus GTFS-RT",
    refreshInterval: 30,
    format: "protobuf" as const,
    requiresApiKey: true,
  },
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the Bus Time API key from environment
 */
export function getBusApiKey(): string | null {
  return process.env.MTA_BUS_API_KEY ?? null;
}

/**
 * Build bus feed URL with API key
 */
export function getBusFeedUrl(feed: keyof typeof BUS_FEED_URLS): string | null {
  const apiKey = getBusApiKey();
  if (!apiKey) return null;
  return `${BUS_FEED_URLS[feed]}?key=${apiKey}`;
}

/**
 * Get all subway feed URLs as an array
 */
export function getAllSubwayFeedUrls(): Array<{ id: SubwayFeedKey; url: string }> {
  return Object.entries(SUBWAY_FEED_URLS).map(([id, url]) => ({
    id: id as SubwayFeedKey,
    url,
  }));
}

