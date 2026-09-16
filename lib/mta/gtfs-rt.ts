/**
 * GTFS-RT Protobuf Parser
 * Parses MTA subway GTFS-Realtime feeds
 */

import protobuf from "protobufjs";
import type { MtaFeedMessage } from "@/types/gtfs";
import type { TrainArrival } from "@/types/mta";
import { toLegacyTrainArrivals } from "@/lib/transit/legacy";
import { normalizeSubwayFeed } from "@/lib/transit/subway-adapter";
import { TRANSIT_CACHE_SECONDS } from "@/lib/transit/cache-policy";
import { SUBWAY_FEED_URLS, type SubwayFeedKey } from "./config";

// ============================================================================
// Protobuf Schema Definition
// ============================================================================

// GTFS-RT proto schema (inline to avoid file dependency)
const GTFS_RT_PROTO = `
syntax = "proto2";

message FeedMessage {
  required FeedHeader header = 1;
  repeated FeedEntity entity = 2;
}

message FeedHeader {
  required string gtfs_realtime_version = 1;
  optional Incrementality incrementality = 2 [default = FULL_DATASET];
  optional uint64 timestamp = 3;
  
  enum Incrementality {
    FULL_DATASET = 0;
    DIFFERENTIAL = 1;
  }
}

message FeedEntity {
  required string id = 1;
  optional bool is_deleted = 2 [default = false];
  optional TripUpdate trip_update = 3;
  optional VehiclePosition vehicle = 4;
  optional Alert alert = 5;
}

message TripUpdate {
  optional TripDescriptor trip = 1;
  optional VehicleDescriptor vehicle = 3;
  repeated StopTimeUpdate stop_time_update = 2;
  optional uint64 timestamp = 4;
  optional int32 delay = 5;
}

message TripDescriptor {
  optional string trip_id = 1;
  optional string route_id = 5;
  optional uint32 direction_id = 6;
  optional string start_time = 2;
  optional string start_date = 3;
  optional ScheduleRelationship schedule_relationship = 4;
  
  enum ScheduleRelationship {
    SCHEDULED = 0;
    ADDED = 1;
    UNSCHEDULED = 2;
    CANCELED = 3;
  }
  
  // MTA NYCT extension
  optional NyctTripDescriptor nyct_trip_descriptor = 1001;
}

message NyctTripDescriptor {
  optional string train_id = 1;
  optional bool is_assigned = 2;
  optional Direction direction = 3;
  
  enum Direction {
    NORTH = 1;
    EAST = 2;
    SOUTH = 3;
    WEST = 4;
  }
}

message VehicleDescriptor {
  optional string id = 1;
  optional string label = 2;
  optional string license_plate = 3;
}

message StopTimeUpdate {
  optional uint32 stop_sequence = 1;
  optional string stop_id = 4;
  optional StopTimeEvent arrival = 2;
  optional StopTimeEvent departure = 3;
  optional ScheduleRelationship schedule_relationship = 5 [default = SCHEDULED];
  
  enum ScheduleRelationship {
    SCHEDULED = 0;
    SKIPPED = 1;
    NO_DATA = 2;
  }
  
  // MTA NYCT extension
  optional NyctStopTimeUpdate nyct_stop_time_update = 1001;
}

message NyctStopTimeUpdate {
  optional string scheduled_track = 1;
  optional string actual_track = 2;
}

message StopTimeEvent {
  optional int32 delay = 1;
  optional int64 time = 2;
  optional int32 uncertainty = 3;
}

message VehiclePosition {
  optional TripDescriptor trip = 1;
  optional VehicleDescriptor vehicle = 8;
  optional Position position = 2;
  optional uint32 current_stop_sequence = 3;
  optional string stop_id = 7;
  optional VehicleStopStatus current_status = 4 [default = IN_TRANSIT_TO];
  optional uint64 timestamp = 5;
  optional CongestionLevel congestion_level = 6;
  
  enum VehicleStopStatus {
    INCOMING_AT = 0;
    STOPPED_AT = 1;
    IN_TRANSIT_TO = 2;
  }
  
  enum CongestionLevel {
    UNKNOWN_CONGESTION_LEVEL = 0;
    RUNNING_SMOOTHLY = 1;
    STOP_AND_GO = 2;
    CONGESTION = 3;
    SEVERE_CONGESTION = 4;
  }
}

message Position {
  required float latitude = 1;
  required float longitude = 2;
  optional float bearing = 3;
  optional double odometer = 4;
  optional float speed = 5;
}

message Alert {
  repeated TimeRange active_period = 1;
  repeated EntitySelector informed_entity = 5;
  optional Cause cause = 6 [default = UNKNOWN_CAUSE];
  optional Effect effect = 7 [default = UNKNOWN_EFFECT];
  optional TranslatedString url = 8;
  optional TranslatedString header_text = 10;
  optional TranslatedString description_text = 11;
  
  enum Cause {
    UNKNOWN_CAUSE = 1;
    OTHER_CAUSE = 2;
    TECHNICAL_PROBLEM = 3;
    STRIKE = 4;
    DEMONSTRATION = 5;
    ACCIDENT = 6;
    HOLIDAY = 7;
    WEATHER = 8;
    MAINTENANCE = 9;
    CONSTRUCTION = 10;
    POLICE_ACTIVITY = 11;
    MEDICAL_EMERGENCY = 12;
  }
  
  enum Effect {
    NO_SERVICE = 1;
    REDUCED_SERVICE = 2;
    SIGNIFICANT_DELAYS = 3;
    DETOUR = 4;
    ADDITIONAL_SERVICE = 5;
    MODIFIED_SERVICE = 6;
    OTHER_EFFECT = 7;
    UNKNOWN_EFFECT = 8;
    STOP_MOVED = 9;
    NO_EFFECT = 10;
    ACCESSIBILITY_ISSUE = 11;
  }
}

message TimeRange {
  optional uint64 start = 1;
  optional uint64 end = 2;
}

message EntitySelector {
  optional string agency_id = 1;
  optional string route_id = 2;
  optional int32 route_type = 3;
  optional TripDescriptor trip = 4;
  optional string stop_id = 5;
}

message TranslatedString {
  repeated Translation translation = 1;
  
  message Translation {
    required string text = 1;
    optional string language = 2;
  }
}
`;

