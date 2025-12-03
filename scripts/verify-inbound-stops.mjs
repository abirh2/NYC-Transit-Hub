/**
 * Verify if ANY inbound New Haven train has stops between Connecticut and GCT
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

// NY stops between Connecticut and GCT
const NY_INTERMEDIATE_STOPS = ['4', '56', '50', '46', '42', '38', '35', '32', '29', '27', '24', '21', '18', '15', '12', '9', '6', '3'];

async function main() {
  const response = await fetch(FEED_URL, { headers: { 'x-api-key': MTA_API_KEY } });
  const buffer = await response.arrayBuffer();
  const root = protobuf.parse(PROTO).root;
  const FeedMessage = root.lookupType("FeedMessage");
  const feed = FeedMessage.decode(new Uint8Array(buffer));
  const data = FeedMessage.toObject(feed, { longs: Number, defaults: false });

  console.log('=== CHECKING ALL NEW HAVEN LINE (route 3) INBOUND TRAINS ===\n');
  
  let inboundCount = 0;
  let withNYStops = 0;
  
  for (const entity of data.entity || []) {
    const tu = entity.tripUpdate;
    if (!tu || !tu.trip || tu.trip.routeId !== '3') continue;
    
    const stops = tu.stopTimeUpdate || [];
    const stopIds = stops.map(s => s.stopId);
    
    // Check if last stop is GCT (inbound)
    const lastStop = stopIds[stopIds.length - 1];
    if (lastStop !== '1') continue;
    
    // Check if first stop is NOT GCT (not outbound that ends at GCT somehow)
    const firstStop = stopIds[0];
    if (firstStop === '1') continue;
    
    inboundCount++;
    
    // Check for NY intermediate stops
    const hasNYStop = stopIds.some(id => NY_INTERMEDIATE_STOPS.includes(id));
    if (hasNYStop) {
      withNYStops++;
      const nyStops = stopIds.filter(id => NY_INTERMEDIATE_STOPS.includes(id));
      console.log('Train ' + entity.id + ' (' + tu.trip.startTime + '): HAS NY stops: ' + nyStops.join(', '));
    } else {
      // Find the gap
      const arrivalTimes = stops.map(s => (s.arrival && s.arrival.time) || 0);
      const lastCTIndex = stopIds.findIndex(id => id === '124' || parseInt(id) > 100);
      const gctIndex = stopIds.indexOf('1');
      
      if (lastCTIndex >= 0 && gctIndex >= 0) {
        const lastCTTime = arrivalTimes[lastCTIndex];
        const gctTime = arrivalTimes[gctIndex];
        const gapMins = Math.round((gctTime - lastCTTime) / 60);
        
        if (gapMins > 30) {
          console.log('Train ' + entity.id + ' (' + tu.trip.startTime + '): NO NY stops - ' + gapMins + ' min gap between CT and GCT!');
        }
      }
    }
  }
  
  console.log('\n=== SUMMARY ===');
  console.log('Total inbound New Haven trains: ' + inboundCount);
  console.log('Trains with NY intermediate stops: ' + withNYStops);
  console.log('Trains MISSING NY intermediate stops: ' + (inboundCount - withNYStops));
  
  if (withNYStops === 0) {
    console.log('\nCONFIRMED: NO inbound New Haven trains have intermediate NY stops in the GTFS-RT feed!');
    console.log('This is an MTA feed issue, not a bug in our code.');
  }
}

main().catch(console.error);

