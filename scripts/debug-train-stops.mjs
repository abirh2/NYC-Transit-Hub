/**
 * Debug script to examine stop time updates for a specific train
 * Run with: node scripts/debug-train-stops.mjs [trainNumber]
 */

import protobuf from "protobufjs";

const GTFS_RT_PROTO = `
syntax = "proto2";

message FeedMessage {
  required FeedHeader header = 1;
  repeated FeedEntity entity = 2;
}

message FeedHeader {
  required string gtfs_realtime_version = 1;
  optional uint64 timestamp = 3;
}

message FeedEntity {
  required string id = 1;
  optional TripUpdate trip_update = 3;
}

message TripUpdate {
  optional TripDescriptor trip = 1;
  optional VehicleDescriptor vehicle = 3;
  repeated StopTimeUpdate stop_time_update = 2;
}

message TripDescriptor {
  optional string trip_id = 1;
  optional string route_id = 5;
  optional uint32 direction_id = 6;
  optional string start_time = 2;
  optional string start_date = 3;
}

message VehicleDescriptor {
  optional string id = 1;
  optional string label = 2;
}

message StopTimeUpdate {
  optional uint32 stop_sequence = 1;
  optional string stop_id = 4;
  optional StopTimeEvent arrival = 2;
  optional StopTimeEvent departure = 3;
  optional ScheduleRelationship schedule_relationship = 5;
  optional MnrStopTimeUpdateExtension mnr_extension = 1005;
  
  enum ScheduleRelationship {
    SCHEDULED = 0;
    SKIPPED = 1;
    NO_DATA = 2;
  }
}

message MnrStopTimeUpdateExtension {
  optional string track = 1;
  optional string status = 2;
}

message StopTimeEvent {
  optional int64 time = 2;
  optional int32 delay = 1;
}
`;

// Metro-North station names (partial)
const MNR_STATIONS = {
  "1": "Grand Central",
  "2": "Harlem-125th St",
  "3": "Melrose",
  "4": "Tremont",
  "5": "Fordham",
  "6": "Botanical Garden",
  "7": "Williams Bridge",
  "8": "Woodlawn",
  "9": "Wakefield",
  "10": "Mt Vernon West",
  "11": "Fleetwood",
  "12": "Bronxville",
  "13": "Tuckahoe",
  "14": "Crestwood",
  "15": "Scarsdale",
  "16": "Hartsdale",
  "17": "White Plains",
  "18": "North White Plains",
  "19": "Valhalla",
  "20": "Mount Pleasant",
  "21": "Hawthorne",
  "22": "Pleasantville",
  "23": "Chappaqua",
  "24": "Mount Kisco",
  "108": "New Rochelle",
  "112": "Stamford",
  "124": "New Haven",
};

const MTA_API_KEY = '2d394b0e-269d-454b-b229-66d15474c2f2';
const FEED_URL = `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr`;

async function main() {
  const trainToFind = process.argv[2] || "1553";
  
  console.log(`Looking for train ${trainToFind} in Metro-North feed...\n`);

  const response = await fetch(FEED_URL, {
    headers: { 'x-api-key': MTA_API_KEY },
  });

  const buffer = await response.arrayBuffer();
  const root = protobuf.parse(GTFS_RT_PROTO).root;
  const FeedMessage = root.lookupType("FeedMessage");
  const feed = FeedMessage.decode(new Uint8Array(buffer));
  const data = FeedMessage.toObject(feed, {
    longs: Number,
    enums: String,
    defaults: true,
  });

  const now = Date.now();
  
  // Find the train
  const entity = data.entity.find(e => e.id === trainToFind);
  
  if (!entity) {
    console.log(`Train ${trainToFind} not found in feed.`);
    console.log(`\nAvailable trains (first 20):`);
    data.entity.filter(e => e.tripUpdate).slice(0, 20).forEach(e => {
      console.log(`  ${e.id}`);
    });
    return;
  }

  const tu = entity.tripUpdate;
  console.log(`=== Train ${trainToFind} ===`);
  console.log(`Trip ID: ${tu.trip?.tripId}`);
  console.log(`Route ID: ${tu.trip?.routeId}`);
  console.log(`Direction ID: ${tu.trip?.directionId}`);
  console.log(`Start Time: ${tu.trip?.startTime}`);
  console.log(`Start Date: ${tu.trip?.startDate}`);
  console.log(`Vehicle: ${tu.vehicle?.label || tu.vehicle?.id || 'N/A'}`);
  
  console.log(`\n=== All Stop Time Updates (${tu.stopTimeUpdate?.length || 0} stops) ===\n`);
  
  for (const stop of tu.stopTimeUpdate || []) {
    const stationName = MNR_STATIONS[stop.stopId] || `Stop ${stop.stopId}`;
    const arrivalTime = stop.arrival?.time ? new Date(stop.arrival.time * 1000) : null;
    const departureTime = stop.departure?.time ? new Date(stop.departure.time * 1000) : null;
    const delay = stop.arrival?.delay || stop.departure?.delay || 0;
    
    const isPast = arrivalTime && arrivalTime.getTime() < now;
    const minsAway = arrivalTime ? Math.round((arrivalTime.getTime() - now) / 60000) : null;
    
    // MTA extension field 1005 contains track and status
    const mnrExt = stop.mnrExtension;
    const status = mnrExt?.status || 'N/A';
    const track = mnrExt?.track || 'N/A';
    
    console.log(`Stop ID: ${stop.stopId} (${stationName})`);
    console.log(`  Sequence: ${stop.stopSequence}`);
    console.log(`  Arrival: ${arrivalTime?.toLocaleTimeString() || 'N/A'} ${isPast ? '(PASSED)' : minsAway !== null ? `(in ${minsAway} min)` : ''}`);
    console.log(`  Departure: ${departureTime?.toLocaleTimeString() || 'N/A'}`);
    console.log(`  Delay: ${delay} seconds`);
    console.log(`  STATUS: ${status}`);
    console.log(`  Track: ${track}`);
    console.log('');
  }
  
  // Find what our code would consider the "next stop"
  console.log(`=== Analysis ===`);
  const futureStops = (tu.stopTimeUpdate || []).filter(s => {
    const time = s.arrival?.time || s.departure?.time;
    return time && time * 1000 > now;
  });
  
  if (futureStops.length > 0) {
    const nextStop = futureStops[0];
    const stationName = MNR_STATIONS[nextStop.stopId] || `Stop ${nextStop.stopId}`;
    console.log(`Our "next stop": ${stationName} (stop ${nextStop.stopId})`);
    console.log(`Future stops in feed: ${futureStops.length}`);
  } else {
    console.log(`No future stops found!`);
  }
}

main().catch(console.error);

