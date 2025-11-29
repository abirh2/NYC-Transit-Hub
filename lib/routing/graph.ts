/**
 * Station Graph for Accessible Routing
 * 
 * Builds a graph of NYC subway stations with time-weighted edges
 * for use in accessible route planning with Dijkstra's algorithm.
 */

import { getStations } from "@/lib/gtfs/parser";
import lineStationsData from "@/data/gtfs/line-stations.json";
import type { EquipmentOutage } from "@/types/mta";

// ============================================================================
// Types
// ============================================================================

export interface StationNode {
  id: string;
  name: string;
  lines: string[];
  hasElevator: boolean;
  isAccessible: boolean;
  outages: EquipmentOutage[];
  isExpressStop: Record<string, boolean>; // line -> is express stop
  latitude: number;
  longitude: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  line: string;
  isExpress: boolean;
  estimatedMinutes: number;
  realtimeMinutes?: number;
  isTransfer: boolean;
}

export interface StationGraph {
  nodes: Map<string, StationNode>;
  adjacency: Map<string, GraphEdge[]>;
}

export interface RouteSegment {
  fromStationId: string;
  fromStationName: string;
  toStationId: string;
  toStationName: string;
  line: string;
  isExpress: boolean;
  travelMinutes: number;
  isAccessible: boolean;
  hasElevatorOutage: boolean;
}

export interface AccessibleRoute {
  segments: RouteSegment[];
  totalMinutes: number;
  isFullyAccessible: boolean;
  blockedStations: Array<{
    stationId: string;
    stationName: string;
    outageReason: string | null;
  }>;
  transferCount: number;
}

// ============================================================================
// Constants
// ============================================================================

// More realistic NYC subway timing:
// - Local trains: ~2.5-3 min per stop (includes dwell time, accel/decel)
// - Express trains: ~2 min per stop when skipping locals
// - Transfer walking time: 3-5 minutes

// Base travel time per station (local service)
const LOCAL_TIME_PER_STATION = 2.8; // minutes - realistic NYC subway timing

// Express travel time per station (when train is running express)
const EXPRESS_TIME_PER_STATION = 2.0; // minutes - express is faster

// Transfer penalty in minutes (walking between platforms)
const TRANSFER_PENALTY = 4;

// Earth radius in miles for distance calculation
const EARTH_RADIUS_MILES = 3959;

// Average subway speed in miles per minute (used for distance-based adjustments)
// NYC subway averages ~17 mph including stops
const SUBWAY_SPEED_MPM = 0.28; // ~17 mph average including stops

// Minimum time between stations (even very close ones need time to stop/start)
const MIN_STATION_TIME = 1.5;

// ============================================================================
// Distance Calculation
// ============================================================================

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return EARTH_RADIUS_MILES * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Estimate travel time between two stations
 * Uses a combination of distance-based calculation and realistic minimums
 * to account for acceleration, dwell time, and signal timing
 */
function estimateTravelTime(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
  isExpress: boolean = false
): number {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  
  // Base time from distance (at realistic subway speed)
  const distanceBasedTime = distance / SUBWAY_SPEED_MPM;
  
  // Use the higher of: distance-based time or standard station time
  // This ensures short hops still take realistic time (for stopping/starting)
  const baseTime = isExpress ? EXPRESS_TIME_PER_STATION : LOCAL_TIME_PER_STATION;
  
  // Take the maximum of distance-based and minimum station time
  // Add a bit more for longer distances (signal blocks, curves, etc)
  let time = Math.max(baseTime, distanceBasedTime);
  
  // For longer distances (> 0.5 miles), add extra time for signal timing
  if (distance > 0.5) {
    time += (distance - 0.5) * 0.5; // Add 0.5 min per extra half mile
  }
  
  // Ensure minimum realistic time
  return Math.max(MIN_STATION_TIME, Math.round(time * 10) / 10);
}

