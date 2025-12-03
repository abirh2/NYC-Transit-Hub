/**
 * Find trains arriving at Harlem-125th (stop 4) around 12:10pm
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
  optional string stop_id = 4;
  optional StopTimeEvent arrival = 2;
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
  console.log(`Current time: ${new Date().toLocaleTimeString()}\n`);
  console.log(`Looking for ALL trains stopping at stop 4 (Harlem-125th) between 12:00-12:30...\n`);

  const response = await fetch(FEED_URL, {
    headers: { 'x-api-key': MTA_API_KEY },
  });

  const buffer = await response.arrayBuffer();
  const root = protobuf.parse(PROTO).root;
  const FeedMessage = root.lookupType("FeedMessage");
  const feed = FeedMessage.decode(new Uint8Array(buffer));
  const data = FeedMessage.toObject(feed, { longs: Number, defaults: false });

  const now = Date.now();
  const target12pm = new Date();
  target12pm.setHours(12, 0, 0, 0);
  const target1230 = new Date();
  target1230.setHours(12, 30, 0, 0);

  const results = [];

  for (const entity of data.entity || []) {
    const tu = entity.tripUpdate;
    if (!tu) continue;

    for (const stop of tu.stopTimeUpdate || []) {
      if (stop.stopId !== '4') continue;
      
      const arrivalTime = stop.arrival?.time ? new Date(stop.arrival.time * 1000) : null;
      if (!arrivalTime) continue;
      
      // Check if between 12:00 and 12:30
      if (arrivalTime >= target12pm && arrivalTime <= target1230) {
        const stops = tu.stopTimeUpdate || [];
        const lastStop = stops[stops.length - 1];
        const firstStop = stops[0];
        
        results.push({
          trainId: entity.id,
          tripId: tu.trip?.tripId,
          routeId: tu.trip?.routeId,
          harlemArrival: arrivalTime,
          minsAway: Math.round((arrivalTime.getTime() - now) / 60000),
          delay: stop.arrival?.delay || 0,
          status: stop.mnrExtension?.status || 'N/A',
          track: stop.mnrExtension?.track || 'N/A',
          firstStop: firstStop?.stopId,
          lastStop: lastStop?.stopId,
          direction: lastStop?.stopId === '1' ? 'to GCT' : 'from GCT',
        });
      }
    }
  }

  console.log(`Found ${results.length} trains:\n`);
  
  for (const r of results.sort((a, b) => a.harlemArrival - b.harlemArrival)) {
    console.log(`Train ${r.trainId} (Route ${r.routeId}, ${r.direction}):`);
    console.log(`  Harlem-125th arrival: ${r.harlemArrival.toLocaleTimeString()} (${r.minsAway > 0 ? `in ${r.minsAway} min` : `${-r.minsAway} min ago`})`);
    console.log(`  Status: ${r.status}`);
    console.log(`  Track: ${r.track}`);
    console.log(`  Delay: ${r.delay}s (${Math.round(r.delay/60)}m)`);
    console.log(`  Trip: ${r.tripId}`);
    console.log(`  First->Last stop: ${r.firstStop} -> ${r.lastStop}`);
    console.log('');
  }
}

main().catch(console.error);

