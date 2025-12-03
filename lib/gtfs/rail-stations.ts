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
