/**
 * Build a lookup table from MNR GTFS static data:
 * train_number (trip_short_name) -> scheduled stops with times
 * 
 * This allows us to merge scheduled stops with GTFS-RT real-time data.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const STATIC_DIR = join(process.cwd(), 'data/gtfs/mnr-static');
const OUTPUT_FILE = join(process.cwd(), 'data/gtfs/mnr-schedule-lookup.json');

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i];
    });
    return obj;
  });
}

function main() {
  console.log('Loading GTFS static data...');
  
  // Load stops
  const stopsRaw = readFileSync(join(STATIC_DIR, 'stops.txt'), 'utf-8');
  const stops = parseCSV(stopsRaw);
  const stopNames = new Map();
  for (const stop of stops) {
    stopNames.set(stop.stop_id, stop.stop_name);
  }
  console.log(`Loaded ${stopNames.size} stops`);
  
  // Load trips - build trip_id -> train_number mapping
  const tripsRaw = readFileSync(join(STATIC_DIR, 'trips.txt'), 'utf-8');
  const trips = parseCSV(tripsRaw);
  
  const tripToTrain = new Map();
  const trainFirstTrip = new Map(); // Store only first trip for each train
  
  for (const trip of trips) {
    const trainNum = trip.trip_short_name;
    const tripId = trip.trip_id;
    
    tripToTrain.set(tripId, trainNum);
    
    // Only store the first trip_id we see for each train number
    if (!trainFirstTrip.has(trainNum)) {
      trainFirstTrip.set(trainNum, tripId);
    }
  }
  console.log(`Loaded ${trips.length} trips, ${trainFirstTrip.size} unique train numbers`);
  
  // Load stop_times - group by trip_id
  const stopTimesRaw = readFileSync(join(STATIC_DIR, 'stop_times.txt'), 'utf-8');
  const stopTimesLines = stopTimesRaw.trim().split('\n');
  
  console.log(`Processing ${stopTimesLines.length - 1} stop_times entries...`);
  
  // Build: trip_id -> stops[]
  const stopsByTrip = new Map();
  
  for (let i = 1; i < stopTimesLines.length; i++) {
    const values = stopTimesLines[i].split(',');
    const tripId = values[0];
    const arrivalTime = values[1];
    const stopId = values[3];
    const stopSeq = parseInt(values[4]);
    
    if (!stopsByTrip.has(tripId)) {
      stopsByTrip.set(tripId, []);
    }
    
    stopsByTrip.get(tripId).push({
      seq: stopSeq,
      stopId,
      time: arrivalTime,
    });
  }
  
  console.log(`Grouped stops for ${stopsByTrip.size} trips`);
  
  // Build final schedule by train number
  const scheduleByTrain = {};
  
  for (const [trainNum, tripId] of trainFirstTrip) {
    const tripStops = stopsByTrip.get(tripId);
    if (!tripStops) continue;
    
    // Sort by sequence
    tripStops.sort((a, b) => a.seq - b.seq);
    
    scheduleByTrain[trainNum] = tripStops.map(s => ({
      id: s.stopId,
      name: stopNames.get(s.stopId) || s.stopId,
      time: s.time,
    }));
  }
  
  console.log(`Built schedule for ${Object.keys(scheduleByTrain).length} trains`);
  
  // Verify Train 1553
  const train1553 = scheduleByTrain['1553'];
  if (train1553) {
    console.log('\n=== Train 1553 Schedule ===');
    for (let i = 0; i < train1553.length; i++) {
      const s = train1553[i];
      console.log(`  ${i + 1}. ${s.time} - ${s.id} (${s.name})`);
    }
  }
  
  writeFileSync(OUTPUT_FILE, JSON.stringify(scheduleByTrain, null, 2));
  console.log(`\nWritten to ${OUTPUT_FILE}`);
  console.log(`File size: ${(JSON.stringify(scheduleByTrain).length / 1024).toFixed(1)} KB`);
}

main();
