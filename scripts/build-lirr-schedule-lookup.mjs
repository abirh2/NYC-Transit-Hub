/**
 * Build a lookup table from LIRR GTFS static data:
 * train_number (trip_short_name) -> scheduled stops with times
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const STATIC_DIR = join(process.cwd(), 'data/gtfs/lirr-static');
const OUTPUT_FILE = join(process.cwd(), 'data/gtfs/lirr-schedule-lookup.json');

function parseCSV(content) {
  const lines = content.trim().split('\n');
  // Handle quoted CSV - remove quotes from headers and values
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    // Simple CSV parsing that handles quoted values
    const values = line.split(',').map(v => v.replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i];
    });
    return obj;
  });
}

function main() {
  console.log('Loading LIRR GTFS static data...');
  
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
    const values = stopTimesLines[i].split(',').map(v => v.replace(/^"|"$/g, ''));
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
  
  // Sample a Long Beach train to verify
  const sampleTrains = Object.keys(scheduleByTrain).slice(0, 5);
  console.log('\n=== Sample Train Schedules ===');
  for (const trainNum of sampleTrains) {
    const sched = scheduleByTrain[trainNum];
    console.log(`Train ${trainNum}: ${sched.length} stops (${sched[0]?.name} → ${sched[sched.length-1]?.name})`);
  }
  
  writeFileSync(OUTPUT_FILE, JSON.stringify(scheduleByTrain, null, 2));
  console.log(`\nWritten to ${OUTPUT_FILE}`);
  console.log(`File size: ${(JSON.stringify(scheduleByTrain).length / 1024).toFixed(1)} KB`);
}

main();