// ============================================================================
// Graph Building
// ============================================================================

// Cache the graph to avoid rebuilding
let cachedGraph: StationGraph | null = null;
let cachedOutages: EquipmentOutage[] = [];

/**
 * Build the station graph from GTFS data
 */
export function buildStationGraph(outages: EquipmentOutage[] = []): StationGraph {
  // Check if we can use cached graph (same outages)
  if (cachedGraph && JSON.stringify(cachedOutages) === JSON.stringify(outages)) {
    return cachedGraph;
  }

  const nodes = new Map<string, StationNode>();
  const adjacency = new Map<string, GraphEdge[]>();
  
  // Load GTFS station data for coordinates
  const gtfsStations = getStations();
  
  // Build outage lookup by station name (normalized)
  const outagesByStation = new Map<string, EquipmentOutage[]>();
  for (const outage of outages) {
    const normalizedName = normalizeStationName(outage.stationName);
    if (!outagesByStation.has(normalizedName)) {
      outagesByStation.set(normalizedName, []);
    }
    outagesByStation.get(normalizedName)!.push(outage);
  }
  
  // Track station names to IDs for transfer detection
  const stationNameToIds = new Map<string, string[]>();
  
  // Process each line
  const lineData = lineStationsData as Record<string, {
    name: string;
    color: string;
    textColor: string;
    stations: Array<{
      id: string;
      name: string;
      type?: string;
      express?: boolean;
      transfer?: string[];
    }>;
  }>;
  
  for (const [lineId, line] of Object.entries(lineData)) {
    const stations = line.stations;
    
    for (let i = 0; i < stations.length; i++) {
      const station = stations[i];
      const stationId = station.id;
      const gtfsStation = gtfsStations.get(stationId);
      
      // Get or create node
      let node = nodes.get(stationId);
      if (!node) {
        const normalizedName = normalizeStationName(station.name);
        const stationOutages = outagesByStation.get(normalizedName) || [];
        const hasADAOutage = stationOutages.some(o => 
          o.equipmentType === "ELEVATOR" && o.adaCompliant
        );
        
        node = {
          id: stationId,
          name: station.name,
          lines: [],
          // Assume station has elevator if there are any elevator outages for it
          // (outages imply elevator existence), otherwise default to true
          hasElevator: stationOutages.some(o => o.equipmentType === "ELEVATOR") || true,
          isAccessible: !hasADAOutage,
          outages: stationOutages,
          isExpressStop: {},
          latitude: gtfsStation?.latitude ?? 0,
          longitude: gtfsStation?.longitude ?? 0,
        };
        nodes.set(stationId, node);
        adjacency.set(stationId, []);
      }
      
      // Add line to node
      if (!node.lines.includes(lineId)) {
        node.lines.push(lineId);
      }
      
      // Track express stops
      if (station.express) {
        node.isExpressStop[lineId] = true;
      }
      
      // Track station name to ID mapping
      const normalizedName = normalizeStationName(station.name);
      if (!stationNameToIds.has(normalizedName)) {
        stationNameToIds.set(normalizedName, []);
      }
      if (!stationNameToIds.get(normalizedName)!.includes(stationId)) {
        stationNameToIds.get(normalizedName)!.push(stationId);
      }
      
      // Create edge to next station
      if (i < stations.length - 1) {
        const nextStation = stations[i + 1];
        const nextGtfsStation = gtfsStations.get(nextStation.id);
        
        // Calculate travel time based on distance and service type
        const isExpressSegment = station.express || nextStation.express;
        let travelTime = isExpressSegment ? EXPRESS_TIME_PER_STATION : LOCAL_TIME_PER_STATION;
        
        if (gtfsStation && nextGtfsStation) {
          travelTime = estimateTravelTime(
            gtfsStation.latitude,
            gtfsStation.longitude,
            nextGtfsStation.latitude,
            nextGtfsStation.longitude,
            isExpressSegment
          );
        }
        
        // Create forward edge
        const forwardEdge: GraphEdge = {
          from: stationId,
          to: nextStation.id,
          line: lineId,
          isExpress: station.express || false,
          estimatedMinutes: travelTime,
          isTransfer: false,
        };
        adjacency.get(stationId)!.push(forwardEdge);
        
        // Create backward edge (subway lines are bidirectional)
        const backwardEdge: GraphEdge = {
          from: nextStation.id,
          to: stationId,
          line: lineId,
          isExpress: nextStation.express || false,
          estimatedMinutes: travelTime,
          isTransfer: false,
        };
        
        if (!adjacency.has(nextStation.id)) {
          adjacency.set(nextStation.id, []);
        }
        adjacency.get(nextStation.id)!.push(backwardEdge);
      }
    }
  }
  
  // Add transfer edges between stations with the same name
  for (const [, stationIds] of stationNameToIds) {
    if (stationIds.length <= 1) continue;
    
    // Create transfer edges between all stations with the same name
    for (let i = 0; i < stationIds.length; i++) {
      for (let j = i + 1; j < stationIds.length; j++) {
        const stationA = stationIds[i];
        const stationB = stationIds[j];
        
        // Add transfer edge A -> B
        const transferAB: GraphEdge = {
          from: stationA,
          to: stationB,
          line: "TRANSFER",
          isExpress: false,
          estimatedMinutes: TRANSFER_PENALTY,
          isTransfer: true,
        };
        adjacency.get(stationA)?.push(transferAB);
        
        // Add transfer edge B -> A
        const transferBA: GraphEdge = {
          from: stationB,
          to: stationA,
          line: "TRANSFER",
          isExpress: false,
          estimatedMinutes: TRANSFER_PENALTY,
          isTransfer: true,
        };
        adjacency.get(stationB)?.push(transferBA);
      }
    }
  }
  
  cachedGraph = { nodes, adjacency };
  cachedOutages = [...outages];
  
  return cachedGraph;
}

