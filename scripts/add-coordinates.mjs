/**
 * Add lat/lon coordinates to station data files from GTFS stops.txt
 */

import { readFileSync, writeFileSync } from 'fs';

// Parse GTFS stops.txt CSV
function parseStops(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  const stopIdIdx = headers.indexOf('stop_id');
  const latIdx = headers.indexOf('stop_lat');
  const lonIdx = headers.indexOf('stop_lon');
  
  const stops = {};
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple CSV parsing
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/"/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/"/g, ''));
    
    const stopId = values[stopIdIdx];
    const lat = parseFloat(values[latIdx]);
    const lon = parseFloat(values[lonIdx]);
    
    if (stopId && !isNaN(lat) && !isNaN(lon)) {
      stops[stopId] = { lat, lon };
    }
  }
  
  return stops;
}

// Update station JSON with coordinates
function updateStationFile(jsonPath, coordsMap) {
  const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
  let updated = 0;
  let missing = [];
  
  // Update branches
  for (const branchId in data.branches) {
    const branch = data.branches[branchId];
    for (const station of branch.stations) {
      const coords = coordsMap[station.id];
      if (coords) {
        station.lat = coords.lat;
        station.lon = coords.lon;
        updated++;
      } else {
        missing.push(station.id);
      }
    }
  }
  
  // Add coordinates to stationNames map too (as stationCoords)
  data.stationCoords = {};
  for (const [id, coords] of Object.entries(coordsMap)) {
    data.stationCoords[id] = coords;
  }
  
  writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log(`Updated ${updated} stations in ${jsonPath}`);
  if (missing.length > 0) {
    console.log(`Missing coords for: ${[...new Set(missing)].join(', ')}`);
  }
}

// Process Metro-North
console.log('Processing Metro-North...');
const mnrCoords = parseStops('scripts/temp/mnr/stops.txt');
console.log(`Found ${Object.keys(mnrCoords).length} MNR stops with coordinates`);
updateStationFile('data/gtfs/metro-north-stations.json', mnrCoords);

// Process LIRR
console.log('\nProcessing LIRR...');
const lirrCoords = parseStops('scripts/temp/lirr/stops.txt');
console.log(`Found ${Object.keys(lirrCoords).length} LIRR stops with coordinates`);
updateStationFile('data/gtfs/lirr-stations.json', lirrCoords);

// Process Subway
console.log('\nProcessing Subway...');
const subwayCoords = parseStops('scripts/temp/subway/stops.txt');
console.log(`Found ${Object.keys(subwayCoords).length} subway stops with coordinates`);
updateSubwayFile('data/gtfs/line-stations.json', subwayCoords);

console.log('\nDone!');

// Update subway station JSON (different structure)
function updateSubwayFile(jsonPath, coordsMap) {
  const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
  let updated = 0;
  
  // Update each line's stations
  for (const lineId in data) {
    const line = data[lineId];
    if (!line.stations) continue;
    
    for (const station of line.stations) {
      const coords = coordsMap[station.id];
      if (coords) {
        station.lat = coords.lat;
        station.lon = coords.lon;
        updated++;
      }
    }
  }
  
  // Also add a stationCoords map at the root
  data._stationCoords = {};
  for (const [id, coords] of Object.entries(coordsMap)) {
    data._stationCoords[id] = coords;
  }
  
  writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log(`Updated ${updated} stations in ${jsonPath}`);
}

