/**
 * Check ALL Metro-North and LIRR lines for missing stops (large time gaps)
 * This identifies if the Shore Line issue affects other lines
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

const FEEDS = {
  'Metro-North': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr',
  'LIRR': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/lirr%2Fgtfs-lirr',
};

const MNR_ROUTES = { '1': 'Hudson', '2': 'Harlem', '3': 'New Haven', '4': 'New Canaan', '5': 'Danbury', '6': 'Waterbury' };
const LIRR_ROUTES = { '1': 'Babylon', '2': 'City Zone', '3': 'Far Rockaway', '4': 'Hempstead', '5': 'Long Beach', '6': 'Montauk', '7': 'Oyster Bay', '8': 'Port Jefferson', '9': 'Port Washington', '10': 'Ronkonkoma', '11': 'West Hempstead' };

async function checkFeed(name, url, routeNames) {
  console.log(`\n=== ${name} ===\n`);
  
  const response = await fetch(url, { headers: { 'x-api-key': MTA_API_KEY } });
  const buffer = await response.arrayBuffer();
  const root = protobuf.parse(PROTO).root;
  const FeedMessage = root.lookupType("FeedMessage");
  const feed = FeedMessage.decode(new Uint8Array(buffer));
  const data = FeedMessage.toObject(feed, { longs: Number, defaults: false });

  // Track gaps by route
  const gapsByRoute = new Map();
  
  for (const entity of data.entity || []) {
    const tu = entity.tripUpdate;
    if (!tu) continue;
    
    const routeId = tu.trip?.routeId || '?';
    const stops = tu.stopTimeUpdate || [];
    
    // Check for time gaps > 30 minutes between consecutive stops
    for (let i = 0; i < stops.length - 1; i++) {
      const t1 = stops[i].arrival?.time;
      const t2 = stops[i + 1].arrival?.time;
      
      if (!t1 || !t2) continue;
      
      const gapMins = Math.round((t2 - t1) / 60);
      
      if (gapMins > 30) {
        if (!gapsByRoute.has(routeId)) {
          gapsByRoute.set(routeId, []);
        }
        gapsByRoute.get(routeId).push({
          trainId: entity.id,
          from: stops[i].stopId,
          to: stops[i + 1].stopId,
          gapMins,
        });
      }
    }
  }
  
  // Report findings
  if (gapsByRoute.size === 0) {
    console.log('  No significant gaps found (>30 min between stops)');
  } else {
    for (const [routeId, gaps] of gapsByRoute) {
      const routeName = routeNames[routeId] || `Route ${routeId}`;
      console.log(`  ${routeName} (${routeId}): ${gaps.length} trains with >30 min gaps`);
      
      // Show unique gap patterns
      const patterns = new Map();
      for (const gap of gaps) {
        const key = `${gap.from} → ${gap.to}`;
        if (!patterns.has(key)) {
          patterns.set(key, { count: 0, maxGap: 0, example: gap.trainId });
        }
        const p = patterns.get(key);
        p.count++;
        if (gap.gapMins > p.maxGap) p.maxGap = gap.gapMins;
      }
      
      for (const [pattern, data] of patterns) {
        console.log(`    - ${pattern}: ${data.count} trains, max ${data.maxGap} min gap (e.g., Train ${data.example})`);
      }
    }
  }
}

async function main() {
  console.log('Checking for missing stops (large time gaps) in GTFS-RT feeds...');
  console.log('A gap >30 min between consecutive stops suggests missing intermediate stops.\n');
  
  await checkFeed('Metro-North', FEEDS['Metro-North'], MNR_ROUTES);
  await checkFeed('LIRR', FEEDS['LIRR'], LIRR_ROUTES);
  
  console.log('\n=== SUMMARY ===');
  console.log('If a line shows gaps, it may need static schedule merging like New Haven.');
}

main().catch(console.error);

