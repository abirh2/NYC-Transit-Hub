/**
 * MTA API Response Tester
 * Run with: node scripts/test-mta-apis.mjs
 * 
 * This script fetches real data from MTA APIs and outputs the structure
 * to verify our code assumptions are correct.
 */

import https from 'https';
import fs from 'fs';

// Helper to fetch JSON
async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

// Helper to fetch binary (protobuf)
async function fetchBinary(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({
        buffer: Buffer.concat(chunks),
        contentType: res.headers['content-type'],
        size: Buffer.concat(chunks).length
      }));
    }).on('error', reject);
  });
}

// Pretty print object structure (keys only, with sample values)
function printStructure(obj, indent = 0, maxDepth = 3) {
  if (indent > maxDepth) {
    console.log('  '.repeat(indent) + '...(truncated)');
    return;
  }
  
  if (Array.isArray(obj)) {
    console.log('  '.repeat(indent) + `[Array of ${obj.length} items]`);
    if (obj.length > 0) {
      console.log('  '.repeat(indent) + 'First item:');
      printStructure(obj[0], indent + 1, maxDepth);
    }
  } else if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const type = Array.isArray(value) ? 'array' : typeof value;
      if (type === 'object' || type === 'array') {
        console.log('  '.repeat(indent) + `${key}: (${type})`);
        printStructure(value, indent + 1, maxDepth);
      } else {
        const sample = String(value).slice(0, 60);
        console.log('  '.repeat(indent) + `${key}: ${type} = "${sample}"`);
      }
    }
  } else {
    console.log('  '.repeat(indent) + String(obj).slice(0, 100));
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('MTA API RESPONSE VERIFICATION');
  console.log('='.repeat(80));
  
  // 1. Test Alerts JSON API
  console.log('\n\n--- SUBWAY ALERTS (JSON) ---');
  console.log('URL: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts.json');
  try {
    const alerts = await fetchJson('https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts.json');
    console.log('\nResponse structure:');
    printStructure(alerts, 0, 4);
    
    // Save full response for reference
    fs.writeFileSync('scripts/sample-alerts.json', JSON.stringify(alerts, null, 2));
    console.log('\nFull response saved to: scripts/sample-alerts.json');
  } catch (e) {
    console.log('ERROR:', e.message);
  }

  // 2. Test Elevator/Escalator Outages JSON API
  console.log('\n\n--- ELEVATOR OUTAGES (JSON) ---');
  console.log('URL: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene.json');
  try {
    const elevators = await fetchJson('https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene.json');
    console.log('\nResponse structure:');
    printStructure(elevators, 0, 3);
    console.log(`\nTotal outages: ${Array.isArray(elevators) ? elevators.length : 'N/A'}`);
    
    // Save sample
    fs.writeFileSync('scripts/sample-elevators.json', JSON.stringify(elevators, null, 2));
    console.log('Full response saved to: scripts/sample-elevators.json');
  } catch (e) {
    console.log('ERROR:', e.message);
  }

  // 3. Test Equipment List JSON API  
  console.log('\n\n--- ALL EQUIPMENT (JSON) ---');
  console.log('URL: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene_equipments.json');
  try {
    const equipment = await fetchJson('https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene_equipments.json');
    console.log('\nResponse structure:');
    printStructure(equipment, 0, 3);
    console.log(`\nTotal equipment: ${Array.isArray(equipment) ? equipment.length : 'N/A'}`);
  } catch (e) {
    console.log('ERROR:', e.message);
  }

  // 4. Test Subway GTFS-RT (Protobuf)
  console.log('\n\n--- SUBWAY GTFS-RT ACE (PROTOBUF) ---');
  console.log('URL: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace');
  try {
    const { buffer, contentType, size } = await fetchBinary('https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace');
    console.log(`Content-Type: ${contentType}`);
    console.log(`Size: ${size} bytes`);
    console.log(`First 50 bytes (hex): ${buffer.slice(0, 50).toString('hex')}`);
    console.log('\nNote: This is protobuf binary data. Need protobufjs to decode.');
    
    // Save binary for reference
    fs.writeFileSync('scripts/sample-gtfs-ace.bin', buffer);
    console.log('Binary saved to: scripts/sample-gtfs-ace.bin');
  } catch (e) {
    console.log('ERROR:', e.message);
  }

  // 5. Summary of findings
  console.log('\n\n' + '='.repeat(80));
  console.log('KEY FINDINGS - CHECK THESE AGAINST OUR CODE:');
  console.log('='.repeat(80));
  console.log(`
1. ALERTS API:
   - Uses snake_case field names (active_period, route_id, stop_id)
   - NOT camelCase as assumed in our Zod schemas
   - Has MTA-specific extension: transit_realtime.mercury_alert
   
2. ELEVATOR API:
   - Returns ARRAY directly, not { outages: [...] }
   - Field is "equipment" not "equipmentno"
   - Date format: "MM/DD/YYYY HH:MM:SS AM/PM"
   
3. GTFS-RT:
   - Binary protobuf format (not JSON)
   - Requires protobufjs to decode
   - Our proto definition needs verification
`);
  
  console.log('\nTest complete. Review the saved JSON files for full structure.');
}

main().catch(console.error);

