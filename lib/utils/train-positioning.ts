/**
 * Smart Train Positioning Utilities
 *
 * Helper functions for calculating train positions on a map
 * based on ETA and station geography.
 */

import type { TransitMode } from "@/types/mta";

// Station with coordinates
export interface StationWithCoords {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type?: string;
}

// Station distance info
export interface StationDistanceInfo {
  cumulative: number; // Distance from start of line in km
  toNext: number; // Distance to next station in km
}

/**
 * Calculate geographic distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate cumulative distance for each station along the line
 * Returns a map of stationId -> { cumulative, toNext }
 */
export function calculateStationDistances(
  stations: StationWithCoords[]
): Map<string, StationDistanceInfo> {
  const distances = new Map<string, StationDistanceInfo>();
  let cumulative = 0;

  for (let i = 0; i < stations.length; i++) {
    const station = stations[i];
    let toNext = 0;

    if (i < stations.length - 1) {
      const next = stations[i + 1];
      if (station.lat && station.lon && next.lat && next.lon) {
        toNext = getDistanceKm(station.lat, station.lon, next.lat, next.lon);
      }
    }

    distances.set(station.id, { cumulative, toNext });
    cumulative += toNext;
  }

  return distances;
}

/**
 * Estimate travel time between stations based on distance and mode
 * Subway averages ~30 km/h, Regional rail ~50-60 km/h
 */
export function estimateTravelTimeMinutes(
  distanceKm: number,
  mode: TransitMode
): number {
  // Average speeds in km per minute
  const avgSpeedKmPerMin = mode === "subway" ? 0.5 : 0.85; // 30 km/h vs 51 km/h
  const time = distanceKm / avgSpeedKmPerMin;
  // Minimum 1.5 minutes per station (includes stop time)
  return Math.max(1.5, time);
}

/**
 * Smart train position interpolation
 *
 * Positions trains proportionally along the line based on:
 * 1. Their next stop
 * 2. Minutes until arrival
 * 3. Estimated travel times between stations (based on distance)
 *
 * For trains far from their next stop, walks back through multiple stations
 * 
 * Special handling for terminal stations:
 * - Outbound trains at terminal (Grand Central/Penn Station) are WAITING to depart,
 *   not traveling toward the terminal. Position them at the terminal.
 */
