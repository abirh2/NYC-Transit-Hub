/**
 * Find all unique stop IDs used in New Haven line and map them to arrival times
 * to identify which stop ID is actually Harlem-125th
 */

import protobuf from "protobufjs";

const PROTO = `
syntax = "proto2";
message FeedMessage { required FeedHeader header = 1; repeated FeedEntity entity = 2; }
message FeedHeader { required string gtfs_realtime_version = 1; }
message FeedEntity { required string id = 1; optional TripUpdate trip_update = 3; }
message TripUpdate { optional TripDescriptor trip = 1; repeated StopTimeUpdate stop_time_update = 2; }
message TripDescriptor { optional string trip_id = 1; optional string route_id = 5; optional string start_time = 2; }
message StopTimeUpdate { optional string stop_id = 4; optional StopTimeEvent arrival = 2; }
message StopTimeEvent { optional int64 time = 2; }
`;

const MTA_API_KEY = '2d394b0e-269d-454b-b229-66d15474c2f2';
const FEED_URL = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr';

async function main() {
  const timeOpts = { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' };
  const now = Date.now();
  
  const response = await fetch(FEED_URL, { headers: { 'x-api-key': MTA_API_KEY } });
  const buffer = await response.arrayBuffer();
  const root = protobuf.parse(PROTO).root;
  const FeedMessage = root.lookupType("FeedMessage");
  const feed = FeedMessage.decode(new Uint8Array(buffer));
  const data = FeedMessage.toObject(feed, { longs: Number, defaults: false });

  // Collect all unique stop IDs with their arrival times
  const stopData = new Map();
  
  for (const entity of data.entity || []) {
    const tu = entity.tripUpdate;
    if (!tu || !tu.trip || tu.trip.routeId !== '3') continue;
    
    for (const stop of tu.stopTimeUpdate || []) {
      const stopId = stop.stopId;
      const arrTime = stop.arrival && stop.arrival.time ? stop.arrival.time * 1000 : null;
      
      if (!stopData.has(stopId)) {
        stopData.set(stopId, { count: 0, minTime: Infinity, maxTime: -Infinity });
      }
      
      const sd = stopData.get(stopId);
      sd.count++;
      if (arrTime) {
        if (arrTime < sd.minTime) sd.minTime = arrTime;
        if (arrTime > sd.maxTime) sd.maxTime = arrTime;
      }
    }
  }
  
  // Sort by stop ID numerically
  const sorted = [...stopData.entries()].sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  
  console.log('=== ALL STOP IDs IN NEW HAVEN LINE FEED ===\n');
  console.log('Stop ID | Count | Earliest Arrival | Latest Arrival');
  console.log('--------|-------|------------------|---------------');
  
  for (const [stopId, data] of sorted) {
    const minStr = data.minTime < Infinity ? new Date(data.minTime).toLocaleTimeString('en-US', timeOpts) : 'N/A';
    const maxStr = data.maxTime > -Infinity ? new Date(data.maxTime).toLocaleTimeString('en-US', timeOpts) : 'N/A';
    console.log(stopId.padStart(7) + ' | ' + String(data.count).padStart(5) + ' | ' + minStr.padStart(16) + ' | ' + maxStr);
  }
  
  // Now specifically look at stop 4
  console.log('\n=== CHECKING STOP 4 SPECIFICALLY ===');
  
  let stop4Count = 0;
  for (const entity of data.entity || []) {
    const tu = entity.tripUpdate;
    if (!tu) continue;
    
    const has4 = (tu.stopTimeUpdate || []).some(s => s.stopId === '4');
    if (has4) {
      stop4Count++;
      const stop4 = (tu.stopTimeUpdate || []).find(s => s.stopId === '4');
      const time = stop4.arrival && stop4.arrival.time ? new Date(stop4.arrival.time * 1000) : null;
      console.log('Train ' + entity.id + ' Route ' + tu.trip.routeId + ': Stop 4 at ' + (time ? time.toLocaleTimeString('en-US', timeOpts) : 'N/A'));
    }
  }
  
  console.log('\nTotal trains with Stop 4: ' + stop4Count);
}

main().catch(console.error);