/**
 * Normalize station name for matching
 */
function normalizeStationName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[-–—]/g, "-")
    .replace(/st\b/g, "street")
    .replace(/av\b/g, "avenue")
    .replace(/rd\b/g, "road")
    .replace(/blvd\b/g, "boulevard")
    .trim();
}

// ============================================================================
// Dijkstra's Algorithm
// ============================================================================

interface DijkstraNode {
  stationId: string;
  distance: number;
  previous: string | null;
  previousEdge: GraphEdge | null;
}

/**
 * Find shortest path between two stations using Dijkstra's algorithm
 */
export function findShortestPath(
  graph: StationGraph,
  fromStationId: string,
  toStationId: string,
  options: {
    requireAccessible?: boolean;
    avoidStations?: Set<string>;
    realtimeTimes?: Map<string, number>; // edge key -> actual time
  } = {}
): AccessibleRoute | null {
  const { requireAccessible = false, avoidStations = new Set(), realtimeTimes } = options;
  
  // Validate stations exist
  if (!graph.nodes.has(fromStationId) || !graph.nodes.has(toStationId)) {
    return null;
  }
  
  // Initialize distances
  const distances = new Map<string, DijkstraNode>();
  const visited = new Set<string>();
  const unvisited = new Set<string>();
  
  for (const stationId of graph.nodes.keys()) {
    distances.set(stationId, {
      stationId,
      distance: stationId === fromStationId ? 0 : Infinity,
      previous: null,
      previousEdge: null,
    });
    unvisited.add(stationId);
  }
  
  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let currentId: string | null = null;
    let minDistance = Infinity;
    
    for (const stationId of unvisited) {
      const node = distances.get(stationId)!;
      if (node.distance < minDistance) {
        minDistance = node.distance;
        currentId = stationId;
      }
    }
    
    if (currentId === null || minDistance === Infinity) {
      break; // No path exists
    }
    
    if (currentId === toStationId) {
      break; // Found destination
    }
    
    unvisited.delete(currentId);
    visited.add(currentId);
    
    // Check neighbors
    const edges = graph.adjacency.get(currentId) || [];
    for (const edge of edges) {
      if (visited.has(edge.to)) continue;
      if (avoidStations.has(edge.to)) continue;
      
      // Check accessibility if required
      if (requireAccessible) {
        const toNode = graph.nodes.get(edge.to);
        if (toNode && !toNode.isAccessible) continue;
      }
      
      // Calculate edge weight
      let edgeWeight = edge.estimatedMinutes;
      
      // Use realtime times if available
      if (realtimeTimes) {
        const edgeKey = `${edge.from}-${edge.to}-${edge.line}`;
        if (realtimeTimes.has(edgeKey)) {
          edgeWeight = realtimeTimes.get(edgeKey)!;
        }
      }
      
      const newDistance = distances.get(currentId)!.distance + edgeWeight;
      const neighborNode = distances.get(edge.to)!;
      
      if (newDistance < neighborNode.distance) {
        neighborNode.distance = newDistance;
        neighborNode.previous = currentId;
        neighborNode.previousEdge = edge;
      }
    }
  }
  
  // Reconstruct path
  const destNode = distances.get(toStationId)!;
  if (destNode.distance === Infinity) {
    return null; // No path found
  }
  
  // Build path backwards
  const path: Array<{ stationId: string; edge: GraphEdge | null }> = [];
  let current: string | null = toStationId;
  
  while (current !== null) {
    const dijkstraNode: DijkstraNode = distances.get(current)!;
    path.unshift({ stationId: current, edge: dijkstraNode.previousEdge });
    current = dijkstraNode.previous;
  }
  
  // Convert to route segments
  return buildRoute(graph, path);
}

