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

