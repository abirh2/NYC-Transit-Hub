/**
 * MTA Regional Rail Feed Client
 * Fetches and parses LIRR and Metro-North GTFS-RT feeds
 * 
 * NOTE: The MTA GTFS-RT feed is incomplete for some trains (particularly 
 * Shore Line East inbound trains). For these trains, intermediate NY stops
 * like Harlem-125th St are missing from the real-time feed even though the
 * train actually stops there.
 * 
 * This module merges GTFS-RT data with static schedule data to provide
 * complete stop information, applying real-time delays to scheduled times.
 */

import protobuf from "protobufjs";
import type { RailArrival, TransitMode } from "@/types/mta";
import { RAIL_FEED_URLS } from "./config";

// ============================================================================
// Static Schedule Data (for filling gaps in GTFS-RT)
// ============================================================================

// Types for static schedule lookup
interface ScheduledStop {
  id: string;
  name: string;
  time: string; // HH:MM:SS format
}

type ScheduleLookup = Record<string, ScheduledStop[]>;

// Lazy-loaded schedule lookups (loaded from JSON at runtime)
let mnrScheduleLookup: ScheduleLookup | null = null;
let lirrScheduleLookup: ScheduleLookup | null = null;

/**
 * Load the Metro-North static schedule lookup
 * This is lazily loaded on first use
 */
async function loadMnrSchedule(): Promise<ScheduleLookup> {
  if (mnrScheduleLookup) return mnrScheduleLookup;
  
  try {
    // In Next.js, we use dynamic import for JSON files
    const data = await import('@/data/gtfs/mnr-schedule-lookup.json');
    mnrScheduleLookup = data.default as ScheduleLookup;
    return mnrScheduleLookup;
  } catch (error) {
    console.error('Failed to load MNR schedule lookup:', error);
    return {};
  }
}

/**
 * Load the LIRR static schedule lookup
 * This is lazily loaded on first use
 */
async function loadLirrSchedule(): Promise<ScheduleLookup> {
  if (lirrScheduleLookup) return lirrScheduleLookup;
  
  try {
    const data = await import('@/data/gtfs/lirr-schedule-lookup.json');
    lirrScheduleLookup = data.default as ScheduleLookup;
    return lirrScheduleLookup;
  } catch (error) {
    console.error('Failed to load LIRR schedule lookup:', error);
    return {};
  }
}

/**
 * Parse time string (HH:MM:SS) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Get scheduled stop times for a train by train number
 * Returns null if train not found in schedule
 */
async function getScheduledStops(trainNumber: string, mode: TransitMode): Promise<ScheduledStop[] | null> {
  if (mode === 'metro-north') {
    const schedule = await loadMnrSchedule();
    return schedule[trainNumber] ?? null;
  }
  
  if (mode === 'lirr') {
    const schedule = await loadLirrSchedule();
    return schedule[trainNumber] ?? null;
  }
  
  return null;
}

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
  optional ScheduleRelationship schedule_relationship = 5;
  // MTA Metro-North/LIRR extension: track and status info
  optional MnrStopTimeUpdateExtension mnr_extension = 1005;
  
  enum ScheduleRelationship {
    SCHEDULED = 0;
    SKIPPED = 1;
    NO_DATA = 2;
  }
}

