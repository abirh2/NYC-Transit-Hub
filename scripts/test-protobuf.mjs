/**
 * Test protobuf parsing of GTFS-RT feed
 * Run with: node scripts/test-protobuf.mjs
 */

import fs from 'fs';
import protobuf from 'protobufjs';

// GTFS-RT proto definition
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
}

message TripDescriptor {
  optional string trip_id = 1;
  optional string route_id = 5;
  optional uint32 direction_id = 6;
  optional string start_time = 2;
  optional string start_date = 3;
  
  // MTA NYCT extension - field number 1001
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
}

message StopTimeUpdate {
  optional uint32 stop_sequence = 1;
  optional string stop_id = 4;
  optional StopTimeEvent arrival = 2;
  optional StopTimeEvent departure = 3;
  
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
  optional uint64 timestamp = 5;
}

message Position {
  required float latitude = 1;
  required float longitude = 2;
  optional float bearing = 3;
}

message Alert {
  repeated TimeRange active_period = 1;
  repeated EntitySelector informed_entity = 5;
  optional TranslatedString header_text = 10;
  optional TranslatedString description_text = 11;
}

message TimeRange {
  optional uint64 start = 1;
  optional uint64 end = 2;
}

message EntitySelector {
  optional string agency_id = 1;
  optional string route_id = 2;
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

async function main() {
  console.log('='.repeat(80));
  console.log('GTFS-RT PROTOBUF PARSING TEST');
  console.log('='.repeat(80));

  // Read the saved binary file
  const buffer = fs.readFileSync('scripts/sample-gtfs-ace.bin');
  console.log(`\nLoaded ${buffer.length} bytes from sample-gtfs-ace.bin`);

  // Parse the proto definition
  const root = protobuf.parse(GTFS_RT_PROTO).root;
  const FeedMessage = root.lookupType('FeedMessage');

  // Decode the feed
  try {
    const message = FeedMessage.decode(new Uint8Array(buffer));
    const feed = FeedMessage.toObject(message, {
      longs: Number,
      enums: String,
      defaults: true,
    });

    console.log('\n--- FEED HEADER ---');
    console.log(JSON.stringify(feed.header, null, 2));

    console.log(`\n--- ENTITIES (${feed.entity.length} total) ---`);
    
    // Show first few entities
    let tripUpdateCount = 0;
    let vehicleCount = 0;
    
    for (const entity of feed.entity) {
      if (entity.tripUpdate) tripUpdateCount++;
      if (entity.vehicle) vehicleCount++;
    }
    
    console.log(`Trip updates: ${tripUpdateCount}`);
    console.log(`Vehicle positions: ${vehicleCount}`);

    // Show a sample trip update
    const sampleTripUpdate = feed.entity.find(e => e.tripUpdate);
    if (sampleTripUpdate) {
      console.log('\n--- SAMPLE TRIP UPDATE ---');
      console.log(JSON.stringify(sampleTripUpdate, null, 2));
    }

    // Show a sample vehicle position
    const sampleVehicle = feed.entity.find(e => e.vehicle);
    if (sampleVehicle) {
      console.log('\n--- SAMPLE VEHICLE POSITION ---');
      console.log(JSON.stringify(sampleVehicle, null, 2));
    }

    // Save full decoded feed
    fs.writeFileSync('scripts/sample-gtfs-ace-decoded.json', JSON.stringify(feed, null, 2));
    console.log('\nFull decoded feed saved to: scripts/sample-gtfs-ace-decoded.json');

  } catch (e) {
    console.error('Failed to decode:', e.message);
    console.log('\nThis might mean our proto definition is incomplete.');
    console.log('Check if MTA uses non-standard extensions.');
  }
}

main().catch(console.error);

