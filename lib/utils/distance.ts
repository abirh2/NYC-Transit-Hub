/**
 * Distance Utilities
 * 
 * Haversine formula for calculating distances between coordinates.
 * Used for finding nearby stations.
 */

const EARTH_RADIUS_MILES = 3958.8; // Earth's radius in miles

/**
 * Calculate the distance between two points using the Haversine formula
 * 
 * @param lat1 - Latitude of first point in degrees
 * @param lon1 - Longitude of first point in degrees
 * @param lat2 - Latitude of second point in degrees
 * @param lon2 - Longitude of second point in degrees
 * @returns Distance in miles
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Convert degrees to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}

/**
 * Station with coordinates and distance
 */
export interface StationWithDistance {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: number; // in miles
  platforms?: {
    north: string | null;
    south: string | null;
  };
}

/**
 * Minimal station interface for input
 */
export interface StationCoordinates {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  platforms?: {
    north: string | null;
    south: string | null;
  };
}

/**
 * Find stations within a given radius and sort by distance
 * 
 * @param stations - Array of stations with coordinates
 * @param userLat - User's latitude
 * @param userLon - User's longitude
 * @param radiusMiles - Maximum radius in miles (default: 1)
 * @param limit - Maximum number of stations to return (default: 10)
 * @returns Stations sorted by distance, closest first
 */
export function findNearbyStations(
  stations: StationCoordinates[],
  userLat: number,
  userLon: number,
  radiusMiles: number = 1,
  limit: number = 10
): StationWithDistance[] {
  const stationsWithDistance: StationWithDistance[] = [];

  for (const station of stations) {
    // Skip stations without valid coordinates
    if (
      station.latitude === null ||
      station.longitude === null ||
      station.latitude === undefined ||
      station.longitude === undefined
    ) {
      continue;
    }

    const distance = haversineDistance(
      userLat,
      userLon,
      station.latitude,
      station.longitude
    );

    // Only include stations within radius
    if (distance <= radiusMiles) {
      stationsWithDistance.push({
        id: station.id,
        name: station.name,
        latitude: station.latitude,
        longitude: station.longitude,
        distance,
        platforms: station.platforms,
      });
    }
  }

  // Sort by distance (closest first) and limit results
  return stationsWithDistance
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/**
 * Format distance for display
 * 
 * @param miles - Distance in miles
 * @returns Formatted string (e.g., "0.2 mi", "1.5 mi")
 */
export function formatDistance(miles: number): string {
  if (miles < 0.1) {
    // Show in feet for very short distances
    const feet = Math.round(miles * 5280);
    return `${feet} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

/**
 * Calculate walking time estimate based on distance
 * Assumes average walking speed of 3 mph (20 minutes per mile)
 * 
 * @param miles - Distance in miles
 * @returns Estimated walking time in minutes
 */
export function estimateWalkingTime(miles: number): number {
  const MINUTES_PER_MILE = 20;
  return Math.ceil(miles * MINUTES_PER_MILE);
}

/**
 * Format walking time for display
 * 
 * @param minutes - Walking time in minutes
 * @returns Formatted string (e.g., "2 min walk", "15 min walk")
 */
export function formatWalkingTime(minutes: number): string {
  if (minutes < 1) {
    return "< 1 min walk";
  }
  return `${minutes} min walk`;
}

