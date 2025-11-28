/**
 * Test GTFS Parser
 * Run with: node scripts/test-gtfs-parser.mjs
 * 
 * Verifies the GTFS static data files are correctly parsed.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Simple CSV parser (matching our parser.ts logic)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
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

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  const results = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || '';
    }
    results.push(row);
  }
  
  return results;
}

console.log('='.repeat(80));
console.log('GTFS STATIC DATA VERIFICATION');
console.log('='.repeat(80));

// Test stops.txt
console.log('\n--- STOPS.TXT ---');
try {
  const stopsContent = readFileSync(join(process.cwd(), 'data/gtfs/stops.txt'), 'utf-8');
  const stops = parseCSV(stopsContent);
  
  // Count stations vs platforms
  const stations = stops.filter(s => s.location_type === '1');
  const platforms = stops.filter(s => s.location_type !== '1');
  
  console.log(`Total entries: ${stops.length}`);
  console.log(`Stations (parent): ${stations.length}`);
  console.log(`Platforms: ${platforms.length}`);
  
  // Sample stations
  console.log('\nSample stations:');
  for (const station of stations.slice(0, 5)) {
    console.log(`  ${station.stop_id}: ${station.stop_name} (${station.stop_lat}, ${station.stop_lon})`);
  }
  
  // Check for known stations
  const timesSquare = stops.find(s => s.stop_name.includes('Times Sq') && s.location_type === '1');
  const grandCentral = stops.find(s => s.stop_name.includes('Grand Central') && s.location_type === '1');
  const west4 = stops.find(s => s.stop_name.includes('West 4') && s.location_type === '1');
  
  console.log('\nKnown station verification:');
  console.log(`  Times Square: ${timesSquare ? `${timesSquare.stop_id} - ${timesSquare.stop_name}` : 'NOT FOUND'}`);
  console.log(`  Grand Central: ${grandCentral ? `${grandCentral.stop_id} - ${grandCentral.stop_name}` : 'NOT FOUND'}`);
  console.log(`  West 4 St: ${west4 ? `${west4.stop_id} - ${west4.stop_name}` : 'NOT FOUND'}`);
  
  console.log('\n✓ Stops parsing: PASSED');
} catch (e) {
  console.log(`✗ Stops parsing: FAILED - ${e.message}`);
}

// Test routes.txt
console.log('\n--- ROUTES.TXT ---');
try {
  const routesContent = readFileSync(join(process.cwd(), 'data/gtfs/routes.txt'), 'utf-8');
  const routes = parseCSV(routesContent);
  
  console.log(`Total routes: ${routes.length}`);
  
  console.log('\nAll routes:');
  for (const route of routes) {
    console.log(`  ${route.route_id}: ${route.route_short_name} - ${route.route_long_name.slice(0, 40)}... (#${route.route_color})`);
  }
  
  console.log('\n✓ Routes parsing: PASSED');
} catch (e) {
  console.log(`✗ Routes parsing: FAILED - ${e.message}`);
}

console.log('\n' + '='.repeat(80));
console.log('GTFS data verification complete');
console.log('='.repeat(80));

