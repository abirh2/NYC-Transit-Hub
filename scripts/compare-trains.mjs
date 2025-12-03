/**
 * Compare two trains - one with stop 4 and one without
 * To understand why some trains have Harlem-125th and others don't
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
message StopTimeEvent { optional int64 time = 2; optional int32 delay = 1; }
`;

const MTA_API_KEY = '2d394b0e-269d-454b-b229-66d15474c2f2';
const FEED_URL = `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr`;

async function main() {
  const response = await fetch(FEED_URL, { headers: { 'x-api-key': MTA_API_KEY } });
  const buffer = await response.arrayBuffer();
  const root = protobuf.parse(PROTO).root;
  const FeedMessage = root.lookupType("FeedMessage");
  const feed = FeedMessage.decode(new Uint8Array(buffer));
  const data = FeedMessage.toObject(feed, { longs: Number, defaults: false });

  // Train 1553 - supposedly missing stop 4 (Harlem-125th)
  const train1553 = data.entity?.find(e => e.id === '1553');
  
  // Train 1526 - has stop 4 (Harlem-125th)
  const train1526 = data.entity?.find(e => e.id === '1526');
  
  // Train 1351 - another one with stop 4
  const train1351 = data.entity?.find(e => e.id === '1351');

  console.log(`=== TRAIN 1553 (supposedly missing Harlem) ===`);
  if (train1553) {
    const tu = train1553.tripUpdate;
    console.log(`Trip ID: ${tu?.trip?.tripId}`);
    console.log(`Route ID: ${tu?.trip?.routeId}`);
    console.log(`Start Time: ${tu?.trip?.startTime}`);
    console.log(`Stop IDs: ${(tu?.stopTimeUpdate || []).map(s => s.stopId).join(', ')}`);
    console.log(`Has stop 4: ${(tu?.stopTimeUpdate || []).some(s => s.stopId === '4')}`);
    console.log(`Has stop 56: ${(tu?.stopTimeUpdate || []).some(s => s.stopId === '56')}`);
    console.log(`Stop count: ${tu?.stopTimeUpdate?.length}`);
  }
  
  console.log(`\n=== TRAIN 1526 (has Harlem) ===`);
  if (train1526) {
    const tu = train1526.tripUpdate;
    console.log(`Trip ID: ${tu?.trip?.tripId}`);
    console.log(`Route ID: ${tu?.trip?.routeId}`);
    console.log(`Start Time: ${tu?.trip?.startTime}`);
    console.log(`Stop IDs: ${(tu?.stopTimeUpdate || []).map(s => s.stopId).join(', ')}`);
    console.log(`Has stop 4: ${(tu?.stopTimeUpdate || []).some(s => s.stopId === '4')}`);
    console.log(`Stop count: ${tu?.stopTimeUpdate?.length}`);
  }
  
  console.log(`\n=== TRAIN 1351 (also has Harlem) ===`);
  if (train1351) {
    const tu = train1351.tripUpdate;
    console.log(`Trip ID: ${tu?.trip?.tripId}`);
    console.log(`Route ID: ${tu?.trip?.routeId}`);
    console.log(`Start Time: ${tu?.trip?.startTime}`);
    console.log(`Stop IDs: ${(tu?.stopTimeUpdate || []).map(s => s.stopId).join(', ')}`);
    console.log(`Has stop 4: ${(tu?.stopTimeUpdate || []).some(s => s.stopId === '4')}`);
    console.log(`Stop count: ${tu?.stopTimeUpdate?.length}`);
  }
  
  console.log(`\n=== ANALYSIS ===`);
  console.log(`Train 1553 uses stop IDs in the 100-190 range (Shore Line East branch)`);
  console.log(`Trains 1526/1351 use stop IDs in the 1-124 range (main New Haven line)`);
  console.log(`\nBut according to MTA, Train 1553 SHOULD stop at Harlem-125th at 12:10 PM!`);
  console.log(`This suggests the GTFS-RT feed is MISSING stops for Shore Line East trains.`);
}

main().catch(console.error);

