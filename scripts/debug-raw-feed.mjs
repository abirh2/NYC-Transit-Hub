/**
 * Debug script to dump raw protobuf data and see ALL fields
 */

import protobuf from "protobufjs";

// Minimal schema - just to decode the structure
const MINIMAL_PROTO = `
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
}

message TripUpdate {
  optional TripDescriptor trip = 1;
  repeated StopTimeUpdate stop_time_update = 2;
}

message TripDescriptor {
  optional string trip_id = 1;
}

message StopTimeUpdate {
  optional string stop_id = 4;
  optional StopTimeEvent arrival = 2;
  optional StopTimeEvent departure = 3;
}

message StopTimeEvent {
  optional int64 time = 2;
}
`;

const MTA_API_KEY = '2d394b0e-269d-454b-b229-66d15474c2f2';
const FEED_URL = `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr`;

async function main() {
  const trainToFind = process.argv[2] || "1553";
  
  console.log(`Dumping raw data for train ${trainToFind}...\n`);

  const response = await fetch(FEED_URL, {
    headers: { 'x-api-key': MTA_API_KEY },
  });

  const buffer = await response.arrayBuffer();
  const root = protobuf.parse(MINIMAL_PROTO).root;
  const FeedMessage = root.lookupType("FeedMessage");
  
  // Decode with unknown fields preserved
  const feed = FeedMessage.decode(new Uint8Array(buffer));
  
  // Find the train and dump ALL fields including unknown ones
  const data = feed.toJSON();
  
  const entity = data.entity?.find(e => e.id === trainToFind);
  
  if (!entity) {
    console.log(`Train ${trainToFind} not found.`);
    console.log(`Available (first 20):`, data.entity?.slice(0, 20).map(e => e.id));
    return;
  }
  
  console.log(`=== Raw Entity Data for Train ${trainToFind} ===\n`);
  console.log(JSON.stringify(entity, null, 2));
  
  // Also decode with preserveUnknown to see extension fields
  console.log(`\n=== Checking for unknown/extension fields ===\n`);
  
  // Get raw bytes for this entity and decode manually
  const entityObj = feed.entity.find(e => e.id === trainToFind);
  if (entityObj && entityObj.$type) {
    console.log(`Entity type: ${entityObj.$type.name}`);
    console.log(`Fields in message:`, Object.keys(entityObj));
    
    if (entityObj.tripUpdate) {
      console.log(`TripUpdate fields:`, Object.keys(entityObj.tripUpdate));
      
      if (entityObj.tripUpdate.stopTimeUpdate && entityObj.tripUpdate.stopTimeUpdate.length > 0) {
        const firstStop = entityObj.tripUpdate.stopTimeUpdate[0];
        console.log(`\nFirst StopTimeUpdate fields:`, Object.keys(firstStop));
        console.log(`First StopTimeUpdate raw:`, JSON.stringify(firstStop.toJSON(), null, 2));
        
        if (firstStop.arrival) {
          console.log(`\nArrival fields:`, Object.keys(firstStop.arrival));
          console.log(`Arrival raw:`, JSON.stringify(firstStop.arrival.toJSON(), null, 2));
        }
      }
    }
  }
}

main().catch(console.error);