export function interpolateTrainPosition(
  nextStopId: string,
  minutesAway: number,
  direction: string,
  stations: StationWithCoords[],
  stationDistances: Map<string, StationDistanceInfo>,
  mode: TransitMode
): [number, number] | null {
  const stationIndex = stations.findIndex((s) => s.id === nextStopId);
  if (stationIndex === -1) return null;

  const nextStation = stations[stationIndex];
  if (!nextStation.lat || !nextStation.lon) return null;

  // If arriving very soon, position at the station
  if (minutesAway <= 0.5) {
    return [nextStation.lat, nextStation.lon];
  }

  // Special case for regional rail: outbound trains at terminal haven't departed yet
  // They're waiting at Grand Central/Penn Station - don't show them on the live tracker
  // Terminal is typically at the start of the station list (index 0)
  if ((mode === "metro-north" || mode === "lirr") && direction === "outbound") {
    const isTerminal = stationIndex === 0 || 
      nextStation.name?.toLowerCase().includes("grand central") ||
      nextStation.name?.toLowerCase().includes("penn station");
    
    if (isTerminal) {
      // Train hasn't departed yet - return null to exclude from map
      return null;
    }
  }

  // Determine which direction to look for the "previous" station (where train came from)
  // 
  // For subway: stations are typically ordered south to north
  // - "N" (northbound) trains are moving toward higher indices, so came from lower indices
  // - "S" (southbound) trains are moving toward lower indices, so came from higher indices
  //
  // For regional rail: 
  // - "inbound" trains are heading toward the terminal (typically at start of list)
  // - "outbound" trains are heading away from terminal
  //
  // step = direction to look for previous position:
  // - Negative step = look at earlier (lower) indices
  // - Positive step = look at later (higher) indices
  const isHeadingTowardEnd = direction === "N" || direction === "outbound";
  const step = isHeadingTowardEnd ? -1 : 1;

  // Walk back through stations to find where the train should be positioned
  let remainingMinutes = minutesAway;
  let currentIdx = stationIndex;

  while (remainingMinutes > 0) {
    const prevIdx = currentIdx + step;

    // If we've gone past the end of the line, position at the last valid station
    if (prevIdx < 0 || prevIdx >= stations.length) {
      const edgeStation = stations[currentIdx];
      return edgeStation.lat && edgeStation.lon
        ? [edgeStation.lat, edgeStation.lon]
        : null;
    }

    const currentStation = stations[currentIdx];
    const prevStation = stations[prevIdx];

    if (!prevStation.lat || !prevStation.lon) {
      break;
    }

    // Calculate travel time for this segment
    const segmentDist = getDistanceKm(
      currentStation.lat,
      currentStation.lon,
      prevStation.lat,
      prevStation.lon
    );
    const segmentTime = estimateTravelTimeMinutes(segmentDist, mode);

    // If remaining time is less than this segment, interpolate within it
    if (remainingMinutes <= segmentTime) {
      // Progress: 0 = at prevStation, 1 = at currentStation (next stop)
      const progress = 1 - remainingMinutes / segmentTime;
      const clampedProgress = Math.max(0, Math.min(1, progress));

      const lat =
        prevStation.lat +
        (currentStation.lat - prevStation.lat) * clampedProgress;
      const lon =
        prevStation.lon +
        (currentStation.lon - prevStation.lon) * clampedProgress;

      return [lat, lon];
    }

    // Subtract this segment's time and move to the next segment
    remainingMinutes -= segmentTime;
    currentIdx = prevIdx;
  }

  // Fallback: position at the furthest station we reached
  const fallbackStation = stations[currentIdx];
  return fallbackStation.lat && fallbackStation.lon
    ? [fallbackStation.lat, fallbackStation.lon]
    : null;
}

/**
 * Stagger train positions to prevent overlap
 *
 * When multiple trains are close together, spreads them along the track
 * direction to make markers more visible. Keeps trains on the line by only
 * adjusting along the track, not perpendicular to it.
 */
export function staggerTrainPositions<T extends { minutesAway: number; direction: string }>(
  positions: Array<{ train: T; position: [number, number] }>,
  minSeparationKm: number = 0.4
): Array<{ train: T; position: [number, number] }> {
  if (positions.length <= 1) return positions;

  // Sort by arrival time so trains arriving sooner are closer to destination
  const sorted = [...positions].sort((a, b) => a.train.minutesAway - b.train.minutesAway);

  const result: Array<{ train: T; position: [number, number] }> = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    let adjustedPosition = current.position;

    // Check if too close to any previously placed train
    for (const placed of result) {
      const dist = getDistanceKm(
        adjustedPosition[0],
        adjustedPosition[1],
        placed.position[0],
        placed.position[1]
      );

      if (dist < minSeparationKm) {
        // Only offset along the track direction (based on arrival time difference)
        // This keeps trains on the line while spreading them out
        const timeDiff = Math.max(0.5, current.train.minutesAway - placed.train.minutesAway);
        const trackOffset = timeDiff * 0.0005; // ~50m per minute difference
        
        // Direction determines which way to offset
        const directionMultiplier =
          current.train.direction === "N" || current.train.direction === "inbound"
            ? -1  // Offset backward (south/west) for trains heading north/inbound
            : 1;  // Offset backward (north/east) for trains heading south/outbound

        adjustedPosition = [
          adjustedPosition[0] + trackOffset * directionMultiplier,
          adjustedPosition[1] + trackOffset * directionMultiplier * 0.5, // Slight lon offset
        ];
      }
    }

    result.push({ train: current.train, position: adjustedPosition });
  }

  return result;
}

