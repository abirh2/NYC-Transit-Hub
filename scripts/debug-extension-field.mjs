/**
 * Debug to properly parse the MTA extension field 1005
 */

import protobuf from "protobufjs";

const PROTO = `
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
  optional string route_id = 5;
  optional string start_time = 2;
}

message StopTimeUpdate {
  optional uint32 stop_sequence = 1;
  optional string stop_id = 4;
  optional StopTimeEvent arrival = 2;
  optional StopTimeEvent departure = 3;
  optional MnrExtension mnr_extension = 1005;
}

message MnrExtension {
  optional string track = 1;
  optional string status = 2;
}

message StopTimeEvent {
  optional int64 time = 2;
  optional int32 delay = 1;
}
`;

const MTA_API_KEY = '2d394b0e-269d-454b-b229-66d15474c2f2';
const FEED_URL = `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr`;

async function main() {
  const trainToFind = process.argv[2] || "1324";
  
  console.log(`Parsing train ${trainToFind} with extension field 1005...\n`);

  const response = await fetch(FEED_URL, {
    headers: { 'x-api-key': MTA_API_KEY },
  });

  const buffer = await response.arrayBuffer();
  const root = protobuf.parse(PROTO).root;
  const FeedMessage = root.lookupType("FeedMessage");
  const feed = FeedMessage.decode(new Uint8Array(buffer));
  const data = FeedMessage.toObject(feed, {
    longs: Number,
    enums: String,
    defaults: false,  // Don't include defaults
  });

  const entity = data.entity?.find(e => e.id === trainToFind);
  
  if (!entity) {
    console.log(`Train ${trainToFind} not found.`);
    return;
  }

  console.log(`=== Train ${trainToFind} ===`);
  console.log(`Trip ID: ${entity.tripUpdate?.trip?.tripId}`);
  console.log(`Route ID: ${entity.tripUpdate?.trip?.routeId}`);
  console.log(`Start Time: ${entity.tripUpdate?.trip?.startTime}`);
  
  console.log(`\n=== Stop Time Updates ===\n`);
  
  const now = Date.now();
  
  for (const stop of entity.tripUpdate?.stopTimeUpdate || []) {
    const arrivalTime = stop.arrival?.time ? new Date(stop.arrival.time * 1000) : null;
    const delay = stop.arrival?.delay || 0;
    const isPast = arrivalTime && arrivalTime.getTime() < now;
    const minsAway = arrivalTime ? Math.round((arrivalTime.getTime() - now) / 60000) : null;
    
    // Check the extension
    const ext = stop.mnrExtension;
    
    console.log(`Stop ${stop.stopId}:`);
    console.log(`  Arrival: ${arrivalTime?.toLocaleTimeString()} ${isPast ? '(PAST)' : minsAway !== null ? `(in ${minsAway} min)` : ''}`);
    console.log(`  Delay: ${delay}s (${Math.round(delay/60)}m)`);
    console.log(`  Extension present: ${ext ? 'YES' : 'NO'}`);
    if (ext) {
      console.log(`  Track: "${ext.track || 'N/A'}"`);
      console.log(`  Status: "${ext.status || 'N/A'}"`);
    }
    console.log('');
  }
}

main().catch(console.error);

