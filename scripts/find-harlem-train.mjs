/**
 * Find trains stopping at Harlem-125th St around 12:10pm
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
  console.log(`Searching for trains stopping at Harlem-125th St...\n`);
  console.log(`Current time: ${new Date().toLocaleTimeString()}\n`);

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
    defaults: false,
  });

  const now = Date.now();
  
  // Find all unique stop IDs to understand the data
  const allStopIds = new Set();
  for (const entity of data.entity || []) {
    for (const stop of entity.tripUpdate?.stopTimeUpdate || []) {
      allStopIds.add(stop.stopId);
    }
  }
  
  console.log(`All unique stop IDs in feed: ${Array.from(allStopIds).sort((a,b) => parseInt(a) - parseInt(b)).join(', ')}\n`);
  
  // Harlem-125th St should be stop 2 or 4 - let's check both
  const harlemCandidates = ['2', '4'];
  
  console.log(`\n=== Looking for trains with stops 2 or 4 (potential Harlem) ===\n`);
  
  for (const entity of data.entity || []) {
    const tu = entity.tripUpdate;
    if (!tu) continue;
    
    // Check if this is New Haven line (route 3) going TO Grand Central
    const routeId = tu.trip?.routeId;
    const stops = tu.stopTimeUpdate || [];
    
    // Check if Grand Central (1) is the LAST stop (inbound)
    const lastStop = stops[stops.length - 1];
    const isInbound = lastStop?.stopId === '1';
    
    if (!isInbound) continue;
    
    // Find any stop at 2 or 4 with arrival around 12:00-12:20
    for (const stop of stops) {
      if (!harlemCandidates.includes(stop.stopId)) continue;
      
      const arrivalTime = stop.arrival?.time ? new Date(stop.arrival.time * 1000) : null;
      if (!arrivalTime) continue;
      
      const minsAway = Math.round((arrivalTime.getTime() - now) / 60000);
      
      // Only show if arriving in next 30 mins
      if (minsAway > -5 && minsAway < 30) {
        console.log(`Train ${entity.id} (Route ${routeId}):`);
        console.log(`  Trip ID: ${tu.trip?.tripId}`);
        console.log(`  Stop ${stop.stopId} arrival: ${arrivalTime.toLocaleTimeString()} (${minsAway > 0 ? `in ${minsAway} min` : `${-minsAway} min ago`})`);
        console.log(`  Track: ${stop.mnrExtension?.track || 'N/A'}`);
        console.log(`  Status: ${stop.mnrExtension?.status || 'N/A'}`);
        console.log(`  Delay: ${stop.arrival?.delay || 0}s`);
        
        // Also show the full stop list for this train
        console.log(`  All stops:`);
        for (const s of stops) {
          const sTime = s.arrival?.time ? new Date(s.arrival.time * 1000) : null;
          const sMins = sTime ? Math.round((sTime.getTime() - now) / 60000) : null;
          const isPast = sTime && sTime.getTime() < now;
          console.log(`    Stop ${s.stopId}: ${sTime?.toLocaleTimeString() || 'N/A'} ${isPast ? '(PAST)' : sMins !== null ? `(in ${sMins} min)` : ''}`);
        }
        console.log('');
      }
    }
  }
}

main().catch(console.error);

