/**
 * ALL inbound trains stopping at Harlem-125th in the next hour
 */

import protobuf from "protobufjs";

const PROTO = `
syntax = "proto2";
message FeedMessage { required FeedHeader header = 1; repeated FeedEntity entity = 2; }
message FeedHeader { required string gtfs_realtime_version = 1; }
message FeedEntity { required string id = 1; optional TripUpdate trip_update = 3; }
message TripUpdate { optional TripDescriptor trip = 1; repeated StopTimeUpdate stop_time_update = 2; }
message TripDescriptor { optional string trip_id = 1; optional string route_id = 5; }
message StopTimeUpdate { optional string stop_id = 4; optional StopTimeEvent arrival = 2; optional MnrExtension mnr_extension = 1005; }
message MnrExtension { optional string track = 1; optional string status = 2; }
message StopTimeEvent { optional int64 time = 2; optional int32 delay = 1; }
`;

const ROUTES = { '1': 'Hudson', '2': 'Harlem', '3': 'New Haven', '4': 'New Canaan', '5': 'Danbury', '6': 'Waterbury' };

const MTA_API_KEY = '2d394b0e-269d-454b-b229-66d15474c2f2';
const FEED_URL = `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr`;

async function main() {
  const timeOpts = { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' };
  const now = new Date();
  console.log(`Current time (NYC): ${now.toLocaleTimeString('en-US', { timeZone: 'America/New_York' })}\n`);
  console.log(`ALL INBOUND trains (TO Grand Central) stopping at Harlem-125th in next 60 mins:\n`);

  const response = await fetch(FEED_URL, { headers: { 'x-api-key': MTA_API_KEY } });
  const buffer = await response.arrayBuffer();
  const root = protobuf.parse(PROTO).root;
  const FeedMessage = root.lookupType("FeedMessage");
  const feed = FeedMessage.decode(new Uint8Array(buffer));
  const data = FeedMessage.toObject(feed, { longs: Number, defaults: false });

  const nowMs = Date.now();
  const results = [];

  for (const entity of data.entity || []) {
    const tu = entity.tripUpdate;
    if (!tu) continue;
    
    const stops = tu.stopTimeUpdate || [];
    const lastStop = stops[stops.length - 1];
    
    // INBOUND = last stop is Grand Central (stop 1)
    if (lastStop?.stopId !== '1') continue;
    
    const harlemStop = stops.find(s => s.stopId === '4');
    if (!harlemStop?.arrival?.time) continue;
    
    const harlemTime = new Date(harlemStop.arrival.time * 1000);
    const mins = Math.round((harlemTime.getTime() - nowMs) / 60000);
    
    if (mins < -10 || mins > 60) continue;
    
    // Also get GCT arrival
    const gctStop = stops.find(s => s.stopId === '1');
    const gctTime = gctStop?.arrival?.time ? new Date(gctStop.arrival.time * 1000) : null;
    
    results.push({
      trainId: entity.id,
      routeId: tu.trip?.routeId,
      harlemTime,
      harlemMins: mins,
      gctTime,
      delay: harlemStop.arrival?.delay || 0,
      status: harlemStop.mnrExtension?.status,
    });
  }

  results.sort((a, b) => a.harlemTime - b.harlemTime);

  if (results.length === 0) {
    console.log(`  NO inbound trains stopping at Harlem-125th found in the next 60 mins!`);
  } else {
    for (const r of results) {
      const harlemStr = r.harlemTime.toLocaleTimeString('en-US', timeOpts);
      const gctStr = r.gctTime?.toLocaleTimeString('en-US', timeOpts) || 'N/A';
      const minsStr = r.harlemMins > 0 ? `in ${r.harlemMins} min` : `${-r.harlemMins} min ago`;
      const delayStr = r.delay > 0 ? ` (${Math.round(r.delay/60)}m late)` : '';
      const statusStr = r.status ? ` [${r.status}]` : '';
      
      console.log(`Train ${r.trainId.padEnd(6)} ${(ROUTES[r.routeId] || '?').padEnd(10)} Harlem: ${harlemStr.padStart(10)} (${minsStr})${delayStr}${statusStr} -> GCT: ${gctStr}`);
    }
  }
}

main().catch(console.error);