/**
 * Build route from path
 */
function buildRoute(
  graph: StationGraph,
  path: Array<{ stationId: string; edge: GraphEdge | null }>
): AccessibleRoute {
  const segments: RouteSegment[] = [];
  const blockedStations: Array<{
    stationId: string;
    stationName: string;
    outageReason: string | null;
  }> = [];
  
  let totalMinutes = 0;
  let transferCount = 0;
  let isFullyAccessible = true;
  
  for (let i = 1; i < path.length; i++) {
    const fromStationId = path[i - 1].stationId;
    const toStationId = path[i].stationId;
    const edge = path[i].edge;
    
    if (!edge) continue;
    
    const fromNode = graph.nodes.get(fromStationId)!;
    const toNode = graph.nodes.get(toStationId)!;
    
    // Check accessibility
    if (!toNode.isAccessible) {
      isFullyAccessible = false;
      const primaryOutage = toNode.outages.find(o => 
        o.equipmentType === "ELEVATOR" && o.adaCompliant
      );
      blockedStations.push({
        stationId: toStationId,
        stationName: toNode.name,
        outageReason: primaryOutage?.outageReason || null,
      });
    }
    
    // Track transfers
    if (edge.isTransfer) {
      transferCount++;
    }
    
    totalMinutes += edge.estimatedMinutes;
    
    segments.push({
      fromStationId,
      fromStationName: fromNode.name,
      toStationId,
      toStationName: toNode.name,
      line: edge.line,
      isExpress: edge.isExpress,
      travelMinutes: edge.estimatedMinutes,
      isAccessible: toNode.isAccessible,
      hasElevatorOutage: !toNode.isAccessible,
    });
  }
  
  return {
    segments,
    totalMinutes: Math.round(totalMinutes * 10) / 10,
    isFullyAccessible,
    blockedStations,
    transferCount,
  };
}

// ============================================================================
// Route Finding with Alternatives
// ============================================================================

/**
 * Find routes between stations, including alternatives
 */