// MTA Metro-North/LIRR extension for stop status
message MnrStopTimeUpdateExtension {
  optional string track = 1;
  optional string status = 2;  // "Departed", "Arriving", "On-Time", "Late", etc.
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
 * Extract rail arrivals from feed, merging with static schedule when needed
 * Returns ONE arrival per trip (the next upcoming stop for each train)
 * Only includes trains arriving within maxMinutesAway (default 60 min)
 * 
 * For trains where GTFS-RT is missing intermediate stops, this function
 * fills in from the static schedule and applies real-time delays.
 */
export async function extractRailArrivals(
  feed: RailFeedMessage,
  mode: TransitMode,
  options?: {
    routeId?: string;
    stopId?: string;
    limit?: number;
    maxMinutesAway?: number; // Only show trains arriving within this many minutes
  }
): Promise<RailArrival[]> {
  const arrivals: RailArrival[] = [];
  const now = Date.now();
  const maxMinutes = options?.maxMinutesAway ?? DEFAULT_MAX_MINUTES_AWAY;
  const maxTime = now + maxMinutes * 60 * 1000;
  
  // Get current date for schedule time calculations
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

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
    
    // Extract train number from entity ID (this is what MTA uses to identify trains)
    const trainNumber = extractTrainNumber(entity.id, mode);
    
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

    // Calculate delay from any stop that has it
    let delay = 0;
    for (const stop of stopUpdates) {
      if (stop.arrival?.delay) {
        delay = stop.arrival.delay;
        break;
      }
      if (stop.departure?.delay) {
        delay = stop.departure.delay;
        break;
      }
    }

    // Build a map of stopId -> realtime arrival time from GTFS-RT
    const realtimeStops = new Map<string, { time: number; delay: number }>();
    for (const stopTime of stopUpdates) {
      const arrivalTime = stopTime.arrival?.time
        ? stopTime.arrival.time * 1000
        : stopTime.departure?.time
          ? stopTime.departure.time * 1000
          : null;
      if (arrivalTime && stopTime.stopId) {
        realtimeStops.set(stopTime.stopId, {
          time: arrivalTime,
          delay: stopTime.arrival?.delay ?? stopTime.departure?.delay ?? 0,
        });
      }
    }

    // Check if we need to fill in missing stops from static schedule
    // This handles the case where GTFS-RT is missing intermediate stops
    let scheduledStops: ScheduledStop[] | null = null;
    if ((mode === 'metro-north' || mode === 'lirr') && trainNumber) {
      scheduledStops = await getScheduledStops(trainNumber, mode);
    }

    // If filtering by stopId, check if it's in the real-time data OR static schedule
    if (options?.stopId) {
      // First check if stopId is in real-time data
      if (realtimeStops.has(options.stopId)) {
        const rt = realtimeStops.get(options.stopId)!;
        if (rt.time >= now && rt.time <= maxTime) {
          const arrivalTime = new Date(rt.time);
          arrivals.push({
            tripId: trip.tripId ?? "",
            routeId,
            branchName,
            direction,
            stopId: options.stopId,
            stopName: scheduledStops?.find(s => s.id === options.stopId)?.name ?? "",
            arrivalTime,
            departureTime: null,
            delay: rt.delay,
            minutesAway: Math.round((rt.time - now) / 60000),
            trainId: trainNumber,
            mode,
          });
        }
        continue; // Found in real-time, no need to check schedule
      }
      
      // Check if stopId is in static schedule (but missing from GTFS-RT)
      if (scheduledStops) {
        const scheduledStop = scheduledStops.find(s => s.id === options.stopId);
        if (scheduledStop) {
          // Calculate arrival time from schedule + delay
          const scheduledMins = timeToMinutes(scheduledStop.time);
          const scheduledTime = todayMidnight + scheduledMins * 60 * 1000 + delay * 1000;
          
          if (scheduledTime >= now && scheduledTime <= maxTime) {
            arrivals.push({
              tripId: trip.tripId ?? "",
              routeId,
              branchName,
              direction,
              stopId: options.stopId,
              stopName: scheduledStop.name,
              arrivalTime: new Date(scheduledTime),
              departureTime: null,
              delay,
              minutesAway: Math.round((scheduledTime - now) / 60000),
              trainId: trainNumber,
              mode,
            });
          }
        }
      }
      continue;
    }

    // Not filtering by stopId - find the next stop
    // First, build a combined list of all stops (real-time + scheduled)
    type CombinedStop = {
      stopId: string;
      stopName: string;
      arrivalTime: number;
      delay: number;
      isFromSchedule: boolean;
    };
    
    const combinedStops: CombinedStop[] = [];
    
    // Add all real-time stops
    for (const [stopId, data] of realtimeStops) {
      combinedStops.push({
        stopId,
        stopName: scheduledStops?.find(s => s.id === stopId)?.name ?? "",
        arrivalTime: data.time,
        delay: data.delay,
        isFromSchedule: false,
      });
    }
    
    // Add scheduled stops that are missing from real-time
    if (scheduledStops) {
      for (const scheduled of scheduledStops) {
        if (!realtimeStops.has(scheduled.id)) {
          // This stop is in schedule but not in real-time feed
          const scheduledMins = timeToMinutes(scheduled.time);
          const scheduledTime = todayMidnight + scheduledMins * 60 * 1000 + delay * 1000;
          
          combinedStops.push({
            stopId: scheduled.id,
            stopName: scheduled.name,
            arrivalTime: scheduledTime,
            delay,
            isFromSchedule: true,
          });
        }
      }
    }
    
    // Sort by arrival time
    combinedStops.sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    // Find the next stop (first future stop within time window)
    let nextStop: CombinedStop | null = null;
    for (const stop of combinedStops) {
      if (stop.arrivalTime >= now && stop.arrivalTime <= maxTime) {
        nextStop = stop;
        break;
      }
    }

    // Skip if no upcoming stop found within time window
    if (!nextStop) continue;

    arrivals.push({
      tripId: trip.tripId ?? "",
      routeId,
      branchName,
      direction,
      stopId: nextStop.stopId,
      stopName: nextStop.stopName,
      arrivalTime: new Date(nextStop.arrivalTime),
      departureTime: null,
      delay: nextStop.delay,
      minutesAway: Math.round((nextStop.arrivalTime - now) / 60000),
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
  return await extractRailArrivals(feed, "lirr", options);
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
  return await extractRailArrivals(feed, "metro-north", options);
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

