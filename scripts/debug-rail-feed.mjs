/**
 * Debug script to examine actual LIRR and Metro-North GTFS-RT feed data
 * Run with: node scripts/debug-rail-feed.mjs
 */

import protobuf from "protobufjs";

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

const MTA_API_KEY = process.env.MTA_API_KEY || '2d394b0e-269d-454b-b229-66d15474c2f2';

const FEED_URLS = {
  lirr: `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/lirr%2Fgtfs-lirr`,
  metroNorth: `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr`,
};

async function fetchAndParseFeed(name, url) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Fetching ${name} feed...`);
  console.log(`URL: ${url}`);
  console.log('='.repeat(60));

  try {
    const response = await fetch(url, {
      headers: { 'x-api-key': MTA_API_KEY },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const root = protobuf.parse(GTFS_RT_PROTO).root;
    const FeedMessage = root.lookupType("FeedMessage");
    const feed = FeedMessage.decode(new Uint8Array(buffer));
    const data = FeedMessage.toObject(feed, {
      longs: Number,
      enums: String,
      defaults: true,
    });

    console.log(`\nTotal entities: ${data.entity.length}`);
    
    // Examine first 5 trip updates in detail
    let tripUpdates = data.entity.filter(e => e.tripUpdate).slice(0, 10);
    
    console.log(`\n--- Sample Trip Updates (first 10) ---\n`);
    
    for (const entity of tripUpdates) {
      const tu = entity.tripUpdate;
      console.log(`Entity ID: ${entity.id}`);
      console.log(`  Trip ID: ${tu.trip?.tripId || 'N/A'}`);
      console.log(`  Route ID: ${tu.trip?.routeId || 'N/A'}`);
      console.log(`  Direction ID: ${tu.trip?.directionId ?? 'N/A'}`);
      console.log(`  Start Time: ${tu.trip?.startTime || 'N/A'}`);
      console.log(`  Start Date: ${tu.trip?.startDate || 'N/A'}`);
      console.log(`  Vehicle ID: ${tu.vehicle?.id || 'N/A'}`);
      console.log(`  Vehicle Label: ${tu.vehicle?.label || 'N/A'}`);
      console.log(`  Stop Updates: ${tu.stopTimeUpdate?.length || 0}`);
      
      if (tu.stopTimeUpdate?.length > 0) {
        const firstStop = tu.stopTimeUpdate[0];
        const lastStop = tu.stopTimeUpdate[tu.stopTimeUpdate.length - 1];
        console.log(`  First Stop: ${firstStop.stopId} (seq: ${firstStop.stopSequence})`);
        console.log(`  Last Stop: ${lastStop.stopId} (seq: ${lastStop.stopSequence})`);
      }
      console.log('');
    }

    // Look for any patterns in trip IDs
    const allTripIds = data.entity
      .filter(e => e.tripUpdate?.trip?.tripId)
      .map(e => e.tripUpdate.trip.tripId);
    
    console.log(`\n--- Trip ID Patterns (sample of 20) ---\n`);
    const sampleIds = allTripIds.slice(0, 20);
    for (const id of sampleIds) {
      console.log(`  ${id}`);
    }

    // Look for vehicle labels
    const vehicleLabels = data.entity
      .filter(e => e.tripUpdate?.vehicle?.label)
      .map(e => ({
        label: e.tripUpdate.vehicle.label,
        tripId: e.tripUpdate.trip?.tripId,
      }));
    
    console.log(`\n--- Vehicle Labels (${vehicleLabels.length} found) ---\n`);
    for (const v of vehicleLabels.slice(0, 10)) {
      console.log(`  Label: "${v.label}" -> Trip: ${v.tripId}`);
    }

    // Look for vehicle IDs
    const vehicleIds = data.entity
      .filter(e => e.tripUpdate?.vehicle?.id)
      .map(e => ({
        id: e.tripUpdate.vehicle.id,
        tripId: e.tripUpdate.trip?.tripId,
      }));
    
    console.log(`\n--- Vehicle IDs (${vehicleIds.length} found) ---\n`);
    for (const v of vehicleIds.slice(0, 10)) {
      console.log(`  ID: "${v.id}" -> Trip: ${v.tripId}`);
    }

    // Look for entity IDs
    console.log(`\n--- Entity IDs (sample of 20) ---\n`);
    const entityIds = data.entity.slice(0, 20).map(e => e.id);
    for (const id of entityIds) {
      console.log(`  ${id}`);
    }

  } catch (error) {
    console.error(`Error fetching ${name}:`, error.message);
  }
}

async function main() {
  console.log('MTA Rail Feed Debug Script');
  console.log('Looking for train number patterns...\n');

  await fetchAndParseFeed('Metro-North', FEED_URLS.metroNorth);
  await fetchAndParseFeed('LIRR', FEED_URLS.lirr);
}

main();

