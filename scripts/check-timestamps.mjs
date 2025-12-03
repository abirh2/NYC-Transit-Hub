/**
 * Check raw MTA timestamps and timezone handling
 */

import protobuf from "protobufjs";

const PROTO = `
syntax = "proto2";
message FeedMessage { required FeedHeader header = 1; repeated FeedEntity entity = 2; }
message FeedHeader { required string gtfs_realtime_version = 1; optional uint64 timestamp = 3; }
message FeedEntity { required string id = 1; optional TripUpdate trip_update = 3; }
message TripUpdate { optional TripDescriptor trip = 1; repeated StopTimeUpdate stop_time_update = 2; }
message TripDescriptor { optional string trip_id = 1; optional string route_id = 5; }
message StopTimeUpdate { optional string stop_id = 4; optional StopTimeEvent arrival = 2; }
message StopTimeEvent { optional int64 time = 2; }
`;

const MTA_API_KEY = '2d394b0e-269d-454b-b229-66d15474c2f2';
const FEED_URL = `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr`;

async function main() {
  console.log(`=== Timestamp Analysis ===\n`);
  
  // Current time in different formats
  const now = new Date();
  console.log(`JavaScript Date.now(): ${Date.now()}`);
  console.log(`Current time (local):  ${now.toString()}`);
  console.log(`Current time (UTC):    ${now.toUTCString()}`);
  console.log(`Current time (ISO):    ${now.toISOString()}`);
  console.log(`Current time (NYC):    ${now.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
  console.log('');

  const response = await fetch(FEED_URL, { headers: { 'x-api-key': MTA_API_KEY } });
  const buffer = await response.arrayBuffer();
  const root = protobuf.parse(PROTO).root;
  const FeedMessage = root.lookupType("FeedMessage");
  const feed = FeedMessage.decode(new Uint8Array(buffer));
  const data = FeedMessage.toObject(feed, { longs: Number, defaults: false });

  // Feed timestamp
  console.log(`=== Feed Header ===`);
  console.log(`Feed timestamp (raw): ${data.header?.timestamp}`);
  if (data.header?.timestamp) {
    const feedTime = new Date(data.header.timestamp * 1000);
    console.log(`Feed timestamp as Date: ${feedTime.toString()}`);
    console.log(`Feed timestamp (NYC):   ${feedTime.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
  }
  console.log('');

  // Check a few train arrivals
  console.log(`=== Sample Stop Times ===\n`);
  
  let count = 0;
  for (const entity of data.entity || []) {
    if (count >= 3) break;
    
    const tu = entity.tripUpdate;
    if (!tu) continue;
    
    const harlemStop = (tu.stopTimeUpdate || []).find(s => s.stopId === '4');
    if (!harlemStop?.arrival?.time) continue;
    
    const rawTime = harlemStop.arrival.time;
    const asDate = new Date(rawTime * 1000);
    
    console.log(`Train ${entity.id} - Stop 4 (Harlem-125th):`);
    console.log(`  Raw timestamp: ${rawTime}`);
    console.log(`  As Date (local): ${asDate.toString()}`);
    console.log(`  As Date (UTC):   ${asDate.toUTCString()}`);
    console.log(`  As Date (NYC):   ${asDate.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
    
    // Calculate minutes from now
    const diffMs = rawTime * 1000 - Date.now();
    const diffMins = Math.round(diffMs / 60000);
    console.log(`  Minutes from now: ${diffMins}`);
    console.log('');
    
    count++;
  }
}

main().catch(console.error);

