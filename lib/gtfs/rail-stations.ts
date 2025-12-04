/**
 * Rail Station Data Parser
 * 
 * Provides access to LIRR and Metro-North branch/line information.
 */

import lirrData from "@/data/gtfs/lirr-stations.json";
import mnrData from "@/data/gtfs/metro-north-stations.json";
import type { TransitMode } from "@/types/mta";

// ============================================================================
// Types
// ============================================================================

export interface RailStation {
  id: string;
  name: string;
  type?: "terminal" | "hub";
  lat?: number;
  lon?: number;
}

export interface RailBranch {
  id: string;
  name: string;
  color: string;
  textColor: string;
  stations: RailStation[];
}

// ============================================================================
// Data Accessors
// ============================================================================

const lirrBranches = lirrData.branches as Record<string, RailBranch>;
const lirrStationNames = lirrData.stationNames as Record<string, string>;

const mnrBranches = mnrData.branches as Record<string, RailBranch>;
const mnrStationNames = mnrData.stationNames as Record<string, string>;

// ============================================================================
// LIRR Data Access
// ============================================================================

/**
 * Get all LIRR branch IDs
 */
export function getLirrBranchIds(): string[] {
  return Object.keys(lirrBranches);
}

/**
 * Get LIRR branch info
 */
export function getLirrBranch(branchId: string): RailBranch | null {
  return lirrBranches[branchId] ?? null;
}

/**
 * Get all LIRR branches
 */
export function getAllLirrBranches(): RailBranch[] {
  return Object.values(lirrBranches);
}

/**
 * Get LIRR branch name
 */
export function getLirrBranchName(branchId: string): string {
  return lirrBranches[branchId]?.name ?? `Branch ${branchId}`;
}

/**
 * Get LIRR branch color
 */
export function getLirrBranchColor(branchId: string): string {
  return lirrBranches[branchId]?.color ?? "#4D5357";
}

/**
 * Get LIRR branch text color
 */
export function getLirrBranchTextColor(branchId: string): string {
  return lirrBranches[branchId]?.textColor ?? "#FFFFFF";
}

/**
 * Get LIRR station name by ID
 */
export function getLirrStationName(stationId: string): string {
  return lirrStationNames[stationId] ?? `Station ${stationId}`;
}

/**
 * Get LIRR stations for a branch
 */
export function getLirrBranchStations(branchId: string): RailStation[] {
  return lirrBranches[branchId]?.stations ?? [];
}

// ============================================================================
// Metro-North Data Access
// ============================================================================

/**
 * Get all Metro-North line IDs
 */
export function getMnrLineIds(): string[] {
  return Object.keys(mnrBranches);
}

/**
 * Get Metro-North line info
 */
export function getMnrLine(lineId: string): RailBranch | null {
  return mnrBranches[lineId] ?? null;
}

/**
 * Get all Metro-North lines
 */
export function getAllMnrLines(): RailBranch[] {
  return Object.values(mnrBranches);
}

/**
 * Get Metro-North line name
 */
export function getMnrLineName(lineId: string): string {
  return mnrBranches[lineId]?.name ?? `Line ${lineId}`;
}

/**
 * Get Metro-North line color
 */
export function getMnrLineColor(lineId: string): string {
  return mnrBranches[lineId]?.color ?? "#4D5357";
}

/**
 * Get Metro-North line text color
 */
export function getMnrLineTextColor(lineId: string): string {
  return mnrBranches[lineId]?.textColor ?? "#FFFFFF";
}

/**
 * Get Metro-North station name by ID
 */
export function getMnrStationName(stationId: string): string {
  return mnrStationNames[stationId] ?? `Station ${stationId}`;
}

/**
 * Get Metro-North stations for a line
 */
export function getMnrLineStations(lineId: string): RailStation[] {
  return mnrBranches[lineId]?.stations ?? [];
}

// ============================================================================
// Generic Rail Helpers
// ============================================================================

/**
 * Get branch/line info for a given mode
 */
export function getRailBranch(branchId: string, mode: TransitMode): RailBranch | null {
  if (mode === "lirr") return getLirrBranch(branchId);
  if (mode === "metro-north") return getMnrLine(branchId);
  return null;
}

/**
 * Get branch/line name for a given mode
 */
export function getRailBranchName(branchId: string, mode: TransitMode): string {
  if (mode === "lirr") return getLirrBranchName(branchId);
  if (mode === "metro-north") return getMnrLineName(branchId);
  return branchId;
}

/**
 * Get branch/line color for a given mode
 */
export function getRailBranchColor(branchId: string, mode: TransitMode): string {
  if (mode === "lirr") return getLirrBranchColor(branchId);
  if (mode === "metro-north") return getMnrLineColor(branchId);
  return "#4D5357";
}

/**
 * Get branch/line text color for a given mode
 */
export function getRailBranchTextColor(branchId: string, mode: TransitMode): string {
  if (mode === "lirr") return getLirrBranchTextColor(branchId);
  if (mode === "metro-north") return getMnrLineTextColor(branchId);
  return "#FFFFFF";
}

/**
 * Get all branches/lines for a given mode
 */
export function getAllRailBranches(mode: TransitMode): RailBranch[] {
  if (mode === "lirr") return getAllLirrBranches();
  if (mode === "metro-north") return getAllMnrLines();
  return [];
}

/**
 * Get station name for a given mode
 */
export function getRailStationName(stationId: string, mode: TransitMode): string {
  if (mode === "lirr") return getLirrStationName(stationId);
  if (mode === "metro-north") return getMnrStationName(stationId);
  return `Station ${stationId}`;
}

/**
 * Get stations for a branch/line
 */
