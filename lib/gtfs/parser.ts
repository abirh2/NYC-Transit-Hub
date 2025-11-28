/**
 * GTFS Static Data Parser
 * 
 * Parses MTA GTFS static feed files (stops.txt, routes.txt)
 * Data source: http://web.mta.info/developers/data/nyct/subway/google_transit.zip
 * 
 * Files are stored in /data/gtfs/ directory
 */

import { readFileSync } from "fs";
import { join } from "path";

// ============================================================================
// Types
// ============================================================================

export interface GtfsStop {
  stopId: string;
  stopName: string;
  stopLat: number;
  stopLon: number;
  locationType: number; // 1 = station, 0 or empty = platform
  parentStation: string | null;
}

export interface GtfsRoute {
  routeId: string;
  agencyId: string;
  routeShortName: string;
  routeLongName: string;
  routeDesc: string;
  routeType: number;
  routeUrl: string;
  routeColor: string;
  routeTextColor: string;
  routeSortOrder: number;
}

export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  platforms: {
    north: string | null;
    south: string | null;
  };
}

// ============================================================================
// CSV Parsing
// ============================================================================

function parseCSV<T>(content: string, mapper: (row: Record<string, string>) => T): T[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];
  
  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Parse rows
  const results: T[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || "";
    }
    
    try {
      results.push(mapper(row));
    } catch (e) {
      // Skip invalid rows
      console.warn(`Skipping invalid row ${i}:`, e);
    }
  }
  
  return results;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// ============================================================================
// File Loading
// ============================================================================

let stopsCache: GtfsStop[] | null = null;
let routesCache: GtfsRoute[] | null = null;
let stationsCache: Map<string, Station> | null = null;

function getDataPath(filename: string): string {
  // In Next.js, process.cwd() is the project root
  return join(process.cwd(), "data", "gtfs", filename);
}

/**
 * Load and parse stops.txt
 */
export function loadStops(): GtfsStop[] {
  if (stopsCache) return stopsCache;
  
  try {
    const content = readFileSync(getDataPath("stops.txt"), "utf-8");
    stopsCache = parseCSV(content, (row) => ({
      stopId: row.stop_id,
      stopName: row.stop_name,
      stopLat: parseFloat(row.stop_lat),
      stopLon: parseFloat(row.stop_lon),
      locationType: row.location_type ? parseInt(row.location_type) : 0,
      parentStation: row.parent_station || null,
    }));
    return stopsCache;
  } catch (e) {
    console.error("Failed to load stops.txt:", e);
    return [];
  }
}

/**
 * Load and parse routes.txt
 */
export function loadRoutes(): GtfsRoute[] {
  if (routesCache) return routesCache;
  
  try {
    const content = readFileSync(getDataPath("routes.txt"), "utf-8");
    routesCache = parseCSV(content, (row) => ({
      routeId: row.route_id,
      agencyId: row.agency_id,
      routeShortName: row.route_short_name,
      routeLongName: row.route_long_name,
      routeDesc: row.route_desc,
      routeType: parseInt(row.route_type) || 1,
      routeUrl: row.route_url,
      routeColor: row.route_color,
      routeTextColor: row.route_text_color,
      routeSortOrder: parseInt(row.route_sort_order) || 0,
    }));
    return routesCache;
  } catch (e) {
    console.error("Failed to load routes.txt:", e);
    return [];
  }
}

/**
 * Get stations (parent stations only, not platforms)
 */
export function getStations(): Map<string, Station> {
  if (stationsCache) return stationsCache;
  
  const stops = loadStops();
  stationsCache = new Map();
  
  // First pass: find all parent stations (location_type = 1)
  for (const stop of stops) {
    if (stop.locationType === 1) {
      stationsCache.set(stop.stopId, {
        id: stop.stopId,
        name: stop.stopName,
        latitude: stop.stopLat,
        longitude: stop.stopLon,
        platforms: { north: null, south: null },
      });
    }
  }
  
  // Second pass: link platforms to parent stations
  for (const stop of stops) {
    if (stop.parentStation && stationsCache.has(stop.parentStation)) {
      const station = stationsCache.get(stop.parentStation)!;
      if (stop.stopId.endsWith("N")) {
        station.platforms.north = stop.stopId;
      } else if (stop.stopId.endsWith("S")) {
        station.platforms.south = stop.stopId;
      }
    }
  }
  
  return stationsCache;
}

/**
 * Search stations by name
 */
export function searchStations(query: string, limit = 20): Station[] {
  const stations = getStations();
  const queryLower = query.toLowerCase();
  
  const results: Station[] = [];
  for (const station of stations.values()) {
    if (station.name.toLowerCase().includes(queryLower)) {
      results.push(station);
      if (results.length >= limit) break;
    }
  }
  
  return results;
}

/**
 * Get station by ID
 */
export function getStationById(stationId: string): Station | null {
  const stations = getStations();
  
  // Try exact match first
  if (stations.has(stationId)) {
    return stations.get(stationId)!;
  }
  
  // If given a platform ID (e.g., "A15N"), find the parent station
  const baseId = stationId.replace(/[NS]$/, "");
  if (stations.has(baseId)) {
    return stations.get(baseId)!;
  }
  
  return null;
}

/**
 * Get all routes
 */
export function getRoutes(): GtfsRoute[] {
  return loadRoutes();
}

/**
 * Get route by ID
 */
export function getRouteById(routeId: string): GtfsRoute | null {
  const routes = loadRoutes();
  return routes.find(r => r.routeId === routeId) || null;
}

/**
 * Get route color (with # prefix)
 */
export function getRouteColor(routeId: string): string {
  const route = getRouteById(routeId);
  return route ? `#${route.routeColor}` : "#808183";
}

