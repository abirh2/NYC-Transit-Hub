/**
 * Real-Time Travel Time Calculator
 * 
 * Uses GTFS-RT feeds to calculate actual travel times between stations
 * based on current train positions and arrival predictions.
 */

import type { TrainArrival } from "@/types/mta";

// ============================================================================
// Types
// ============================================================================

export interface RealtimeTravelTime {
  fromStationId: string;
  toStationId: string;
  line: string;
  travelMinutes: number;
  sampleCount: number;
  timestamp: Date;
}

interface TravelTimeCache {
  times: Map<string, RealtimeTravelTime>;
  lastUpdated: Date;
}

// ============================================================================
// Constants
// ============================================================================

// Cache duration in milliseconds (30 seconds)
const CACHE_DURATION_MS = 30 * 1000;

// Minimum samples needed to consider travel time reliable
const MIN_SAMPLES = 1;

// ============================================================================
// Cache
// ============================================================================

const travelTimeCache: TravelTimeCache = {
  times: new Map(),
  lastUpdated: new Date(0),
};

/**
 * Generate cache key for an edge
 */
function getEdgeKey(fromStationId: string, toStationId: string, line: string): string {
  return `${fromStationId}-${toStationId}-${line}`;
}

// ============================================================================
// Travel Time Calculation
// ============================================================================

/**
 * Calculate travel times from arrival data
 * 
 * Takes a list of arrivals and calculates the actual travel time
 * between consecutive stations based on arrival times.
 */
export function calculateTravelTimes(
  arrivals: TrainArrival[]
): Map<string, number> {
  const times = new Map<string, number>();
  
  // Group arrivals by trip
  const tripArrivals = new Map<string, TrainArrival[]>();
  for (const arrival of arrivals) {
    if (!tripArrivals.has(arrival.tripId)) {
      tripArrivals.set(arrival.tripId, []);
    }
    tripArrivals.get(arrival.tripId)!.push(arrival);
  }
  
  // For each trip, calculate travel times between consecutive stops
  for (const [, tripStops] of tripArrivals) {
    // Sort by arrival time
    tripStops.sort((a, b) => a.arrivalTime.getTime() - b.arrivalTime.getTime());
    
    for (let i = 0; i < tripStops.length - 1; i++) {
      const from = tripStops[i];
      const to = tripStops[i + 1];
      
      // Calculate travel time in minutes
      const timeDiff = (to.arrivalTime.getTime() - from.arrivalTime.getTime()) / 60000;
      
      // Only use reasonable travel times (1-15 minutes between stations)
      if (timeDiff >= 1 && timeDiff <= 15) {
        const key = getEdgeKey(from.stopId, to.stopId, from.routeId);
        
        // Average with existing time if we have one
        if (times.has(key)) {
          const existing = times.get(key)!;
          times.set(key, (existing + timeDiff) / 2);
        } else {
          times.set(key, timeDiff);
        }
      }
    }
  }
  
  return times;
}

/**
 * Update travel time cache with new arrivals data
 */
export function updateTravelTimeCache(arrivals: TrainArrival[]): void {
  const newTimes = calculateTravelTimes(arrivals);
  
  for (const [key, minutes] of newTimes) {
    const [fromId, toId, line] = key.split("-");
    
    const existing = travelTimeCache.times.get(key);
    
    if (existing) {
      // Exponential moving average for smoother updates
      const alpha = 0.3;
      existing.travelMinutes = alpha * minutes + (1 - alpha) * existing.travelMinutes;
      existing.sampleCount++;
      existing.timestamp = new Date();
    } else {
      travelTimeCache.times.set(key, {
        fromStationId: fromId,
        toStationId: toId,
        line,
        travelMinutes: minutes,
        sampleCount: 1,
        timestamp: new Date(),
      });
    }
  }
  
  travelTimeCache.lastUpdated = new Date();
}

/**
 * Get cached travel times as a map for routing
 */
export function getCachedTravelTimes(): Map<string, number> | undefined {
  const now = new Date();
  const cacheAge = now.getTime() - travelTimeCache.lastUpdated.getTime();
  
  // Return undefined if cache is stale
  if (cacheAge > CACHE_DURATION_MS) {
    return undefined;
  }
  
  const result = new Map<string, number>();
  
  for (const [key, data] of travelTimeCache.times) {
    if (data.sampleCount >= MIN_SAMPLES) {
      result.set(key, data.travelMinutes);
    }
  }
  
  return result.size > 0 ? result : undefined;
}

/**
 * Get travel time for a specific edge
 */
export function getTravelTime(
  fromStationId: string,
  toStationId: string,
  line: string
): number | undefined {
  const key = getEdgeKey(fromStationId, toStationId, line);
  const cached = travelTimeCache.times.get(key);
  
  if (!cached) return undefined;
  
  // Check if cache is stale
  const age = Date.now() - cached.timestamp.getTime();
  if (age > CACHE_DURATION_MS) {
    return undefined;
  }
  
  return cached.travelMinutes;
}

/**
 * Clear the travel time cache
 */
export function clearTravelTimeCache(): void {
  travelTimeCache.times.clear();
  travelTimeCache.lastUpdated = new Date(0);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  entryCount: number;
  lastUpdated: Date;
  isStale: boolean;
} {
  const now = new Date();
  const cacheAge = now.getTime() - travelTimeCache.lastUpdated.getTime();
  
  return {
    entryCount: travelTimeCache.times.size,
    lastUpdated: travelTimeCache.lastUpdated,
    isStale: cacheAge > CACHE_DURATION_MS,
  };
}

// ============================================================================
// Fetch and Update
// ============================================================================

/**
 * Fetch arrivals and update travel time cache
 * This should be called periodically to keep the cache fresh.
 */
export async function refreshTravelTimes(
  fetchArrivals: () => Promise<TrainArrival[]>
): Promise<void> {
  try {
    const arrivals = await fetchArrivals();
    updateTravelTimeCache(arrivals);
  } catch (error) {
    console.error("Failed to refresh travel times:", error);
    // Don't throw - let routing continue with static estimates
  }
}

