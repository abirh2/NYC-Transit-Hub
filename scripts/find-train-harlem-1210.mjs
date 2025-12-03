/**
 * Find the EXACT train arriving at Harlem-125th around 12:10pm
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

const STATIONS = {
  '1': 'Grand Central',
  '4': 'Harlem-125th',
  '56': 'Fordham',
  '105': 'Mt Vernon East',
  '106': 'Pelham',
  '108': 'New Rochelle',
  '110': 'Larchmont',
  '111': 'Mamaroneck',
  '112': 'Stamford',
  '114': 'Noroton Heights',
  '115': 'Darien',
  '116': 'Rowayton',
  '118': 'South Norwalk',
  '120': 'East Norwalk',
  '121': 'Westport',
  '124': 'New Haven',
};

async function main() {
  const timeOpts = { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' };
  const nowNYC = new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  console.log(`Current time (NYC): ${nowNYC}\n`);
  console.log(`Finding ALL trains arriving at Harlem-125th (stop 4) between 12:05 and 12:15 PM...\n`);

  const response = await fetch(FEED_URL, {
    headers: { 'x-api-key': MTA_API_KEY },
  });

  const buffer = await response.arrayBuffer();
  const root = protobuf.parse(PROTO).root;
  const FeedMessage = root.lookupType("FeedMessage");
  const feed = FeedMessage.decode(new Uint8Array(buffer));
  const data = FeedMessage.toObject(feed, { longs: Number, defaults: false });

  const now = Date.now();

  for (const entity of data.entity || []) {
    const tu = entity.tripUpdate;
    if (!tu) continue;
    
    const harlemStop = (tu.stopTimeUpdate || []).find(s => s.stopId === '4');
    if (!harlemStop) continue;
    
    const harlemTime = harlemStop.arrival?.time ? new Date(harlemStop.arrival.time * 1000) : null;
    if (!harlemTime) continue;
    
    const harlemHour = harlemTime.getHours();
    const harlemMin = harlemTime.getMinutes();
    
    // Between 12:05 and 12:15
    if (harlemHour !== 12 || harlemMin < 5 || harlemMin > 15) continue;
    
    const stops = tu.stopTimeUpdate || [];
    const lastStop = stops[stops.length - 1];
    const firstStop = stops[0];
    const isInbound = lastStop?.stopId === '1';
    
    console.log(`=== Train ${entity.id} (Route ${tu.trip?.routeId}) ===`);
    console.log(`Direction: ${isInbound ? 'TO Grand Central' : 'FROM Grand Central'}`);
    console.log(`Start time: ${tu.trip?.startTime}`);
    console.log(`\nStops:`);
    
    for (const stop of stops) {
      const arrTime = stop.arrival?.time ? new Date(stop.arrival.time * 1000) : null;
      const mins = arrTime ? Math.round((arrTime.getTime() - now) / 60000) : null;
      const stationName = STATIONS[stop.stopId] || `Stop ${stop.stopId}`;
      const isPast = arrTime && arrTime.getTime() < now;
      const status = stop.mnrExtension?.status || '';
      
      let timeStr = arrTime?.toLocaleTimeString('en-US', timeOpts) || 'N/A';
      let marker = stop.stopId === '4' ? ' *** HARLEM ***' : '';
      let statusStr = status || (isPast ? 'PAST' : mins !== null ? `in ${mins} min` : '');
      
      console.log(`  ${stop.stopId.padStart(3)} ${stationName.padEnd(20)} ${timeStr.padStart(10)} (${statusStr})${marker}`);
    }
    console.log('');
  }
}

main().catch(console.error);

