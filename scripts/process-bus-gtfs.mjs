/**
 * Process Bus GTFS data to create:
 * 1. bus-stops.json - All bus stops with coordinates
 * 2. bus-shapes.json - Route shapes (lat/lon paths)
 * 3. bus-route-stops.json - Which stops belong to which route
 * 
 * This processes the large stop_times.txt once at build time
 * so we don't need to parse 76MB+ at runtime.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const GTFS_DIR = '/tmp';
const OUTPUT_DIR = path.join(process.cwd(), 'data/gtfs');

// Borough GTFS files
const BOROUGHS = [
  { name: 'manhattan', file: 'bus_gtfs' },
  { name: 'bronx', file: 'bronx' },
  { name: 'brooklyn', file: 'brooklyn' },
  { name: 'queens', file: 'queens' },
  { name: 'staten_island', file: 'staten_island' },
];

// Parse CSV line (handles quoted fields)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Read CSV file into array of objects
async function readCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`  File not found: ${filePath}`);
    return [];
  }
  
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim());
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || '';
    });
    data.push(obj);
  }
  
  return data;
}

// Stream large CSV file line by line (for stop_times.txt)
async function streamCSV(filePath, callback) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      console.log(`  File not found: ${filePath}`);
      resolve();
      return;
    }
    
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity
    });
    
    let headers = null;
    let count = 0;
    
    rl.on('line', (line) => {
      if (!headers) {
        headers = parseCSVLine(line);
        return;
      }
      
      const values = parseCSVLine(line);
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || '';
      });
      callback(obj);
      count++;
      
      if (count % 100000 === 0) {
        process.stdout.write(`  Processed ${count} records...\r`);
      }
    });
    
    rl.on('close', () => {
      console.log(`  Processed ${count} records total`);
      resolve();
    });
    
    rl.on('error', reject);
  });
}

async function main() {
  console.log('Processing NYC Bus GTFS data...\n');
  
  // Unzip all borough files first
  const { execSync } = await import('child_process');
  for (const borough of BOROUGHS) {
    const zipPath = path.join(GTFS_DIR, `${borough.file}.zip`);
    const outDir = path.join(GTFS_DIR, `${borough.file}`);
    if (fs.existsSync(zipPath) && !fs.existsSync(outDir)) {
      console.log(`Unzipping ${borough.name}...`);
      execSync(`unzip -o ${zipPath} -d ${outDir}`, { stdio: 'pipe' });
    }
  }
  
  // Collect all data
  const allStops = new Map(); // stop_id -> {name, lat, lon}
  const allShapes = new Map(); // shape_id -> [{lat, lon, seq}]
  const routeTrips = new Map(); // route_id -> Set<trip_id>
  const tripShapes = new Map(); // route_id -> shape_id
  const routeStops = new Map(); // route_id -> Set<stop_id>
  
  // Process each borough
  for (const borough of BOROUGHS) {
    const dir = path.join(GTFS_DIR, borough.file);
    if (!fs.existsSync(dir)) {
      console.log(`Skipping ${borough.name} - directory not found`);
      continue;
    }
    
    console.log(`\nProcessing ${borough.name}...`);
    
    // 1. Read stops
    console.log('  Reading stops.txt...');
    const stops = await readCSV(path.join(dir, 'stops.txt'));
    for (const stop of stops) {
      if (stop.stop_id && stop.stop_lat && stop.stop_lon) {
        allStops.set(stop.stop_id, {
          name: stop.stop_name || '',
          lat: parseFloat(stop.stop_lat),
          lon: parseFloat(stop.stop_lon),
        });
      }
    }
    console.log(`  Found ${stops.length} stops`);
    
    // 2. Read shapes
    console.log('  Reading shapes.txt...');
    const shapes = await readCSV(path.join(dir, 'shapes.txt'));
    for (const point of shapes) {
      if (!point.shape_id) continue;
      if (!allShapes.has(point.shape_id)) {
        allShapes.set(point.shape_id, []);
      }
      allShapes.get(point.shape_id).push({
        lat: parseFloat(point.shape_pt_lat),
        lon: parseFloat(point.shape_pt_lon),
        seq: parseInt(point.shape_pt_sequence, 10),
      });
    }
    console.log(`  Found ${allShapes.size} shapes`);
    
    // 3. Read trips (route -> trip mapping and route -> shape)
    console.log('  Reading trips.txt...');
    const trips = await readCSV(path.join(dir, 'trips.txt'));
    for (const trip of trips) {
      if (!trip.route_id || !trip.trip_id) continue;
      
      if (!routeTrips.has(trip.route_id)) {
        routeTrips.set(trip.route_id, new Set());
      }
      routeTrips.get(trip.route_id).add(trip.trip_id);
      
      // Store first shape_id for each route
      if (!tripShapes.has(trip.route_id) && trip.shape_id) {
        tripShapes.set(trip.route_id, trip.shape_id);
      }
    }
    console.log(`  Found ${trips.length} trips across ${routeTrips.size} routes`);
    
    // 4. Stream stop_times to get route -> stops mapping
    console.log('  Reading stop_times.txt (this may take a moment)...');
    const tripToRoute = new Map();
    for (const [routeId, tripIds] of routeTrips) {
      for (const tripId of tripIds) {
        tripToRoute.set(tripId, routeId);
      }
    }
    
    await streamCSV(path.join(dir, 'stop_times.txt'), (record) => {
      const routeId = tripToRoute.get(record.trip_id);
      if (routeId && record.stop_id) {
        if (!routeStops.has(routeId)) {
          routeStops.set(routeId, new Set());
        }
        routeStops.get(routeId).add(record.stop_id);
      }
    });
  }
  
  // Sort shape points by sequence
  for (const [, points] of allShapes) {
    points.sort((a, b) => a.seq - b.seq);
  }
  
  // Create output files
  console.log('\n\nCreating output files...');
  
  // 1. bus-stops.json - All stops
  const stopsOutput = {};
  for (const [stopId, data] of allStops) {
    stopsOutput[stopId] = data;
  }
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'bus-stops.json'),
    JSON.stringify(stopsOutput, null, 2)
  );
  console.log(`Created bus-stops.json (${allStops.size} stops)`);
  
  // 2. bus-shapes.json - Route shapes (indexed by route_id)
  const shapesOutput = {};
  for (const [routeId, shapeId] of tripShapes) {
    const points = allShapes.get(shapeId);
    if (points) {
      shapesOutput[routeId] = points.map(p => [p.lat, p.lon]);
    }
  }
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'bus-shapes.json'),
    JSON.stringify(shapesOutput, null, 2)
  );
  console.log(`Created bus-shapes.json (${Object.keys(shapesOutput).length} routes)`);
  
  // 3. bus-route-stops.json - Route -> stop IDs
  const routeStopsOutput = {};
  for (const [routeId, stopIds] of routeStops) {
    routeStopsOutput[routeId] = Array.from(stopIds);
  }
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'bus-route-stops.json'),
    JSON.stringify(routeStopsOutput, null, 2)
  );
  console.log(`Created bus-route-stops.json (${Object.keys(routeStopsOutput).length} routes)`);
  
  console.log('\nDone!');
  
  // Print some stats
  console.log('\n--- Summary ---');
  console.log(`Total stops: ${allStops.size}`);
  console.log(`Total shapes: ${allShapes.size}`);
  console.log(`Total routes with shapes: ${tripShapes.size}`);
  console.log(`Total routes with stops: ${routeStops.size}`);
}

main().catch(console.error);

