/**
 * MTA Bus Feed Client
 * Fetches and parses bus GTFS-RT feeds (requires API key)
 */

import protobuf from "protobufjs";
import type { BusArrival } from "@/types/mta";
import { getBusFeedUrl } from "./config";

// Reuse the same GTFS-RT proto schema from gtfs-rt.ts
// The bus feeds use standard GTFS-RT format

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
}

message TripDescriptor {
  optional string trip_id = 1;
  optional string route_id = 5;
}

message VehicleDescriptor {
  optional string id = 1;
  optional string label = 2;
}

message StopTimeUpdate {
  optional string stop_id = 4;
  optional StopTimeEvent arrival = 2;
  optional StopTimeEvent departure = 3;
}

message StopTimeEvent {
  optional int64 time = 2;
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
  optional float bearing = 3;
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

interface BusFeedMessage {
  header: {
    gtfsRealtimeVersion: string;
    timestamp: number;
  };
  entity: BusFeedEntity[];
}

interface BusFeedEntity {
  id: string;
  tripUpdate?: {
    trip: {
      tripId?: string;
      routeId?: string;
    };
    vehicle?: {
      id?: string;
    };
    stopTimeUpdate: Array<{
      stopId?: string;
      arrival?: { time?: number };
      departure?: { time?: number };
    }>;
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
      bearing?: number;
    };
    stopId?: string;
  };
}

// ============================================================================
// Bus Feed Fetching
// ============================================================================

/**
 * Check if bus API key is configured
 */
export function isBusApiConfigured(): boolean {
  return !!process.env.MTA_BUS_API_KEY;
}

/**
 * Fetch bus vehicle positions
 */
export async function fetchBusPositions(): Promise<BusFeedMessage | null> {
  const url = getBusFeedUrl("vehiclePositions");
  if (!url) {
    console.warn("Bus API key not configured");
    return null;
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/x-protobuf",
      },
      next: { revalidate: 30 },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch bus positions: ${response.status}`);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    return await parseBusFeed(Buffer.from(buffer));
  } catch (error) {
    console.error("Error fetching bus positions:", error);
    return null;
  }
}

/**
 * Fetch bus trip updates (arrival predictions)
 */
export async function fetchBusTripUpdates(): Promise<BusFeedMessage | null> {
  const url = getBusFeedUrl("tripUpdates");
  if (!url) {
    console.warn("Bus API key not configured");
    return null;
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/x-protobuf",
      },
      next: { revalidate: 30 },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch bus trip updates: ${response.status}`);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    return await parseBusFeed(Buffer.from(buffer));
  } catch (error) {
    console.error("Error fetching bus trip updates:", error);
    return null;
  }
}

/**
 * Parse bus GTFS-RT feed
 */
async function parseBusFeed(buffer: Buffer): Promise<BusFeedMessage> {
  const root = await getProtoRoot();
  const FeedMessage = root.lookupType("FeedMessage");
  const message = FeedMessage.decode(new Uint8Array(buffer));
  return FeedMessage.toObject(message, {
    longs: Number,
    enums: String,
    defaults: true,
  }) as unknown as BusFeedMessage;
}

// ============================================================================
// Data Extraction
// ============================================================================

/**
 * Extract bus arrivals from trip updates and vehicle positions
 */
export async function getBusArrivals(options?: {
  routeId?: string;
  stopId?: string;
  limit?: number;
}): Promise<BusArrival[]> {
  // Fetch both feeds in parallel
  const [tripUpdates, vehiclePositions] = await Promise.all([
    fetchBusTripUpdates(),
    fetchBusPositions(),
  ]);
  
  if (!tripUpdates && !vehiclePositions) {
    return [];
  }
  
  const arrivals: BusArrival[] = [];
  const now = Date.now();
  
  // Build a map of vehicle positions for enrichment
  const vehiclePositionMap = new Map<string, BusFeedEntity["vehicle"]>();
  if (vehiclePositions) {
    for (const entity of vehiclePositions.entity) {
      if (entity.vehicle?.vehicle?.id) {
        vehiclePositionMap.set(entity.vehicle.vehicle.id, entity.vehicle);
      }
    }
  }
  
  // Process trip updates
  if (tripUpdates) {
    for (const entity of tripUpdates.entity) {
      if (!entity.tripUpdate) continue;
      
      const tripUpdate = entity.tripUpdate;
      const routeId = tripUpdate.trip.routeId ?? "";
      
      // Apply route filter
      if (options?.routeId && routeId !== options.routeId) {
        continue;
      }
      
      const vehicleId = tripUpdate.vehicle?.id ?? "";
      const vehiclePosition = vehiclePositionMap.get(vehicleId);
      
      // Process each stop time update
      for (const stopTime of tripUpdate.stopTimeUpdate) {
        // Apply stop filter
        if (options?.stopId && stopTime.stopId !== options.stopId) {
          continue;
        }
        
        const arrivalTime = stopTime.arrival?.time
          ? new Date(stopTime.arrival.time * 1000)
          : null;
        
        // Skip if already passed
        if (arrivalTime && arrivalTime.getTime() < now) {
          continue;
        }
        
        const minutesAway = arrivalTime
          ? Math.round((arrivalTime.getTime() - now) / 60000)
          : null;
        
        arrivals.push({
          vehicleId,
          tripId: tripUpdate.trip.tripId ?? "",
          routeId,
          headsign: null, // Bus feeds don't include headsign
          latitude: vehiclePosition?.position?.latitude ?? null,
          longitude: vehiclePosition?.position?.longitude ?? null,
          bearing: vehiclePosition?.position?.bearing ?? null,
          nextStopId: stopTime.stopId ?? null,
          nextStopName: null, // Would need stop lookup
          arrivalTime,
          distanceFromStop: null, // Not provided in GTFS-RT
          progressStatus: null,
          minutesAway,
        });
      }
    }
  }
  
  // Sort by arrival time
  arrivals.sort((a, b) => {
    if (!a.arrivalTime) return 1;
    if (!b.arrivalTime) return -1;
    return a.arrivalTime.getTime() - b.arrivalTime.getTime();
  });
  
  // Apply limit
  if (options?.limit) {
    return arrivals.slice(0, options.limit);
  }
  
  return arrivals;
}

/**
 * Get all bus routes from trip updates
 */
export async function getActiveBusRoutes(): Promise<string[]> {
  const tripUpdates = await fetchBusTripUpdates();
  if (!tripUpdates) return [];
  
  const routes = new Set<string>();
  for (const entity of tripUpdates.entity) {
    const routeId = entity.tripUpdate?.trip.routeId;
    if (routeId) {
      routes.add(routeId);
    }
  }
  
  return [...routes].sort();
}

