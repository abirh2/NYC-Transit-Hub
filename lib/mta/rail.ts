/**
 * MTA Regional Rail Feed Client
 * Fetches and parses LIRR and Metro-North GTFS-RT feeds
 */

import protobuf from "protobufjs";
import type { RailArrival, TransitMode } from "@/types/mta";
import { RAIL_FEED_URLS } from "./config";

// ============================================================================
// Protobuf Schema
// ============================================================================

const GTFS_RT_PROTO = `
syntax = "proto2";

message FeedMessage {
  required FeedHeader header = 1;
  repeated FeedEntity entity = 2;
}

message FeedHeader {
  required string gtfs_realtime_version = 1;
  optional uint64 timestamp = 3;
}

message FeedEntity {
  required string id = 1;
  optional TripUpdate trip_update = 3;
  optional VehiclePosition vehicle = 4;
}

message TripUpdate {
  optional TripDescriptor trip = 1;
  optional VehicleDescriptor vehicle = 3;
  repeated StopTimeUpdate stop_time_update = 2;
  optional uint64 timestamp = 4;
}

message TripDescriptor {
  optional string trip_id = 1;
  optional string route_id = 5;
  optional uint32 direction_id = 6;
  optional string start_time = 2;
  optional string start_date = 3;
}

message VehicleDescriptor {
  optional string id = 1;
  optional string label = 2;
}

message StopTimeUpdate {
  optional uint32 stop_sequence = 1;
  optional string stop_id = 4;
  optional StopTimeEvent arrival = 2;
  optional StopTimeEvent departure = 3;
}

message StopTimeEvent {
  optional int64 time = 2;
  optional int32 delay = 1;
}

message VehiclePosition {
  optional TripDescriptor trip = 1;
  optional VehicleDescriptor vehicle = 8;
  optional Position position = 2;
  optional string stop_id = 7;
}

message Position {
  required float latitude = 1;
  required float longitude = 2;
}
`;

let protoRoot: protobuf.Root | null = null;

async function getProtoRoot(): Promise<protobuf.Root> {
  if (protoRoot) return protoRoot;
  protoRoot = protobuf.parse(GTFS_RT_PROTO).root;
  return protoRoot;
}

// ============================================================================
// Feed Types
// ============================================================================

interface RailFeedMessage {
  header: {
    gtfsRealtimeVersion: string;
    timestamp: number;
  };
  entity: RailFeedEntity[];
}

interface RailFeedEntity {
  id: string;
  tripUpdate?: {
    trip: {
      tripId?: string;
      routeId?: string;
      directionId?: number;
      startTime?: string;
      startDate?: string;
    };
    vehicle?: {
      id?: string;
      label?: string;
    };
    stopTimeUpdate: Array<{
      stopSequence?: number;
      stopId?: string;
      arrival?: { time?: number; delay?: number };
      departure?: { time?: number; delay?: number };
    }>;
    timestamp?: number;
  };
  vehicle?: {
    trip?: {
      tripId?: string;
      routeId?: string;
    };
    vehicle?: {
      id?: string;
      label?: string;
    };
    position?: {
      latitude: number;
      longitude: number;
    };
    stopId?: string;
  };
}

// ============================================================================
// Branch/Line Mappings
// ============================================================================

// LIRR branch names by route ID
export const LIRR_BRANCHES: Record<string, string> = {
  "1": "Babylon",
  "2": "City Terminal Zone",
  "3": "Far Rockaway",
  "4": "Hempstead",
  "5": "Long Beach",
  "6": "Montauk",
  "7": "Oyster Bay",
  "8": "Port Jefferson",
  "9": "Port Washington",
  "10": "Ronkonkoma",
  "11": "West Hempstead",
  "12": "Belmont Park",
  "13": "Atlantic Branch",
};

// Metro-North line names by route ID
export const MNR_LINES: Record<string, string> = {
  "1": "Hudson",
  "2": "Harlem",
  "3": "New Haven",
  "4": "New Canaan",
  "5": "Danbury",
  "6": "Waterbury",
};

