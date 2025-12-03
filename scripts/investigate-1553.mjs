/**
 * Deep investigation of Train 1553
 * Ground Truth: Departs New Haven 10:21 AM, arrives Harlem-125th ~12:10 PM
 */

import protobuf from "protobufjs";

const PROTO = `
syntax = "proto2";
message FeedMessage { required FeedHeader header = 1; repeated FeedEntity entity = 2; }
message FeedHeader { required string gtfs_realtime_version = 1; optional uint64 timestamp = 3; }
message FeedEntity { required string id = 1; optional TripUpdate trip_update = 3; }
message TripUpdate { optional TripDescriptor trip = 1; repeated StopTimeUpdate stop_time_update = 2; }
message TripDescriptor { optional string trip_id = 1; optional string route_id = 5; optional string start_time = 2; optional string start_date = 3; }
message StopTimeUpdate { optional string stop_id = 4; optional StopTimeEvent arrival = 2; optional StopTimeEvent departure = 3; optional MnrExtension mnr_extension = 1005; }
message MnrExtension { optional string track = 1; optional string status = 2; }
message StopTimeEvent { optional int64 time = 2; optional int32 delay = 1; }
`;

const MTA_API_KEY = '2d394b0e-269d-454b-b229-66d15474c2f2';
const FEED_URL = `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr`;

async function main() {
  const timeOpts = { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', second: '2-digit' };
  console.log(`Current time (NYC): ${new Date().toLocaleTimeString('en-US', timeOpts)}\n`);
  
  console.log(`=== GROUND TRUTH ===`);
  console.log(`Train 1553: New Haven -> Grand Central`);
  console.log(`Departed New Haven: 10:21 AM`);
  console.log(`Expected Harlem-125th arrival: ~12:10-12:12 PM`);
  console.log(`\n`);

  const response = await fetch(FEED_URL, { headers: { 'x-api-key': MTA_API_KEY } });
  const buffer = await response.arrayBuffer();
  const root = protobuf.parse(PROTO).root;
  const FeedMessage = root.lookupType("FeedMessage");
  const feed = FeedMessage.decode(new Uint8Array(buffer));
  const data = FeedMessage.toObject(feed, { longs: Number, defaults: false });

  // Find Train 1553
  const entity = data.entity?.find(e => e.id === '1553');
  
  if (!entity) {
    console.log(`ERROR: Train 1553 not found in feed!`);
    console.log(`\nSearching for trains starting at 10:21...`);
    
    for (const e of data.entity || []) {
      if (e.tripUpdate?.trip?.startTime === '10:21:00') {
        console.log(`Found: Entity ${e.id}, Trip ${e.tripUpdate.trip.tripId}, Route ${e.tripUpdate.trip.routeId}`);
      }
    }
    return;
  }

  const tu = entity.tripUpdate;
  console.log(`=== FOUND TRAIN 1553 ===`);
  console.log(`Entity ID: ${entity.id}`);
  console.log(`Trip ID: ${tu?.trip?.tripId}`);
  console.log(`Route ID: ${tu?.trip?.routeId}`);
  console.log(`Start Time: ${tu?.trip?.startTime}`);
  console.log(`Start Date: ${tu?.trip?.startDate}`);
  
  console.log(`\n=== ALL STOPS (${tu?.stopTimeUpdate?.length || 0}) ===\n`);
  
  const now = Date.now();
  
  for (const stop of tu?.stopTimeUpdate || []) {
    const arrTime = stop.arrival?.time ? new Date(stop.arrival.time * 1000) : null;
    const depTime = stop.departure?.time ? new Date(stop.departure.time * 1000) : null;
    const delay = stop.arrival?.delay || 0;
    const delayMins = Math.round(delay / 60);
    
    const arrStr = arrTime?.toLocaleTimeString('en-US', timeOpts) || 'N/A';
    const depStr = depTime?.toLocaleTimeString('en-US', timeOpts) || 'N/A';
    const minsAway = arrTime ? Math.round((arrTime.getTime() - now) / 60000) : null;
    const status = minsAway !== null ? (minsAway > 0 ? `in ${minsAway} min` : `${-minsAway} min ago`) : '';
    const delayStr = delayMins > 0 ? ` [+${delayMins}m delay]` : '';
    const trackStr = stop.mnrExtension?.track ? ` Track ${stop.mnrExtension.track}` : '';
    const statusStr = stop.mnrExtension?.status ? ` STATUS: ${stop.mnrExtension.status}` : '';
    
    console.log(`Stop ${stop.stopId.padStart(3)}: Arr ${arrStr.padStart(14)} | Dep ${depStr.padStart(14)} | ${status}${delayStr}${trackStr}${statusStr}`);
  }
  
  // Check if any stop arrives around 12:10 PM
  console.log(`\n=== ANALYSIS ===`);
  console.log(`Looking for a stop arriving around 12:10 PM...`);
  
  const target1210 = new Date();
  target1210.setHours(12, 10, 0, 0);
  
  for (const stop of tu?.stopTimeUpdate || []) {
    const arrTime = stop.arrival?.time ? new Date(stop.arrival.time * 1000) : null;
    if (!arrTime) continue;
    
    const diffMins = Math.abs(arrTime.getTime() - target1210.getTime()) / 60000;
    if (diffMins < 10) {
      console.log(`  MATCH: Stop ${stop.stopId} arrives at ${arrTime.toLocaleTimeString('en-US', timeOpts)} (${diffMins.toFixed(1)} mins from 12:10)`);
    }
  }
  
  // What stop ID might be Harlem-125th for this train?
  console.log(`\n=== STOP ID MAPPING QUESTION ===`);
  console.log(`According to ground truth, Harlem-125th should be ~12:10 PM`);
  console.log(`Which stop ID in this train matches that time?`);
}

main().catch(console.error);

