#!/usr/bin/env node
/**
 * MTA Subway Hourly Ridership Pattern Generator
 * 
 * Fetches the last 4 weeks of ridership data from MTA's Open Data API
 * and generates normalized demand patterns by hour and day-of-week.
 * 
 * API: https://data.ny.gov/resource/wujg-7c2s.json
 * Docs: https://www.mta.info/article/dodge-crowd
 * 
 * Usage: node scripts/update-demand-patterns.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const MTA_RIDERSHIP_API = 'https://data.ny.gov/resource/wujg-7c2s.json';
const OUTPUT_FILE = path.join(__dirname, '../data/crowding/demand-patterns.json');
const WEEKS_TO_FETCH = 4;

// ============================================================================
// Fetch Ridership Data
// ============================================================================

async function fetchRidershipData() {
  console.log('📊 Fetching MTA Hourly Ridership data...\n');

  // Calculate date 4 weeks ago
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - (WEEKS_TO_FETCH * 7));
  const startDate = fourWeeksAgo.toISOString().split('T')[0];

  console.log(`📅 Fetching data from ${startDate} to now\n`);

  // SoQL query: aggregate by station_complex, hour, and day of week
  const query = new URLSearchParams({
    $where: `transit_timestamp >= '${startDate}T00:00:00'`,
    $select: [
      'station_complex',
      'date_extract_hh(transit_timestamp) as hour',
      'date_extract_dow(transit_timestamp) as day_of_week',
      'avg(ridership) as avg_ridership'
    ].join(','),
    $group: 'station_complex,hour,day_of_week',
    $limit: '100000', // Get all results
  });

  const url = `${MTA_RIDERSHIP_API}?${query}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data.length} aggregated data points\n`);
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching ridership data:', error.message);
    process.exit(1);
  }
}

// ============================================================================
// Process and Normalize Data
// ============================================================================

function processRidershipData(rawData) {
  console.log('🔄 Processing and normalizing data...\n');

  // Group by station_complex -> day_of_week -> hour -> avg_ridership
  const stationPatterns = {};

  for (const row of rawData) {
    const station = row.station_complex;
    const hour = parseInt(row.hour, 10);
    const dayOfWeek = parseInt(row.day_of_week, 10);
    const avgRidership = parseFloat(row.avg_ridership);

    if (!stationPatterns[station]) {
      stationPatterns[station] = {};
    }

    if (!stationPatterns[station][dayOfWeek]) {
      stationPatterns[station][dayOfWeek] = {};
    }

    stationPatterns[station][dayOfWeek][hour] = avgRidership;
  }

  // Find max ridership across all stations/times for normalization
  let maxRidership = 0;
  for (const station in stationPatterns) {
    for (const day in stationPatterns[station]) {
      for (const hour in stationPatterns[station][day]) {
        const ridership = stationPatterns[station][day][hour];
        if (ridership > maxRidership) {
          maxRidership = ridership;
        }
      }
    }
  }

  console.log(`📈 Max ridership found: ${maxRidership.toFixed(0)}\n`);

  // Normalize to 0-1 scale
  const normalizedPatterns = {};

  for (const station in stationPatterns) {
    normalizedPatterns[station] = {};

    for (const day in stationPatterns[station]) {
      normalizedPatterns[station][day] = {};

      for (const hour in stationPatterns[station][day]) {
        const ridership = stationPatterns[station][day][hour];
        normalizedPatterns[station][day][hour] = parseFloat(
          (ridership / maxRidership).toFixed(3)
        );
      }
    }
  }

  return {
    patterns: normalizedPatterns,
    metadata: {
      maxRidership,
      stationCount: Object.keys(normalizedPatterns).length,
      generatedAt: new Date().toISOString(),
      dataRange: `Last ${WEEKS_TO_FETCH} weeks`,
    }
  };
}

// ============================================================================
// Generate Rush Hour Multipliers
// ============================================================================

function generateRushHourInfo(patterns) {
  // Define typical rush hour periods
  const rushHours = {
    weekday_morning: { hours: [7, 8, 9], days: [1, 2, 3, 4, 5] },
    weekday_evening: { hours: [17, 18, 19], days: [1, 2, 3, 4, 5] },
    weekend_midday: { hours: [12, 13, 14, 15], days: [0, 6] },
  };

  // Calculate average demand during rush hours vs off-peak
  let rushTotal = 0;
  let rushCount = 0;
  let offPeakTotal = 0;
  let offPeakCount = 0;

  for (const station in patterns) {
    for (const day in patterns[station]) {
      const dayNum = parseInt(day, 10);
      for (const hour in patterns[station][day]) {
        const hourNum = parseInt(hour, 10);
        const demand = patterns[station][day][hour];

        // Check if this is rush hour
        let isRush = false;
        for (const period in rushHours) {
          const { hours, days } = rushHours[period];
          if (days.includes(dayNum) && hours.includes(hourNum)) {
            isRush = true;
            break;
          }
        }

        if (isRush) {
          rushTotal += demand;
          rushCount++;
        } else {
          offPeakTotal += demand;
          offPeakCount++;
        }
      }
    }
  }

  const avgRush = rushTotal / rushCount;
  const avgOffPeak = offPeakTotal / offPeakCount;
  const rushMultiplier = avgRush / avgOffPeak;

  return {
    rushHours,
    avgRushDemand: parseFloat(avgRush.toFixed(3)),
    avgOffPeakDemand: parseFloat(avgOffPeak.toFixed(3)),
    rushMultiplier: parseFloat(rushMultiplier.toFixed(2)),
  };
}

// ============================================================================
// Save Output
// ============================================================================

function savePatterns(data) {
  console.log('💾 Saving patterns to file...\n');

  // Create output directory if it doesn't exist
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write JSON file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));

  console.log(`✅ Patterns saved to: ${OUTPUT_FILE}\n`);
  console.log('📊 Summary:');
  console.log(`   - Stations: ${data.metadata.stationCount}`);
  console.log(`   - Generated: ${data.metadata.generatedAt}`);
  console.log(`   - Rush hour multiplier: ${data.rushHourInfo.rushMultiplier}x\n`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('🚇 MTA Subway Hourly Ridership Pattern Generator\n');
  console.log('='.repeat(50) + '\n');

  try {
    // Step 1: Fetch raw data
    const rawData = await fetchRidershipData();

    // Step 2: Process and normalize
    const { patterns, metadata } = processRidershipData(rawData);

    // Step 3: Generate rush hour info
    const rushHourInfo = generateRushHourInfo(patterns);

    // Step 4: Save output
    const output = {
      patterns,
      rushHourInfo,
      metadata,
    };

    savePatterns(output);

    console.log('✨ Done!\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();

