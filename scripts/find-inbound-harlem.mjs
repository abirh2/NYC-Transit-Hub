/**
 * Find INBOUND trains (to Grand Central) arriving at Harlem around 12:10pm
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
  // Force EST/NYC timezone for display
  const options = { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit' };
  const nowNYC = new Date().toLocaleTimeString('en-US', options);
  
  console.log(`Current time (NYC): ${nowNYC}\n`);
  console.log(`Looking for INBOUND trains (TO Grand Central) stopping at Harlem-125th...\n`);

  const response = await fetch(FEED_URL, {
    headers: { 'x-api-key': MTA_API_KEY },
  });

  const buffer = await response.arrayBuffer();
  const root = protobuf.parse(PROTO).root;
  const FeedMessage = root.lookupType("FeedMessage");
  const feed = FeedMessage.decode(new Uint8Array(buffer));
  const data = FeedMessage.toObject(feed, { longs: Number, defaults: false });

  const now = Date.now();
  const results = [];

  for (const entity of data.entity || []) {
    const tu = entity.tripUpdate;
    if (!tu) continue;
    
    const stops = tu.stopTimeUpdate || [];
    const lastStop = stops[stops.length - 1];
    
    // INBOUND = last stop is Grand Central (stop 1)
    if (lastStop?.stopId !== '1') continue;
    
    // Find Harlem-125th stop (stop 4)
    const harlemStop = stops.find(s => s.stopId === '4');
    if (!harlemStop) continue;
    
    const harlemTime = harlemStop.arrival?.time ? new Date(harlemStop.arrival.time * 1000) : null;
    if (!harlemTime) continue;
    
    const minsAway = Math.round((harlemTime.getTime() - now) / 60000);
    
    // Only show trains arriving at Harlem in next 30 mins
    if (minsAway > -10 && minsAway < 30) {
      // Get Grand Central arrival too
      const gctStop = stops.find(s => s.stopId === '1');
      const gctTime = gctStop?.arrival?.time ? new Date(gctStop.arrival.time * 1000) : null;
      
      results.push({
        trainId: entity.id,
        tripId: tu.trip?.tripId,
        routeId: tu.trip?.routeId,
        harlemArrival: harlemTime,
        harlemMinsAway: minsAway,
        gctArrival: gctTime,
        gctMinsAway: gctTime ? Math.round((gctTime.getTime() - now) / 60000) : null,
        harlemDelay: harlemStop.arrival?.delay || 0,
        harlemStatus: harlemStop.mnrExtension?.status || 'N/A',
        harlemTrack: harlemStop.mnrExtension?.track || 'N/A',
      });
    }
  }

  const timeOpts = { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' };
  
  console.log(`Found ${results.length} INBOUND trains:\n`);
  
  for (const r of results.sort((a, b) => a.harlemArrival - b.harlemArrival)) {
    const harlemTimeStr = r.harlemArrival.toLocaleTimeString('en-US', timeOpts);
    const gctTimeStr = r.gctArrival?.toLocaleTimeString('en-US', timeOpts);
    
    console.log(`Train ${r.trainId} (Route ${r.routeId}, TO Grand Central):`);
    console.log(`  Harlem-125th arrival: ${harlemTimeStr} (${r.harlemMinsAway > 0 ? `in ${r.harlemMinsAway} min` : `${-r.harlemMinsAway} min ago`})`);
    console.log(`  Grand Central arrival: ${gctTimeStr} (${r.gctMinsAway > 0 ? `in ${r.gctMinsAway} min` : `${-r.gctMinsAway} min ago`})`);
    console.log(`  Harlem Status: ${r.harlemStatus}`);
    console.log(`  Harlem Track: ${r.harlemTrack}`);
    console.log(`  Harlem Delay: ${r.harlemDelay}s (${Math.round(r.harlemDelay/60)}m)`);
    console.log('');
  }
}

main().catch(console.error);