export function findRoutes(
  fromStationId: string,
  toStationId: string,
  outages: EquipmentOutage[] = [],
  options: {
    maxAlternatives?: number;
    realtimeTimes?: Map<string, number>;
  } = {}
): {
  primary: AccessibleRoute | null;
  alternatives: AccessibleRoute[];
  warnings: string[];
} {
  const { maxAlternatives = 3, realtimeTimes } = options;
  const warnings: string[] = [];
  
  // Build graph with current outages
  const graph = buildStationGraph(outages);
  
  // Find primary route (shortest, may not be accessible)
  const primary = findShortestPath(graph, fromStationId, toStationId, {
    requireAccessible: false,
    realtimeTimes,
  });
  
  if (!primary) {
    warnings.push("No route found between these stations");
    return { primary: null, alternatives: [], warnings };
  }
  
  // If primary is not accessible, find accessible alternative
  const alternatives: AccessibleRoute[] = [];
  
  if (!primary.isFullyAccessible) {
    const accessibleRoute = findShortestPath(graph, fromStationId, toStationId, {
      requireAccessible: true,
      realtimeTimes,
    });
    
    if (accessibleRoute) {
      alternatives.push(accessibleRoute);
    } else {
      warnings.push("No fully accessible route available between these stations");
    }
  }
  
  // Find additional alternatives by avoiding already-used stations
  const usedStations = new Set<string>();
  for (const segment of primary.segments) {
    // Skip first and last (origin/destination)
    if (segment.fromStationId !== fromStationId && segment.fromStationId !== toStationId) {
      usedStations.add(segment.fromStationId);
    }
  }
  
  // Try to find routes avoiding middle stations of primary route
  if (usedStations.size > 0 && alternatives.length < maxAlternatives) {
    const altRoute = findShortestPath(graph, fromStationId, toStationId, {
      requireAccessible: false,
      avoidStations: usedStations,
      realtimeTimes,
    });
    
    if (altRoute && altRoute.totalMinutes < primary.totalMinutes * 1.5) {
      // Only include if not too much longer
      const isDuplicate = alternatives.some(a => 
        a.segments.length === altRoute.segments.length &&
        a.segments.every((s, i) => s.line === altRoute.segments[i].line)
      );
      
      if (!isDuplicate) {
        alternatives.push(altRoute);
      }
    }
  }
  
  // Sort alternatives by travel time
  alternatives.sort((a, b) => {
    // Accessible routes first
    if (a.isFullyAccessible !== b.isFullyAccessible) {
      return a.isFullyAccessible ? -1 : 1;
    }
    // Then by time
    return a.totalMinutes - b.totalMinutes;
  });
  
  return {
    primary,
    alternatives: alternatives.slice(0, maxAlternatives),
    warnings,
  };
}

// ============================================================================
// Station Lookup Helpers
// ============================================================================

/**
 * Find station ID by name (fuzzy match)
 */
export function findStationByName(
  graph: StationGraph,
  name: string
): StationNode | null {
  const normalized = normalizeStationName(name);
  
  // First try exact match
  for (const node of graph.nodes.values()) {
    if (normalizeStationName(node.name) === normalized) {
      return node;
    }
  }
  
  // Then try partial match
  for (const node of graph.nodes.values()) {
    if (normalizeStationName(node.name).includes(normalized)) {
      return node;
    }
  }
  
  return null;
}

/**
 * Get all station IDs that share a name (for multi-complex stations)
 */
export function getStationIdsByName(
  graph: StationGraph,
  name: string
): string[] {
  const normalized = normalizeStationName(name);
  const ids: string[] = [];
  
  for (const node of graph.nodes.values()) {
    if (normalizeStationName(node.name) === normalized) {
      ids.push(node.id);
    }
  }
  
  return ids;
}

/**
 * Clear the cached graph (useful when outages change)
 */
export function clearGraphCache(): void {
  cachedGraph = null;
  cachedOutages = [];
}