// ============================================================================
// Feed Fetching
// ============================================================================

type RailFeedType = "lirr" | "metroNorth";

/**
 * Fetch and parse a rail GTFS-RT feed
 */
export async function fetchRailFeed(feedType: RailFeedType): Promise<RailFeedMessage | null> {
  const url = RAIL_FEED_URLS[feedType];

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/x-protobuf",
      },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${feedType} feed: ${response.status}`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    return await parseRailFeed(Buffer.from(buffer));
  } catch (error) {
    console.error(`Error fetching ${feedType} feed:`, error);
    return null;
  }
}

/**
 * Parse rail GTFS-RT feed
 */
async function parseRailFeed(buffer: Buffer): Promise<RailFeedMessage> {
  const root = await getProtoRoot();
  const FeedMessage = root.lookupType("FeedMessage");
  const message = FeedMessage.decode(new Uint8Array(buffer));
  return FeedMessage.toObject(message, {
    longs: Number,
    enums: String,
    defaults: true,
  }) as unknown as RailFeedMessage;
}

// ============================================================================
// Data Extraction
// ============================================================================

/**
 * Get branch/line name from route ID
 */
export function getBranchName(routeId: string, mode: TransitMode): string {
  if (mode === "lirr") {
    return LIRR_BRANCHES[routeId] ?? `Branch ${routeId}`;
  }
  if (mode === "metro-north") {
    return MNR_LINES[routeId] ?? `Line ${routeId}`;
  }
  return routeId;
}

/**
 * Extract a train identifier for display
 * 
 * The ENTITY ID is what MTA actually uses to identify trains:
 * 
 * Metro-North: Entity ID IS the train number (e.g., "1324", "1248")
 *              These are 4-digit numbers that identify the train
 * 
 * LIRR: Entity ID is like "GO103_25_809_T" where 809 is the train number
 *       The _T suffix indicates TripUpdate, _V indicates VehiclePosition
 * 
 * Returns the train number/identifier for display
 */
function extractTrainNumber(entityId: string, mode: TransitMode): string | null {
  // Metro-North: Entity ID is directly the train number (4 digits)
  // e.g., "1324", "1248", "1275"
  if (mode === "metro-north") {
    // Entity ID should be a pure number for Metro-North
    if (/^\d{3,5}$/.test(entityId)) {
      return entityId;
    }
  }
  
  // LIRR: Entity ID is like "GO103_25_809_T" 
  // Extract the train number (809) from the pattern
  if (mode === "lirr") {
    // Pattern: GO{scheduleId}_{date}_{trainNumber}_{suffix}
    // e.g., "GO103_25_809_T" -> "809"
    const lirrMatch = entityId.match(/GO\d+_\d+_(\d{2,4})(?:_\d+)?_[TV]$/);
    if (lirrMatch) {
      return lirrMatch[1];
    }
    
    // Alternative: might have extra segments like "GO103_25_420_2891_METS_T"
    // In this case "420" is the train number
    const lirrAltMatch = entityId.match(/GO\d+_\d+_(\d{2,4})_/);
    if (lirrAltMatch) {
      return lirrAltMatch[1];
    }
  }
  
  // Fallback: try to find a reasonable train number in the ID
  const trainNum = entityId.match(/(?:^|_)(\d{3,4})(?:_|$)/);
  if (trainNum) {
    return trainNum[1];
  }
  
  return null;
}

// Default time window for "active" trains (60 minutes)
const DEFAULT_MAX_MINUTES_AWAY = 60;

/**
 * Extract rail arrivals from feed
 * Returns ONE arrival per trip (the next upcoming stop for each train)
 * Only includes trains arriving within maxMinutesAway (default 60 min)
 */
export function extractRailArrivals(
  feed: RailFeedMessage,
  mode: TransitMode,
  options?: {
    routeId?: string;
    stopId?: string;
    limit?: number;
    maxMinutesAway?: number; // Only show trains arriving within this many minutes
  }
): RailArrival[] {
  const arrivals: RailArrival[] = [];
  const now = Date.now();
  const maxMinutes = options?.maxMinutesAway ?? DEFAULT_MAX_MINUTES_AWAY;
  const maxTime = now + maxMinutes * 60 * 1000;

  for (const entity of feed.entity) {
    if (!entity.tripUpdate) continue;

    const tripUpdate = entity.tripUpdate;
    const trip = tripUpdate.trip;
    const routeId = trip.routeId ?? "";

    // Apply route filter
    if (options?.routeId && routeId !== options.routeId) {
      continue;
    }

    const branchName = getBranchName(routeId, mode);
    
    // Determine direction from stop sequence, not directionId (which is often unreliable)
    // For Metro-North/LIRR: Grand Central = stop "1", Penn Station = varies
    // If the LAST stop in the sequence is the terminal (1), it's inbound
    const stopUpdates = tripUpdate.stopTimeUpdate || [];
    const lastStopId = stopUpdates[stopUpdates.length - 1]?.stopId;
    const firstStopId = stopUpdates[0]?.stopId;
    
    // Infer direction: 
    // - If last stop is "1" (Grand Central for MNR), it's inbound
    // - If first stop is "1" (or another terminal), it's outbound
    // - Fall back to directionId if we can't determine
    let direction: "inbound" | "outbound";
    if (mode === "metro-north") {
      // Metro-North: stop "1" is Grand Central
      direction = lastStopId === "1" ? "inbound" : "outbound";
    } else if (mode === "lirr") {
      // LIRR: Penn Station varies by branch, but we can use first vs last stop pattern
      // If first stop is a major terminal (low ID), it's outbound
      const firstStopNum = parseInt(firstStopId || "999");
      const lastStopNum = parseInt(lastStopId || "999");
      direction = lastStopNum < firstStopNum ? "inbound" : "outbound";
    } else {
      direction = trip.directionId === 0 ? "outbound" : "inbound";
    }

    // Find the NEXT stop for this trip (first future stop)
    // This prevents showing all future stops and inflating times
    let nextStop: typeof tripUpdate.stopTimeUpdate[0] | null = null;
    
    for (const stopTime of tripUpdate.stopTimeUpdate) {
      const arrivalTime = stopTime.arrival?.time
        ? stopTime.arrival.time * 1000
        : stopTime.departure?.time
          ? stopTime.departure.time * 1000
          : null;

      // Skip if no time or already passed
      if (!arrivalTime || arrivalTime < now) {
        continue;
      }

      // Skip if too far in the future (not an "active" train)
      if (arrivalTime > maxTime) {
        continue;
      }

      // If filtering by stopId, only consider that stop
      if (options?.stopId) {
        if (stopTime.stopId === options.stopId) {
          nextStop = stopTime;
          break;
        }
      } else {
        // Otherwise take the first future stop (next stop)
        nextStop = stopTime;
        break;
      }
    }

    // Skip if no upcoming stop found within time window
    if (!nextStop) continue;

    const arrivalTime = nextStop.arrival?.time
      ? new Date(nextStop.arrival.time * 1000)
      : nextStop.departure?.time
        ? new Date(nextStop.departure.time * 1000)
        : null;

    if (!arrivalTime) continue;

    const delay = nextStop.arrival?.delay ?? nextStop.departure?.delay ?? 0;
    const minutesAway = Math.round((arrivalTime.getTime() - now) / 60000);

    // Extract train number from entity ID (this is what MTA uses to identify trains)
    const trainNumber = extractTrainNumber(entity.id, mode);

    arrivals.push({
      tripId: trip.tripId ?? "",
      routeId,
      branchName,
      direction,
      stopId: nextStop.stopId ?? "",
      stopName: "", // Will be populated from station lookup
      arrivalTime,
      departureTime: nextStop.departure?.time
        ? new Date(nextStop.departure.time * 1000)
        : null,
      delay,
      minutesAway,
      trainId: trainNumber,
      mode,
    });
  }

  // Sort by arrival time
  arrivals.sort((a, b) => a.arrivalTime.getTime() - b.arrivalTime.getTime());

  // Apply limit
  if (options?.limit) {
    return arrivals.slice(0, options.limit);
  }

  return arrivals;
}

/**
 * Get active routes from feed
 */
export function extractActiveRoutes(
  feed: RailFeedMessage,
  mode: TransitMode
): Array<{ id: string; name: string }> {
  const routeIds = new Set<string>();

  for (const entity of feed.entity) {
    const routeId = entity.tripUpdate?.trip.routeId ?? entity.vehicle?.trip?.routeId;
    if (routeId) {
      routeIds.add(routeId);
    }
  }

  return Array.from(routeIds)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map((id) => ({
      id,
      name: getBranchName(id, mode),
    }));
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get LIRR arrivals
 */
export async function getLirrArrivals(options?: {
  routeId?: string;
  stopId?: string;
  limit?: number;
}): Promise<RailArrival[]> {
  const feed = await fetchRailFeed("lirr");
  if (!feed) return [];
  return extractRailArrivals(feed, "lirr", options);
}

/**
 * Get Metro-North arrivals
 */
export async function getMetroNorthArrivals(options?: {
  routeId?: string;
  stopId?: string;
  limit?: number;
}): Promise<RailArrival[]> {
  const feed = await fetchRailFeed("metroNorth");
  if (!feed) return [];
  return extractRailArrivals(feed, "metro-north", options);
}

/**
 * Get active LIRR branches
 */
export async function getActiveLirrBranches(): Promise<Array<{ id: string; name: string }>> {
  const feed = await fetchRailFeed("lirr");
  if (!feed) {
    // Return all branches as fallback
    return Object.entries(LIRR_BRANCHES).map(([id, name]) => ({ id, name }));
  }
  return extractActiveRoutes(feed, "lirr");
}

/**
 * Get active Metro-North lines
 */
export async function getActiveMetroNorthLines(): Promise<Array<{ id: string; name: string }>> {
  const feed = await fetchRailFeed("metroNorth");
  if (!feed) {
    // Return all lines as fallback
    return Object.entries(MNR_LINES).map(([id, name]) => ({ id, name }));
  }
  return extractActiveRoutes(feed, "metro-north");
}

/**
 * Get rail summary (for dashboard)
 */
export async function getRailSummary(mode: "lirr" | "metro-north"): Promise<{
  totalTrains: number;
  activeRoutes: Array<{ id: string; name: string }>;
  isLive: boolean;
}> {
  try {
    const feedType: RailFeedType = mode === "lirr" ? "lirr" : "metroNorth";
    const feed = await fetchRailFeed(feedType);

    if (!feed) {
      const fallbackRoutes =
        mode === "lirr"
          ? Object.entries(LIRR_BRANCHES).map(([id, name]) => ({ id, name }))
          : Object.entries(MNR_LINES).map(([id, name]) => ({ id, name }));

      return {
        totalTrains: 0,
        activeRoutes: fallbackRoutes,
        isLive: false,
      };
    }

    // Count unique trips
    const trips = new Set<string>();
    for (const entity of feed.entity) {
      const tripId = entity.tripUpdate?.trip.tripId ?? entity.vehicle?.trip?.tripId;
      if (tripId) trips.add(tripId);
    }

    const activeRoutes = extractActiveRoutes(feed, mode);

    return {
      totalTrains: trips.size,
      activeRoutes,
      isLive: true,
    };
  } catch (error) {
    console.error(`Failed to get ${mode} summary:`, error);

    const fallbackRoutes =
      mode === "lirr"
        ? Object.entries(LIRR_BRANCHES).map(([id, name]) => ({ id, name }))
        : Object.entries(MNR_LINES).map(([id, name]) => ({ id, name }));

    return {
      totalTrains: 0,
      activeRoutes: fallbackRoutes,
      isLive: false,
    };
  }
}

