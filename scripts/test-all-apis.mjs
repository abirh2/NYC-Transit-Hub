/**
 * Comprehensive API Test Script
 * Run with: node scripts/test-all-apis.mjs
 * 
 * Tests all API endpoints against the running dev server.
 * Make sure the dev server is running on localhost:3000
 */

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(name, url, validator) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.log(`  ✗ ${name}: HTTP ${response.status}`);
      console.log(`    Error: ${data.error || 'Unknown error'}`);
      return false;
    }
    
    if (data.success === false) {
      console.log(`  ✗ ${name}: API returned error`);
      console.log(`    Error: ${data.error}`);
      return false;
    }
    
    const validationResult = validator(data);
    if (validationResult === true) {
      console.log(`  ✓ ${name}: PASSED`);
      return true;
    } else {
      console.log(`  ✗ ${name}: Validation failed - ${validationResult}`);
      return false;
    }
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('NYC TRANSIT HUB - API TEST SUITE');
  console.log('='.repeat(80));
  console.log(`Testing against: ${BASE_URL}`);
  console.log('');

  let passed = 0;
  let failed = 0;

  // Test 1: Stations API
  console.log('\n--- STATIONS API ---');
  
  if (await testEndpoint(
    'GET /api/stations',
    `${BASE_URL}/api/stations?limit=5`,
    (data) => {
      if (!data.data?.stations?.length) return 'No stations returned';
      const station = data.data.stations[0];
      if (!station.id || !station.name) return 'Station missing id or name';
      return true;
    }
  )) passed++; else failed++;

  if (await testEndpoint(
    'GET /api/stations?search=times',
    `${BASE_URL}/api/stations?search=times`,
    (data) => {
      if (!data.data?.stations?.length) return 'No stations found';
      const hasTimesSquare = data.data.stations.some(s => s.name.includes('Times'));
      if (!hasTimesSquare) return 'Times Square not found';
      console.log(`    Found ${data.data.stations.length} stations matching "times"`);
      return true;
    }
  )) passed++; else failed++;

  // Test 2: Routes API
  console.log('\n--- ROUTES API ---');
  
  if (await testEndpoint(
    'GET /api/routes',
    `${BASE_URL}/api/routes`,
    (data) => {
      if (!data.data?.routes?.length) return 'No routes returned';
      console.log(`    Found ${data.data.routes.length} routes`);
      return true;
    }
  )) passed++; else failed++;

  if (await testEndpoint(
    'GET /api/routes?id=A',
    `${BASE_URL}/api/routes?id=A`,
    (data) => {
      if (!data.data?.routes?.length) return 'A train not found';
      const route = data.data.routes[0];
      if (route.id !== 'A') return 'Wrong route returned';
      console.log(`    A train: ${route.longName.slice(0, 50)}...`);
      return true;
    }
  )) passed++; else failed++;

  // Test 3: Alerts API (fetches from live MTA feed)
  console.log('\n--- ALERTS API (Live MTA Data) ---');
  
  if (await testEndpoint(
    'GET /api/alerts',
    `${BASE_URL}/api/alerts?limit=3`,
    (data) => {
      // Alerts might be empty on a good service day
      console.log(`    Found ${data.data?.alerts?.length || 0} alerts`);
      if (data.data?.alerts?.length > 0) {
        const alert = data.data.alerts[0];
        console.log(`    Sample: [${alert.affectedRoutes?.join(',')}] ${alert.headerText?.slice(0, 50)}...`);
      }
      return true;
    }
  )) passed++; else failed++;

  // Test 4: Elevators API (fetches from live MTA feed)
  console.log('\n--- ELEVATORS API (Live MTA Data) ---');
  
  if (await testEndpoint(
    'GET /api/elevators',
    `${BASE_URL}/api/elevators?limit=3`,
    (data) => {
      console.log(`    Found ${data.data?.totalOutages || 0} outages`);
      if (data.data?.equipment?.length > 0) {
        const eq = data.data.equipment[0];
        console.log(`    Sample: ${eq.stationName} - ${eq.equipmentType} (${eq.outageReason || 'N/A'})`);
      }
      return true;
    }
  )) passed++; else failed++;

  // Test 5: Status API
  console.log('\n--- STATUS API ---');
  
  if (await testEndpoint(
    'GET /api/status',
    `${BASE_URL}/api/status`,
    (data) => {
      if (!data.data?.feeds) return 'No feeds in status';
      console.log(`    Overall health: ${data.data.overallHealth}`);
      console.log(`    Feeds: ${data.data.feeds.map(f => f.id).join(', ')}`);
      return true;
    }
  )) passed++; else failed++;

  // Test 6: Trains Realtime API (fetches from live MTA feed)
  console.log('\n--- TRAINS REALTIME API (Live MTA Data) ---');
  
  if (await testEndpoint(
    'GET /api/trains/realtime',
    `${BASE_URL}/api/trains/realtime?limit=5`,
    (data) => {
      console.log(`    Found ${data.data?.arrivals?.length || 0} arrivals`);
      if (data.data?.arrivals?.length > 0) {
        const arrival = data.data.arrivals[0];
        console.log(`    Sample: ${arrival.routeId} train at ${arrival.stopId} in ${arrival.minutesAway} min`);
      }
      return true;
    }
  )) passed++; else failed++;

  // Test 7: Buses API (requires API key)
  console.log('\n--- BUSES API ---');
  
  // Special handling for buses - 503 with "not configured" is expected
  try {
    const busResponse = await fetch(`${BASE_URL}/api/buses/realtime?limit=3`);
    const busData = await busResponse.json();
    
    if (busResponse.status === 503 && busData.error?.includes('not configured')) {
      console.log(`  ✓ GET /api/buses/realtime: PASSED (API key not configured - expected)`);
      passed++;
    } else if (busData.success) {
      console.log(`  ✓ GET /api/buses/realtime: PASSED`);
      console.log(`    Found ${busData.data?.arrivals?.length || 0} bus arrivals`);
      passed++;
    } else {
      console.log(`  ✗ GET /api/buses/realtime: ${busData.error}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ✗ GET /api/buses/realtime: ${e.message}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${passed + failed}`);
  console.log('');
  
  if (failed === 0) {
    console.log('✓ ALL TESTS PASSED');
  } else {
    console.log(`✗ ${failed} TEST(S) FAILED`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Test script error:', e.message);
  console.log('\nMake sure the dev server is running: npm run dev');
  process.exit(1);
});

