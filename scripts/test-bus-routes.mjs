/**
 * Test script to fetch actual bus route data from MTA API
 * Run with: node scripts/test-bus-routes.mjs
 */

import 'dotenv/config';

const BUS_API_KEY = process.env.MTA_BUS_API_KEY;

console.log('=== MTA Bus Routes Test ===\n');
console.log('Bus API Key configured:', !!BUS_API_KEY);

if (!BUS_API_KEY) {
  console.log('\nNo MTA_BUS_API_KEY found. Checking if we can use the internal API...\n');
}

// Test the direct MTA Bus Time API
async function testMtaBusApi() {
  if (!BUS_API_KEY) {
    console.log('Skipping direct MTA API test - no API key\n');
    return null;
  }
  
  console.log('\n--- Testing MTA Bus GTFS-RT Feed ---\n');
  
  const tripUpdatesUrl = `https://gtfsrt.prod.obanyc.com/tripUpdates?key=${BUS_API_KEY}`;
  
  try {
    // Fetch trip updates to see active routes
    console.log('Fetching trip updates...');
    const response = await fetch(tripUpdatesUrl, {
      headers: { 'Accept': 'application/x-protobuf' }
    });
    
    if (!response.ok) {
      console.log('Failed to fetch:', response.status, response.statusText);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    console.log('Received buffer size:', buffer.byteLength, 'bytes');
    console.log('\nNote: This is protobuf data that needs parsing.\n');
    
    return buffer;
  } catch (error) {
    console.log('Error fetching MTA bus data:', error.message);
    return null;
  }
}

// Check MTA's static GTFS data for bus routes
async function fetchStaticBusRoutes() {
  console.log('\n--- Fetching MTA Static GTFS Bus Routes ---\n');
  
  // MTA provides static GTFS data including routes.txt
  // The bus GTFS is available at: http://web.mta.info/developers/data/nyct/bus/google_transit.zip
  // But we can also check the MTA developer resources
  
  console.log('MTA Static GTFS Bus data is available at:');
  console.log('- http://web.mta.info/developers/data/nyct/bus/google_transit.zip');
  console.log('- This contains routes.txt with all official route IDs\n');
  
  // Let's try to get the routes from a simpler source - the MTA API might have a routes endpoint
  // Actually, let's check the BusTime SIRI API which might give us route info
  
  if (!BUS_API_KEY) {
    console.log('No API key - cannot fetch route list\n');
    return;
  }
  
  // Try the SIRI vehicle monitoring to see active routes
  const siriUrl = `https://bustime.mta.info/api/siri/vehicle-monitoring.json?key=${BUS_API_KEY}&MaximumVehicles=500`;
  
  try {
    console.log('Trying SIRI Vehicle Monitoring API...');
    const response = await fetch(siriUrl);
    
    if (!response.ok) {
      console.log('SIRI API failed:', response.status);
      return;
    }
    
    const data = await response.json();
    
    // Extract unique route IDs from active vehicles
    const routes = new Set();
    const delivery = data?.Siri?.ServiceDelivery?.VehicleMonitoringDelivery;
    
    if (delivery && delivery[0]?.VehicleActivity) {
      for (const activity of delivery[0].VehicleActivity) {
        const lineRef = activity?.MonitoredVehicleJourney?.LineRef;
        if (lineRef) {
          // LineRef format is like "MTA NYCT_M15" - extract just the route part
          const routeId = lineRef.split('_').pop();
          routes.add(routeId);
        }
      }
    }
    
    const sortedRoutes = Array.from(routes).sort((a, b) => {
      // Custom sort: by prefix then number
      const aPrefix = a.match(/^[A-Za-z]+/)?.[0] || '';
      const bPrefix = b.match(/^[A-Za-z]+/)?.[0] || '';
      if (aPrefix !== bPrefix) return aPrefix.localeCompare(bPrefix);
      const aNum = parseInt(a.replace(/^[A-Za-z]+/, '')) || 0;
      const bNum = parseInt(b.replace(/^[A-Za-z]+/, '')) || 0;
      return aNum - bNum;
    });
    
    console.log(`\nFound ${sortedRoutes.length} active bus routes:\n`);
    
    // Group by prefix
    const byPrefix = {};
    for (const route of sortedRoutes) {
      const prefix = route.match(/^[A-Za-z]+/)?.[0] || 'Other';
      if (!byPrefix[prefix]) byPrefix[prefix] = [];
      byPrefix[prefix].push(route);
    }
    
    for (const [prefix, routeList] of Object.entries(byPrefix)) {
      console.log(`${prefix}: ${routeList.join(', ')}`);
    }
    
    console.log('\n--- Sample Vehicle Data ---\n');
    if (delivery && delivery[0]?.VehicleActivity?.slice(0, 3)) {
      for (const activity of delivery[0].VehicleActivity.slice(0, 3)) {
        const journey = activity.MonitoredVehicleJourney;
        console.log({
          routeId: journey?.LineRef?.split('_').pop(),
          direction: journey?.DirectionRef,
          destination: journey?.DestinationName,
          vehicleId: journey?.VehicleRef,
          latitude: journey?.VehicleLocation?.Latitude,
          longitude: journey?.VehicleLocation?.Longitude,
        });
      }
    }
    
    return sortedRoutes;
  } catch (error) {
    console.log('Error:', error.message);
  }
}

// Also try to get stop monitoring for a specific route
async function testStopMonitoring(routeId = 'M15') {
  if (!BUS_API_KEY) return;
  
  console.log(`\n--- Testing Stop Monitoring for ${routeId} ---\n`);
  
  const url = `https://bustime.mta.info/api/siri/stop-monitoring.json?key=${BUS_API_KEY}&LineRef=MTA%20NYCT_${routeId}&MaximumStopVisits=5`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log('Failed:', response.status);
      return;
    }
    
    const data = await response.json();
    const delivery = data?.Siri?.ServiceDelivery?.StopMonitoringDelivery;
    
    if (delivery && delivery[0]?.MonitoredStopVisit) {
      console.log(`Found ${delivery[0].MonitoredStopVisit.length} stop visits for ${routeId}`);
      
      // Show sample
      const visit = delivery[0].MonitoredStopVisit[0];
      if (visit) {
        console.log('\nSample stop visit:', {
          stopId: visit.MonitoredVehicleJourney?.MonitoredCall?.StopPointRef,
          stopName: visit.MonitoredVehicleJourney?.MonitoredCall?.StopPointName,
          arrivalTime: visit.MonitoredVehicleJourney?.MonitoredCall?.ExpectedArrivalTime,
          destination: visit.MonitoredVehicleJourney?.DestinationName,
        });
      }
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
}

// Run tests
async function main() {
  await testMtaBusApi();
  const routes = await fetchStaticBusRoutes();
  
  if (routes && routes.length > 0) {
    // Test with a real route
    await testStopMonitoring(routes[0]);
  }
  
  console.log('\n=== Test Complete ===\n');
}

main().catch(console.error);