// Cached protobuf root
let protoRoot: protobuf.Root | null = null;

/**
 * Get or create the protobuf root
 */
async function getProtoRoot(): Promise<protobuf.Root> {
  if (protoRoot) return protoRoot;
  protoRoot = protobuf.parse(GTFS_RT_PROTO).root;
  return protoRoot;
}

// ============================================================================
// Feed Fetching and Parsing
// ============================================================================

/**
 * Fetch and parse a single subway GTFS-RT feed
 */
export async function fetchSubwayFeed(feedKey: SubwayFeedKey): Promise<MtaFeedMessage | null> {
  const url = SUBWAY_FEED_URLS[feedKey];
  
  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/x-protobuf",
      },
      next: { revalidate: TRANSIT_CACHE_SECONDS.realtime },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch ${feedKey} feed: ${response.status}`);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    return await parseGtfsRt(Buffer.from(buffer));
  } catch (error) {
    console.error(`Error fetching ${feedKey} feed:`, error);
    return null;
  }
}

/**
 * Parse GTFS-RT protobuf buffer
 */
export async function parseGtfsRt(buffer: Buffer): Promise<MtaFeedMessage> {
  const root = await getProtoRoot();
  const FeedMessage = root.lookupType("FeedMessage");
  const message = FeedMessage.decode(new Uint8Array(buffer));
  return FeedMessage.toObject(message, {
    longs: Number,
    enums: String,
    defaults: true,
  }) as unknown as MtaFeedMessage;
}

/**
 * Fetch all subway feeds in parallel
 */
export async function fetchAllSubwayFeeds(): Promise<Map<SubwayFeedKey, MtaFeedMessage>> {
  const feedKeys = Object.keys(SUBWAY_FEED_URLS) as SubwayFeedKey[];
  const results = await Promise.allSettled(
    feedKeys.map(async (key) => {
      const feed = await fetchSubwayFeed(key);
      return { key, feed };
    })
  );
  
  const feedMap = new Map<SubwayFeedKey, MtaFeedMessage>();
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.feed) {
      feedMap.set(result.value.key, result.value.feed);
    }
  }
  
  return feedMap;
}

// ============================================================================
// Data Extraction Helpers
// ============================================================================

/**
 * Extract train arrivals from a feed message
 */
export function extractArrivals(
  feed: MtaFeedMessage,
  options?: {
    stationId?: string;
    routeId?: string;
    limit?: number;
  }
): TrainArrival[] {
  const snapshot = normalizeSubwayFeed(feed);
  return toLegacyTrainArrivals({
    trips: snapshot.trips,
    departures: snapshot.departures.filter(
      (departure) =>
        (!options?.routeId || departure.routeId === options.routeId) &&
        (!options?.stationId ||
          departure.stopId === options.stationId ||
          departure.stationId === options.stationId),
    ),
  }).slice(0, options?.limit);
}

/**
 * Get feed timestamp
 */
export function getFeedTimestamp(feed: MtaFeedMessage): Date {
  return new Date(feed.header.timestamp * 1000);
}
