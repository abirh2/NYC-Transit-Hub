/**
 * Test the schedule merge fix
 * Verifies that Train 1553 now shows Harlem-125th St
 */

import protobuf from "protobufjs";
import { readFileSync } from 'fs';
import { join } from 'path';

const PROTO = `
syntax = "proto2";
message FeedMessage { required FeedHeader header = 1; repeated FeedEntity entity = 2; }
message FeedHeader { required string gtfs_realtime_version = 1; }
message FeedEntity { required string id = 1; optional TripUpdate trip_update = 3; }
message TripUpdate { optional TripDescriptor trip = 1; repeated StopTimeUpdate stop_time_update = 2; }
message TripDescriptor { optional string trip_id = 1; optional string route_id = 5; }
message StopTimeUpdate { optional string stop_id = 4; optional StopTimeEvent arrival = 2; }
message StopTimeEvent { optional int64 time = 2; optional int32 delay = 1; }
`;

const MTA_API_KEY = '2d394b0e-269d-454b-b229-66d15474c2f2';
const FEED_URL = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr';

// Load schedule lookup
const scheduleLookup = JSON.parse(
  readFileSync(join(process.cwd(), 'data/gtfs/mnr-schedule-lookup.json'), 'utf-8')
);

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

async function main() {
  const timeOpts = { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' };
  const now = Date.now();
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  
  console.log('Current time (NYC):', new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' }));
  console.log('');
  
  // Fetch GTFS-RT feed
  const response = await fetch(FEED_URL, { headers: { 'x-api-key': MTA_API_KEY } });
  const buffer = await response.arrayBuffer();
  const root = protobuf.parse(PROTO).root;
  const FeedMessage = root.lookupType("FeedMessage");
  const feed = FeedMessage.decode(new Uint8Array(buffer));
  const data = FeedMessage.toObject(feed, { longs: Number, defaults: false });

  // Find Train 1553
  const train1553 = data.entity?.find(e => e.id === '1553');
  if (!train1553) {
    console.log('Train 1553 not currently in feed (might have already arrived at GCT)');
    console.log('Checking other Shore Line trains...');
    
    // Try other Shore Line trains
    for (const trainNum of ['1555', '1557', '1559', '1561']) {
      const train = data.entity?.find(e => e.id === trainNum);
      if (train) {
        console.log(`\nFound Train ${trainNum} - testing merge logic:`);
        testTrainMerge(train, trainNum, scheduleLookup, now, todayMidnight, timeOpts);
        break;
      }
    }
    return;
  }

  console.log('=== Train 1553 ===');
  testTrainMerge(train1553, '1553', scheduleLookup, now, todayMidnight, timeOpts);
}

function testTrainMerge(trainEntity, trainNum, scheduleLookup, now, todayMidnight, timeOpts) {
  const tu = trainEntity.tripUpdate;
  const stops = tu?.stopTimeUpdate || [];
  
  // Get delay from first stop
  let delay = 0;
  for (const stop of stops) {
    if (stop.arrival?.delay) {
      delay = stop.arrival.delay;
      break;
    }
  }
  console.log(`Delay: ${Math.round(delay / 60)} minutes`);
  
  // Build real-time stop map
  const realtimeStops = new Map();
  for (const stop of stops) {
    const time = stop.arrival?.time;
    if (time && stop.stopId) {
      realtimeStops.set(stop.stopId, time * 1000);
    }
  }
  
  console.log(`\nGTFS-RT stops (${realtimeStops.size}):`);
  for (const [stopId, time] of realtimeStops) {
    console.log(`  ${stopId}: ${new Date(time).toLocaleTimeString('en-US', timeOpts)}`);
  }
  
  // Get scheduled stops
  const scheduled = scheduleLookup[trainNum];
  if (!scheduled) {
    console.log(`\nNo schedule found for train ${trainNum}`);
    return;
  }
  
  console.log(`\nScheduled stops (${scheduled.length}):`);
  
  // Check for missing stops
  const missingStops = [];
  for (const sched of scheduled) {
    if (!realtimeStops.has(sched.id)) {
      const scheduledMins = timeToMinutes(sched.time);
      const scheduledTime = todayMidnight + scheduledMins * 60 * 1000 + delay * 1000;
      
      missingStops.push({
        id: sched.id,
        name: sched.name,
        time: scheduledTime,
        scheduledTime: sched.time,
      });
      console.log(`  ${sched.id} (${sched.name}): ${sched.time} [MISSING FROM GTFS-RT]`);
    } else {
      console.log(`  ${sched.id} (${sched.name}): ${sched.time} [in GTFS-RT]`);
    }
  }
  
  if (missingStops.length > 0) {
    console.log(`\n=== MERGED STOPS (with delay applied) ===`);
    
    // Combine and sort all stops
    const allStops = [];
    
    for (const [stopId, time] of realtimeStops) {
      const sched = scheduled.find(s => s.id === stopId);
      allStops.push({
        stopId,
        name: sched?.name || stopId,
        time,
        source: 'gtfs-rt',
      });
    }
    
    for (const missing of missingStops) {
      allStops.push({
        stopId: missing.id,
        name: missing.name,
        time: missing.time,
        source: 'schedule',
      });
    }
    
    allStops.sort((a, b) => a.time - b.time);
    
    for (const stop of allStops) {
      const minsAway = Math.round((stop.time - now) / 60000);
      const status = minsAway > 0 ? `in ${minsAway} min` : `${-minsAway} min ago`;
      const source = stop.source === 'schedule' ? ' [FROM SCHEDULE]' : '';
      console.log(`  ${stop.stopId} (${stop.name}): ${new Date(stop.time).toLocaleTimeString('en-US', timeOpts)} (${status})${source}`);
    }
    
    // Check specifically for Harlem-125th
    const harlem = allStops.find(s => s.stopId === '4');
    if (harlem) {
      console.log(`\n✅ SUCCESS: Harlem-125th St (stop 4) is now included!`);
      console.log(`   Arrival time: ${new Date(harlem.time).toLocaleTimeString('en-US', timeOpts)}`);
    } else {
      console.log(`\n❌ FAIL: Harlem-125th St still not in merged data`);
    }
  } else {
    console.log(`\nNo missing stops - GTFS-RT is complete for this train.`);
  }
}

main().catch(console.error);

