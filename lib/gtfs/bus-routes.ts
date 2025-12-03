/**
 * Bus Route Data Parser
 * 
 * Loads and provides access to NYC bus route information.
 * Provides static fallback data when API is unavailable.
 */

import busRoutesData from "@/data/gtfs/bus-routes.json";

// ============================================================================
// Types
// ============================================================================

export interface BusRouteGroup {
  name: string;
  color: string;
  textColor: string;
}

export type RouteGroupId = "M" | "B" | "Q" | "BX" | "S" | "BM" | "BXM" | "QM" | "SIM" | "X";

// ============================================================================
// Static Data Access
// ============================================================================

const routeGroups = busRoutesData.routeGroups as Record<RouteGroupId, BusRouteGroup>;
const knownRoutes = busRoutesData.knownRoutes as Record<RouteGroupId, string[]>;
const sbsConfig = busRoutesData.selectBusService;

/**
 * Get all route group IDs
 */
export function getAllRouteGroupIds(): RouteGroupId[] {
  return Object.keys(routeGroups) as RouteGroupId[];
}

/**
 * Get route group info
 */
export function getRouteGroup(groupId: RouteGroupId): BusRouteGroup | null {
  return routeGroups[groupId] ?? null;
}

/**
 * Get all route groups
 */
export function getAllRouteGroups(): Record<RouteGroupId, BusRouteGroup> {
  return routeGroups;
}

/**
 * Get known routes for a group (static fallback data)
 */
export function getKnownRoutes(groupId: RouteGroupId): string[] {
  return knownRoutes[groupId] ?? [];
}

/**
 * Get all known routes (static fallback data)
 */
export function getAllKnownRoutes(): string[] {
  const allRoutes: string[] = [];
  for (const groupId of getAllRouteGroupIds()) {
    allRoutes.push(...getKnownRoutes(groupId));
  }
  return allRoutes;
}

/**
 * Get total count of known routes
 */
export function getKnownRouteCount(): number {
  let count = 0;
  for (const groupId of getAllRouteGroupIds()) {
    count += getKnownRoutes(groupId).length;
  }
  return count;
}

// ============================================================================
// Route Identification
// ============================================================================

/**
 * Determine route group from route ID
 * Handles prefixes like M, B, Q, BX, S, BM, BXM, QM, SIM, X
 */
export function getRouteGroupId(routeId: string): RouteGroupId | null {
  const upperRouteId = routeId.toUpperCase();
  
  // Order matters - check longer prefixes first
  if (upperRouteId.startsWith("BXM")) return "BXM";
  if (upperRouteId.startsWith("SIM")) return "SIM";
  if (upperRouteId.startsWith("BX")) return "BX";
  if (upperRouteId.startsWith("BM")) return "BM";
  if (upperRouteId.startsWith("QM")) return "QM";
  if (upperRouteId.startsWith("M")) return "M";
  if (upperRouteId.startsWith("B")) return "B";
  if (upperRouteId.startsWith("Q")) return "Q";
  if (upperRouteId.startsWith("S")) return "S";
  if (upperRouteId.startsWith("X")) return "X";
  
  return null;
}

/**
 * Get color for a bus route based on its group
 */
export function getBusRouteColor(routeId: string): string {
  // Check for Select Bus Service
  if (isSelectBusService(routeId)) {
    return sbsConfig.color;
  }
  
  // Get group color
  const groupId = getRouteGroupId(routeId);
  if (groupId) {
    return routeGroups[groupId].color;
  }
  
  return "#808183"; // Default gray
}

/**
 * Get text color for a bus route badge
 */
export function getBusRouteTextColor(routeId: string): string {
  // Check for Select Bus Service
  if (isSelectBusService(routeId)) {
    return sbsConfig.textColor;
  }
  
  // Get group text color
  const groupId = getRouteGroupId(routeId);
  if (groupId) {
    return routeGroups[groupId].textColor;
  }
  
  return "#FFFFFF";
}

/**
 * Check if route is Select Bus Service
 */
export function isSelectBusService(routeId: string): boolean {
  return routeId.endsWith("+") || routeId.toUpperCase().includes("SBS");
}

