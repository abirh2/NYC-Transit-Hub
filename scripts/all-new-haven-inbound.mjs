/**
 * List ALL inbound New Haven line trains with all their stops
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

// Station name lookup
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
  console.log(`=== ALL New Haven Line (Route 3) INBOUND trains ===\n`);

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
    
    // Only Route 3 (New Haven)
    if (tu.trip?.routeId !== '3') continue;
    
    const stops = tu.stopTimeUpdate || [];
    const lastStop = stops[stops.length - 1];
    
    // INBOUND = last stop is Grand Central (stop 1)
    if (lastStop?.stopId !== '1') continue;
    
    // Get GCT arrival time
    const gctStop = stops.find(s => s.stopId === '1');
    const gctTime = gctStop?.arrival?.time ? new Date(gctStop.arrival.time * 1000) : null;
    const gctMins = gctTime ? Math.round((gctTime.getTime() - now) / 60000) : null;
    
    // Only show trains arriving in next 60 mins
    if (!gctMins || gctMins < -10 || gctMins > 60) continue;
    
    console.log(`Train ${entity.id} -> GCT at ${gctTime?.toLocaleTimeString('en-US', timeOpts)} (${gctMins > 0 ? `in ${gctMins} min` : `${-gctMins} min ago`})`);
    console.log(`  Stops:`);
    
    for (const stop of stops) {
      const arrTime = stop.arrival?.time ? new Date(stop.arrival.time * 1000) : null;
      const mins = arrTime ? Math.round((arrTime.getTime() - now) / 60000) : null;
      const stationName = STATIONS[stop.stopId] || `Stop ${stop.stopId}`;
      const status = stop.mnrExtension?.status;
      const isPast = arrTime && arrTime.getTime() < now;
      
      let timeStr = arrTime?.toLocaleTimeString('en-US', timeOpts) || 'N/A';
      let statusStr = isPast ? 'PAST' : mins !== null ? `in ${mins} min` : '';
      if (status) statusStr = status;
      
      console.log(`    ${stop.stopId.padStart(3)} ${stationName.padEnd(20)} ${timeStr.padStart(10)} (${statusStr})`);
    }
    console.log('');
  }
}

main().catch(console.error);

