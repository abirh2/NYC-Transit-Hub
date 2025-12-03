/**
 * Deep dive into LIRR gaps to see if they're real issues or expected express patterns
 */

import protobuf from "protobufjs";

const PROTO = `
syntax = "proto2";
message FeedMessage { required FeedHeader header = 1; repeated FeedEntity entity = 2; }
message FeedHeader { required string gtfs_realtime_version = 1; }
message FeedEntity { required string id = 1; optional TripUpdate trip_update = 3; }
message TripUpdate { optional TripDescriptor trip = 1; repeated StopTimeUpdate stop_time_update = 2; }
message TripDescriptor { optional string trip_id = 1; optional string route_id = 5; }
message StopTimeUpdate { optional string stop_id = 4; optional StopTimeEvent arrival = 2; }
message StopTimeEvent { optional int64 time = 2; }
`;

const MTA_API_KEY = '2d394b0e-269d-454b-b229-66d15474c2f2';
const FEED_URL = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/lirr%2Fgtfs-lirr';

const LIRR_ROUTES = { 
  '1': 'Babylon', '2': 'City Zone', '3': 'Far Rockaway', '4': 'Hempstead', 
  '5': 'Long Beach', '6': 'Montauk', '7': 'Oyster Bay', '8': 'Port Jefferson', 
  '9': 'Port Washington', '10': 'Ronkonkoma', '11': 'West Hempstead', '12': 'Belmont'
};

async function main() {
  const timeOpts = { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' };
  const now = Date.now();
  
  console.log('=== LIRR Gap Analysis ===\n');
  console.log(`Current time: ${new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' })}\n`);

  const response = await fetch(FEED_URL, { headers: { 'x-api-key': MTA_API_KEY } });
  const buffer = await response.arrayBuffer();
  const root = protobuf.parse(PROTO).root;
  const FeedMessage = root.lookupType("FeedMessage");
  const feed = FeedMessage.decode(new Uint8Array(buffer));
  const data = FeedMessage.toObject(feed, { longs: Number, defaults: false });

  // Count trains by route and check for gaps
  const routeStats = new Map();
  let trainsWithGaps = [];
  
  for (const entity of data.entity || []) {
    const tu = entity.tripUpdate;
    if (!tu) continue;
    
    const routeId = tu.trip?.routeId || '?';
    const stops = tu.stopTimeUpdate || [];
    
    if (!routeStats.has(routeId)) {
      routeStats.set(routeId, { total: 0, withGaps: 0 });
    }
    routeStats.get(routeId).total++;
    
    // Check for gaps > 30 min
    let hasGap = false;
    let maxGap = 0;
    let gapDetails = null;
    
    for (let i = 0; i < stops.length - 1; i++) {
      const t1 = stops[i].arrival?.time;
      const t2 = stops[i + 1].arrival?.time;
      
      if (!t1 || !t2) continue;
      
      const gapMins = Math.round((t2 - t1) / 60);
      
      if (gapMins > maxGap) {
        maxGap = gapMins;
        gapDetails = {
          from: stops[i].stopId,
          to: stops[i + 1].stopId,
          fromTime: new Date(t1 * 1000).toLocaleTimeString('en-US', timeOpts),
          toTime: new Date(t2 * 1000).toLocaleTimeString('en-US', timeOpts),
        };
      }
      
      if (gapMins > 30) {
        hasGap = true;
      }
    }
    
    if (hasGap) {
      routeStats.get(routeId).withGaps++;
      trainsWithGaps.push({
        trainId: entity.id,
        routeId,
        routeName: LIRR_ROUTES[routeId] || routeId,
        stopCount: stops.length,
        maxGap,
        gapDetails,
      });
    }
  }
  
  // Summary by route
  console.log('=== Trains by Route ===\n');
  for (const [routeId, stats] of [...routeStats.entries()].sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
    const routeName = LIRR_ROUTES[routeId] || `Route ${routeId}`;
    const pct = stats.total > 0 ? Math.round(stats.withGaps / stats.total * 100) : 0;
    console.log(`${routeName.padEnd(15)} (${routeId}): ${stats.total} trains, ${stats.withGaps} with gaps (${pct}%)`);
  }
  
  // Details of trains with gaps
  if (trainsWithGaps.length > 0) {
    console.log('\n=== Trains with >30 min gaps ===\n');
    for (const t of trainsWithGaps.slice(0, 10)) {
      console.log(`Train ${t.trainId}`);
      console.log(`  Route: ${t.routeName} (${t.routeId})`);
      console.log(`  Stops: ${t.stopCount}`);
      console.log(`  Max gap: ${t.maxGap} min (${t.gapDetails?.from} at ${t.gapDetails?.fromTime} → ${t.gapDetails?.to} at ${t.gapDetails?.toTime})`);
      console.log('');
    }
  }
  
  // Compare to Metro-North
  console.log('=== Comparison ===\n');
  const totalLirr = [...routeStats.values()].reduce((sum, s) => sum + s.total, 0);
  const gapsLirr = [...routeStats.values()].reduce((sum, s) => sum + s.withGaps, 0);
  console.log(`LIRR: ${gapsLirr} of ${totalLirr} trains have gaps (${Math.round(gapsLirr/totalLirr*100)}%)`);
  console.log(`(For comparison, Metro-North had ~80 trains with gaps, mostly Shore Line)`);
}

main().catch(console.error);

