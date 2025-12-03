/**
 * Show ALL trains stopping at Harlem-125th (stop 4) in next 30 mins
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
  const nowNYC = new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  console.log(`Current time (NYC): ${nowNYC}\n`);
  console.log(`ALL trains stopping at Harlem-125th (stop 4) in next 30 mins:\n`);

  const response = await fetch(FEED_URL, { headers: { 'x-api-key': MTA_API_KEY } });
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
    
    const harlemStop = (tu.stopTimeUpdate || []).find(s => s.stopId === '4');
    if (!harlemStop) continue;
    
    const harlemTime = harlemStop.arrival?.time ? new Date(harlemStop.arrival.time * 1000) : null;
    if (!harlemTime) continue;
    
    const mins = Math.round((harlemTime.getTime() - now) / 60000);
    if (mins < -5 || mins > 30) continue;
    
    const stops = tu.stopTimeUpdate || [];
    const lastStop = stops[stops.length - 1];
    const isInbound = lastStop?.stopId === '1';
    
    results.push({
      trainId: entity.id,
      routeId: tu.trip?.routeId,
      harlemTime,
      mins,
      isInbound,
      delay: harlemStop.arrival?.delay || 0,
      status: harlemStop.mnrExtension?.status,
      track: harlemStop.mnrExtension?.track,
    });
  }

  results.sort((a, b) => a.harlemTime - b.harlemTime);

  for (const r of results) {
    const direction = r.isInbound ? 'TO GCT' : 'FROM GCT';
    const timeStr = r.harlemTime.toLocaleTimeString('en-US', timeOpts);
    const minsStr = r.mins > 0 ? `in ${r.mins} min` : `${-r.mins} min ago`;
    const delayStr = r.delay > 0 ? `, ${Math.round(r.delay/60)}m late` : '';
    const statusStr = r.status ? `, STATUS: ${r.status}` : '';
    
    console.log(`Train ${r.trainId.padEnd(6)} ${ROUTES[r.routeId]?.padEnd(10) || 'Unknown'} ${direction.padEnd(10)} ${timeStr.padStart(10)} (${minsStr}${delayStr}${statusStr})`);
  }
}

main().catch(console.error);

