/**
 * Test script to fetch LIRR and Metro-North GTFS-RT feeds
 * Run with: node scripts/test-rail-feeds.mjs
 */

import protobuf from 'protobufjs';

const RAIL_FEEDS = {
  lirr: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/lirr%2Fgtfs-lirr',
  metroNorth: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr',
};

// Standard GTFS-RT proto schema
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
  optional Alert alert = 5;
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

message Alert {
  repeated EntitySelector informed_entity = 5;
  optional TranslatedString header_text = 10;
}

message EntitySelector {
  optional string route_id = 2;
  optional string stop_id = 5;
}

message TranslatedString {
  repeated Translation translation = 1;
  message Translation {
    required string text = 1;
  }
}
`;

let protoRoot = null;

async function getProtoRoot() {
  if (protoRoot) return protoRoot;
  protoRoot = protobuf.parse(GTFS_RT_PROTO).root;
  return protoRoot;
}

async function fetchAndParseFeed(name, url) {
  console.log(`\n=== Fetching ${name} feed ===\n`);
  
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/x-protobuf' }
    });
    
    if (!response.ok) {
      console.log(`Failed: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    console.log(`Buffer size: ${buffer.byteLength} bytes`);
    
    const root = await getProtoRoot();
    const FeedMessage = root.lookupType('FeedMessage');
    const message = FeedMessage.decode(new Uint8Array(buffer));
    const data = FeedMessage.toObject(message, {
      longs: Number,
      enums: String,
      defaults: true,
    });
    
    console.log(`Timestamp: ${new Date(data.header.timestamp * 1000).toISOString()}`);
    console.log(`Total entities: ${data.entity.length}`);
    
    // Count entity types
    let tripUpdates = 0;
    let vehiclePositions = 0;
    let alerts = 0;
    
    for (const entity of data.entity) {
      if (entity.tripUpdate) tripUpdates++;
      if (entity.vehicle) vehiclePositions++;
      if (entity.alert) alerts++;
    }
    
    console.log(`Trip updates: ${tripUpdates}`);
    console.log(`Vehicle positions: ${vehiclePositions}`);
    console.log(`Alerts: ${alerts}`);
    
    // Extract unique route IDs
    const routes = new Set();
    for (const entity of data.entity) {
      if (entity.tripUpdate?.trip?.routeId) {
        routes.add(entity.tripUpdate.trip.routeId);
      }
      if (entity.vehicle?.trip?.routeId) {
        routes.add(entity.vehicle.trip.routeId);
      }
    }
    
    const sortedRoutes = Array.from(routes).sort();
    console.log(`\nUnique routes (${sortedRoutes.length}):`, sortedRoutes.join(', '));
    
    // Show sample trip update
    const sampleTrip = data.entity.find(e => e.tripUpdate);
    if (sampleTrip) {
      console.log('\n--- Sample Trip Update ---');
      const tu = sampleTrip.tripUpdate;
      console.log({
        tripId: tu.trip?.tripId,
        routeId: tu.trip?.routeId,
        directionId: tu.trip?.directionId,
        startTime: tu.trip?.startTime,
        startDate: tu.trip?.startDate,
        stopCount: tu.stopTimeUpdate?.length,
      });
      
      // Show first few stops
      if (tu.stopTimeUpdate?.length > 0) {
        console.log('\nFirst 3 stops:');
        for (const stop of tu.stopTimeUpdate.slice(0, 3)) {
          console.log({
            stopId: stop.stopId,
            stopSequence: stop.stopSequence,
            arrivalTime: stop.arrival?.time ? new Date(stop.arrival.time * 1000).toISOString() : null,
            departureTime: stop.departure?.time ? new Date(stop.departure.time * 1000).toISOString() : null,
          });
        }
      }
    }
    
    return data;
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('=== MTA Rail GTFS-RT Feed Test ===');
  
  await fetchAndParseFeed('LIRR', RAIL_FEEDS.lirr);
  await fetchAndParseFeed('Metro-North', RAIL_FEEDS.metroNorth);
  
  console.log('\n=== Test Complete ===');
}

main().catch(console.error);

