/**
 * Bus stops and shapes utilities
 * 
 * Uses pre-processed GTFS data for bus routes:
 * - bus-stops.json: All bus stops with coordinates
 * - bus-shapes.json: Route paths (lat/lon arrays)
 * - bus-route-stops.json: Which stops belong to which route
 */

import busStopsData from "@/data/gtfs/bus-stops.json";
import busShapesData from "@/data/gtfs/bus-shapes.json";
import busRouteStopsData from "@/data/gtfs/bus-route-stops.json";
import { haversineDistance } from "@/lib/utils/distance";
import type { NearbyBusStop, NearbyBusStopGroup } from "@/types/transit";

export const NEARBY_BUS_STOP_GROUP_DISTANCE_MILES = 0.025;

// Type definitions
export interface BusStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface BusRouteData {
  shape: [number, number][]; // Array of [lat, lon] points
  stops: BusStop[];
}

// Typed data
const busStops = busStopsData as Record<string, { name: string; lat: number; lon: number }>;
const busShapes = busShapesData as unknown as Record<string, [number, number][]>;
const busRouteStops = busRouteStopsData as Record<string, string[]>;
let routeIdsByStopCache: Map<string, string[]> | null = null;

function getRouteIdsByStop(): Map<string, string[]> {
  if (routeIdsByStopCache) return routeIdsByStopCache;

  routeIdsByStopCache = new Map();
  for (const [routeId, stopIds] of Object.entries(busRouteStops)) {
    for (const stopId of stopIds) {
      const routes = routeIdsByStopCache.get(stopId) ?? [];
      if (!routes.includes(routeId)) routes.push(routeId);
      routeIdsByStopCache.set(stopId, routes);
    }
  }
  for (const routes of routeIdsByStopCache.values()) routes.sort();
  return routeIdsByStopCache;
}

/**
 * Get the shape (path) for a bus route
 */
export function getBusRouteShape(routeId: string): [number, number][] {
  return busShapes[routeId] || [];
}

/**
 * Get all stops for a bus route with their coordinates
 */
export function getBusRouteStops(routeId: string): BusStop[] {
  const stopIds = busRouteStops[routeId];
  if (!stopIds) return [];
  
  return stopIds
    .map(stopId => {
      const stop = busStops[stopId];
      if (!stop) return null;
      return {
        id: stopId,
        name: stop.name,
        lat: stop.lat,
        lon: stop.lon,
      };
    })
    .filter((s): s is BusStop => s !== null);
}

/**
 * Get complete route data (shape + stops) for a bus route
 */
export function getBusRouteData(routeId: string): BusRouteData {
  return {
    shape: getBusRouteShape(routeId),
    stops: getBusRouteStops(routeId),
  };
}

/**
 * Get a bus stop by ID
 */
export function getBusStop(stopId: string): BusStop | null {
  const stop = busStops[stopId];
  if (!stop) return null;
  return {
    id: stopId,
    name: stop.name,
    lat: stop.lat,
    lon: stop.lon,
  };
}

export function getAllBusStops(): BusStop[] {
  return Object.entries(busStops).map(([id, stop]) => ({ id, ...stop }));
}

/**
 * Stop-first nearby lookup for future rider experiences. Realtime vehicles are
 * intentionally not required to discover stops or the routes serving them.
 */
export function getNearbyBusStops(
  latitude: number,
  longitude: number,
  radiusMiles = 0.5,
  limit = 20,
): NearbyBusStop[] {
  const routeIdsByStop = getRouteIdsByStop();

  return getAllBusStops()
    .map((stop): NearbyBusStop => ({
      id: stop.id,
      stationId: null,
      name: stop.name,
      mode: "bus",
      direction: "unknown",
      location: { latitude: stop.lat, longitude: stop.lon },
      platformCode: null,
      routeIds: routeIdsByStop.get(stop.id) ?? [],
      distanceMiles: haversineDistance(
        latitude,
        longitude,
        stop.lat,
        stop.lon,
      ),
    }))
    .filter((stop) => stop.distanceMiles <= radiusMiles)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, limit);
}

function normalizeStopName(name: string): string {
  return name
    .normalize("NFKC")
    .toUpperCase()
    .replace(/\b(AVENUE|AVE)\b/g, "AV")
    .replace(/\b(STREET)\b/g, "ST")
    .replace(/\b(BOULEVARD|BLVD)\b/g, "BLVD")
    .replace(/\s+/g, " ")
    .trim();
}

function compareNearbyStops(a: NearbyBusStop, b: NearbyBusStop): number {
  return (
    a.distanceMiles - b.distanceMiles ||
    a.name.localeCompare(b.name) ||
    a.id.localeCompare(b.id)
  );
}

export function groupNearbyBusStops(
  inputStops: readonly NearbyBusStop[],
  limit = 6,
): NearbyBusStopGroup[] {
  const groups: Array<{ normalizedName: string; stops: NearbyBusStop[] }> = [];

  for (const stop of [...inputStops].sort(compareNearbyStops)) {
    if (!stop.location) continue;
    const normalizedName = normalizeStopName(stop.name);
    const group = groups.find((candidate) => {
      if (candidate.normalizedName !== normalizedName) return false;
      return candidate.stops.some((member) => member.location && haversineDistance(
        stop.location!.latitude,
        stop.location!.longitude,
        member.location.latitude,
        member.location.longitude,
      ) <= NEARBY_BUS_STOP_GROUP_DISTANCE_MILES);
    });

    if (group) group.stops.push(stop);
    else groups.push({ normalizedName, stops: [stop] });
  }

  return groups
    .map(({ stops }): NearbyBusStopGroup => {
      const sortedStops = [...stops].sort(compareNearbyStops);
      const nearest = sortedStops[0];
      const ids = sortedStops.map((stop) => stop.id).sort();
      return {
        id: `bus-stop-group:${ids.join("+")}`,
        name: nearest.name,
        mode: "bus",
        location: nearest.location!,
        distanceMiles: nearest.distanceMiles,
        routeIds: [...new Set(sortedStops.flatMap((stop) => stop.routeIds))].sort(),
        stops: sortedStops,
      };
    })
    .sort((a, b) => (
      a.distanceMiles - b.distanceMiles ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id)
    ))
    .slice(0, Math.max(0, Math.trunc(limit)));
}

export function getNearbyBusStopGroups(
  latitude: number,
  longitude: number,
  radiusMiles = 0.5,
  limit = 6,
): NearbyBusStopGroup[] {
  // Search beyond the display limit so nearby duplicates cannot crowd out
  // otherwise useful locations before grouping.
  const candidateLimit = Math.max(limit * 8, 48);
  return groupNearbyBusStops(
    getNearbyBusStops(latitude, longitude, radiusMiles, candidateLimit),
    limit,
  );
}

/**
 * Check if we have data for a route
 */
export function hasBusRouteData(routeId: string): boolean {
  return routeId in busShapes || routeId in busRouteStops;
}

/**
 * Get all available route IDs that have shape data
 */
export function getAvailableBusRoutes(): string[] {
  return Object.keys(busShapes);
}