export function getRailBranchStations(branchId: string, mode: TransitMode): RailStation[] {
  if (mode === "lirr") return getLirrBranchStations(branchId);
  if (mode === "metro-north") return getMnrLineStations(branchId);
  return [];
}

// ============================================================================
// Station Search & Lookup (for Station Board)
// ============================================================================

export interface RailStationWithCoords {
  id: string;
  name: string;
  type?: "terminal" | "hub";
  latitude: number;
  longitude: number;
  branches: string[]; // List of branch IDs this station serves
}

// Lazily built lookup caches
let lirrStationCache: Map<string, RailStationWithCoords> | null = null;
let mnrStationCache: Map<string, RailStationWithCoords> | null = null;

/**
 * Build a station lookup cache from branch data
 * Combines all branches to get unique stations with all their branches listed
 */
function buildStationCache(
  branches: Record<string, RailBranch>,
  stationCoords: Record<string, { lat: number; lon: number }>
): Map<string, RailStationWithCoords> {
  const cache = new Map<string, RailStationWithCoords>();
  
  for (const [branchId, branch] of Object.entries(branches)) {
    for (const station of branch.stations) {
      const coords = stationCoords[station.id];
      if (!coords) continue;
      
      const existing = cache.get(station.id);
      if (existing) {
        // Add this branch to the station's branch list
        if (!existing.branches.includes(branchId)) {
          existing.branches.push(branchId);
        }
      } else {
        cache.set(station.id, {
          id: station.id,
          name: station.name,
          type: station.type,
          latitude: coords.lat,
          longitude: coords.lon,
          branches: [branchId],
        });
      }
    }
  }
  
  return cache;
}

/**
 * Get LIRR station cache (builds lazily on first call)
 */
function getLirrStationCache(): Map<string, RailStationWithCoords> {
  if (!lirrStationCache) {
    const coords = lirrData.stationCoords as Record<string, { lat: number; lon: number }>;
    lirrStationCache = buildStationCache(lirrBranches, coords);
  }
  return lirrStationCache;
}

/**
 * Get Metro-North station cache (builds lazily on first call)
 */
function getMnrStationCache(): Map<string, RailStationWithCoords> {
  if (!mnrStationCache) {
    const coords = mnrData.stationCoords as Record<string, { lat: number; lon: number }>;
    mnrStationCache = buildStationCache(mnrBranches, coords);
  }
  return mnrStationCache;
}

/**
 * Get all LIRR stations with coordinates
 */
export function getAllLirrStations(): RailStationWithCoords[] {
  return Array.from(getLirrStationCache().values());
}

/**
 * Get all Metro-North stations with coordinates
 */
export function getAllMnrStations(): RailStationWithCoords[] {
  return Array.from(getMnrStationCache().values());
}

/**
 * Get LIRR station by ID
 */
export function getLirrStationById(stationId: string): RailStationWithCoords | null {
  return getLirrStationCache().get(stationId) ?? null;
}

/**
 * Get Metro-North station by ID
 */
export function getMnrStationById(stationId: string): RailStationWithCoords | null {
  return getMnrStationCache().get(stationId) ?? null;
}

/**
 * Search LIRR stations by name
 */
export function searchLirrStations(query: string, limit: number = 10): RailStationWithCoords[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];
  
  const stations = getAllLirrStations();
  const results: Array<{ station: RailStationWithCoords; score: number }> = [];
  
  for (const station of stations) {
    const name = station.name.toLowerCase();
    let score = 0;
    
    // Exact match gets highest score
    if (name === normalizedQuery) {
      score = 100;
    }
    // Starts with query gets high score
    else if (name.startsWith(normalizedQuery)) {
      score = 80;
    }
    // Contains query gets medium score
    else if (name.includes(normalizedQuery)) {
      score = 50;
    }
    // Word boundary match
    else if (name.split(/\s+/).some(word => word.startsWith(normalizedQuery))) {
      score = 40;
    }
    
    if (score > 0) {
      results.push({ station, score });
    }
  }
  
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.station);
}

/**
 * Search Metro-North stations by name
 */
export function searchMnrStations(query: string, limit: number = 10): RailStationWithCoords[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];
  
  const stations = getAllMnrStations();
  const results: Array<{ station: RailStationWithCoords; score: number }> = [];
  
  for (const station of stations) {
    const name = station.name.toLowerCase();
    let score = 0;
    
    // Exact match gets highest score
    if (name === normalizedQuery) {
      score = 100;
    }
    // Starts with query gets high score
    else if (name.startsWith(normalizedQuery)) {
      score = 80;
    }
    // Contains query gets medium score
    else if (name.includes(normalizedQuery)) {
      score = 50;
    }
    // Word boundary match
    else if (name.split(/\s+/).some(word => word.startsWith(normalizedQuery))) {
      score = 40;
    }
    
    if (score > 0) {
      results.push({ station, score });
    }
  }
  
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.station);
}

/**
 * Get rail station by ID for a given mode
 */
export function getRailStationById(stationId: string, mode: TransitMode): RailStationWithCoords | null {
  if (mode === "lirr") return getLirrStationById(stationId);
  if (mode === "metro-north") return getMnrStationById(stationId);
  return null;
}

/**
 * Get all rail stations for a given mode
 */
export function getAllRailStations(mode: TransitMode): RailStationWithCoords[] {
  if (mode === "lirr") return getAllLirrStations();
  if (mode === "metro-north") return getAllMnrStations();
  return [];
}

/**
 * Search rail stations for a given mode
 */
export function searchRailStations(query: string, mode: TransitMode, limit: number = 10): RailStationWithCoords[] {
  if (mode === "lirr") return searchLirrStations(query, limit);
  if (mode === "metro-north") return searchMnrStations(query, limit);
  return [];
}