/**
 * Check if route is Express (BM, BXM, QM, SIM, X)
 */
export function isExpressRoute(routeId: string): boolean {
  const groupId = getRouteGroupId(routeId);
  return groupId === "BM" || groupId === "BXM" || groupId === "QM" || 
         groupId === "SIM" || groupId === "X";
}

/**
 * Get human-readable group name for a route
 */
export function getRouteGroupName(routeId: string): string {
  const groupId = getRouteGroupId(routeId);
  if (!groupId) return "NYC Bus";
  return routeGroups[groupId].name;
}

/**
 * Get borough name from route group
 */
export function getBoroughFromRouteGroup(groupId: RouteGroupId): string {
  switch (groupId) {
    case "M": return "Manhattan";
    case "B": 
    case "BM": return "Brooklyn";
    case "Q":
    case "QM": return "Queens";
    case "BX":
    case "BXM": return "Bronx";
    case "S":
    case "SIM": return "Staten Island";
    case "X": return "Express";
    default: return "NYC";
  }
}

// ============================================================================
// Route Sorting & Grouping
// ============================================================================

/**
 * Sort routes naturally (M1, M2, M10, M100, etc.)
 */
export function sortRoutes(routes: string[]): string[] {
  return [...routes].sort((a, b) => {
    const aPrefix = a.match(/^[A-Z]+/)?.[0] ?? "";
    const bPrefix = b.match(/^[A-Z]+/)?.[0] ?? "";
    if (aPrefix !== bPrefix) return aPrefix.localeCompare(bPrefix);
    
    // Extract numeric part
    const aNum = parseInt(a.replace(/^[A-Z]+/, "").replace(/\+$/, "")) || 0;
    const bNum = parseInt(b.replace(/^[A-Z]+/, "").replace(/\+$/, "")) || 0;
    if (aNum !== bNum) return aNum - bNum;
    
    // SBS routes (+) come after regular
    const aIsSbs = a.endsWith("+");
    const bIsSbs = b.endsWith("+");
    if (aIsSbs && !bIsSbs) return 1;
    if (!aIsSbs && bIsSbs) return -1;
    
    return a.localeCompare(b);
  });
}

/**
 * Group routes by their prefix
 */
export function groupRoutesByPrefix(routes: string[]): Record<RouteGroupId, string[]> {
  const grouped: Record<string, string[]> = {};
  
  for (const route of routes) {
    const groupId = getRouteGroupId(route);
    if (groupId) {
      if (!grouped[groupId]) grouped[groupId] = [];
      grouped[groupId].push(route);
    }
  }
  
  // Sort routes within each group
  for (const groupId of Object.keys(grouped)) {
    grouped[groupId] = sortRoutes(grouped[groupId]);
  }
  
  return grouped as Record<RouteGroupId, string[]>;
}

/**
 * Search routes by query string
 */
export function searchBusRoutes(query: string, routes?: string[], limit = 20): string[] {
  const normalizedQuery = query.toUpperCase().trim();
  if (!normalizedQuery) return [];
  
  const searchIn = routes ?? getAllKnownRoutes();
  const results: string[] = [];
  
  for (const route of searchIn) {
    if (route.toUpperCase().includes(normalizedQuery)) {
      results.push(route);
      if (results.length >= limit) break;
    }
  }
  
  // Sort by relevance - exact prefix matches first
  return sortRoutes(results).slice(0, limit);
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Format route ID for display (normalize case)
 */
export function formatRouteId(routeId: string): string {
  // Normalize to uppercase, but handle SBS specially
  return routeId.toUpperCase();
}

/**
 * Get display order for route groups (for UI organization)
 */
export function getRouteGroupDisplayOrder(): RouteGroupId[] {
  return ["M", "B", "Q", "BX", "S", "BM", "BXM", "QM", "SIM", "X"];
}

/**
 * Check if a route ID is valid (exists in known routes)
 */
export function isKnownRoute(routeId: string): boolean {
  const upperRouteId = routeId.toUpperCase();
  for (const groupId of getAllRouteGroupIds()) {
    const routes = getKnownRoutes(groupId);
    if (routes.some(r => r.toUpperCase() === upperRouteId)) {
      return true;
    }
  }
  return false;
}
