/**
 * Which lines stop at Harlem-125th (stop 4)?
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
}
message StopTimeUpdate {
  optional string stop_id = 4;
}
`;

const MTA_API_KEY = '2d394b0e-269d-454b-b229-66d15474c2f2';
const FEED_URL = `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr`;

const ROUTES = {
  '1': 'Hudson',
  '2': 'Harlem',
  '3': 'New Haven',
  '4': 'New Canaan',
  '5': 'Danbury',
  '6': 'Waterbury',
};

async function main() {
  console.log(`Checking which Metro-North lines stop at Harlem-125th St (stop 4)...\n`);

  const response = await fetch(FEED_URL, {
    headers: { 'x-api-key': MTA_API_KEY },
  });

  const buffer = await response.arrayBuffer();
  const root = protobuf.parse(PROTO).root;
  const FeedMessage = root.lookupType("FeedMessage");
  const feed = FeedMessage.decode(new Uint8Array(buffer));
  const data = FeedMessage.toObject(feed, { longs: Number, defaults: false });

  const routesWithHarlem = new Map();

  for (const entity of data.entity || []) {
    const tu = entity.tripUpdate;
    if (!tu) continue;
    
    const routeId = tu.trip?.routeId;
    if (!routeId) continue;
    
    const hasHarlem = (tu.stopTimeUpdate || []).some(s => s.stopId === '4');
    
    if (hasHarlem) {
      const count = routesWithHarlem.get(routeId) || 0;
      routesWithHarlem.set(routeId, count + 1);
    }
  }

  console.log(`Routes that stop at Harlem-125th St:\n`);
  for (const [routeId, count] of routesWithHarlem) {
    console.log(`  Route ${routeId} (${ROUTES[routeId] || 'Unknown'}): ${count} trains`);
  }
  
  if (routesWithHarlem.size === 0) {
    console.log(`  None found!`);
  }
  
  console.log(`\n\nNow checking what stop ID "Harlem-125 St" actually uses per line...\n`);
  
  // Check each route's stops that might be Harlem
  const routeStops = new Map();
  for (const entity of data.entity || []) {
    const tu = entity.tripUpdate;
    if (!tu) continue;
    
    const routeId = tu.trip?.routeId;
    if (!routeId) continue;
    
    const stops = new Set(routeStops.get(routeId) || []);
    for (const s of tu.stopTimeUpdate || []) {
      stops.add(s.stopId);
    }
    routeStops.set(routeId, stops);
  }
  
  console.log(`Stop IDs used by each route:\n`);
  for (const [routeId, stops] of routeStops) {
    const sortedStops = Array.from(stops).sort((a, b) => parseInt(a) - parseInt(b));
    console.log(`Route ${routeId} (${ROUTES[routeId] || 'Unknown'}):`);
    console.log(`  ${sortedStops.slice(0, 20).join(', ')}...`);
    console.log('');
  }
}

main().catch(console.error);

