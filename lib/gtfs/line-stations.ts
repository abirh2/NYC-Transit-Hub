/**
 * Line-Station Data Parser
 * 
 * Loads and provides access to ordered station sequences per subway line.
 * Used by the realtime tracker to display line diagrams with train positions.
 */

import lineStationsData from "@/data/gtfs/line-stations.json";

// ============================================================================
// Types
// ============================================================================

export interface LineStation {
  id: string;
  name: string;
  type?: "terminal";
  express?: boolean;
  transfer?: string[];
  branch?: string;
  lat?: number;
  lon?: number;
}

export interface LineInfo {
  name: string;
  color: string;
  textColor: string;
  stations: LineStation[];
}

export type LineId = keyof typeof lineStationsData;

// Line groupings by color family (for UI organization)
export const LINE_GROUPS = {
  red: { name: "Broadway-7th Avenue", lines: ["1", "2", "3"] as LineId[], color: "#EE352E" },
  green: { name: "Lexington Avenue", lines: ["4", "5", "6"] as LineId[], color: "#00933C" },
  purple: { name: "Flushing", lines: ["7"] as LineId[], color: "#B933AD" },
  blue: { name: "8th Avenue", lines: ["A", "C", "E"] as LineId[], color: "#0039A6" },
  orange: { name: "6th Avenue", lines: ["B", "D", "F", "M"] as LineId[], color: "#FF6319" },
  lime: { name: "Crosstown", lines: ["G"] as LineId[], color: "#6CBE45" },
  brown: { name: "Nassau Street", lines: ["J", "Z"] as LineId[], color: "#996633" },
  gray: { name: "Canarsie", lines: ["L"] as LineId[], color: "#A7A9AC" },
  yellow: { name: "Broadway", lines: ["N", "Q", "R", "W"] as LineId[], color: "#FCCC0A" },
  shuttle: { name: "Shuttles", lines: ["S", "SF", "SR"] as LineId[], color: "#808183" },
  sir: { name: "Staten Island", lines: ["SIR"] as LineId[], color: "#0039A6" },
} as const;

export type LineGroupId = keyof typeof LINE_GROUPS;

// ============================================================================
// Data Access
// ============================================================================

// Type the imported data
const lineData = lineStationsData as Record<string, LineInfo>;

/**
 * Get all available line IDs
 */
export function getAllLineIds(): LineId[] {
  return Object.keys(lineData) as LineId[];
}

/**
 * Get info for a specific line
 */
export function getLineInfo(lineId: LineId): LineInfo | null {
  return lineData[lineId] ?? null;
}

/**
 * Get stations for a specific line in order
 */
export function getLineStations(lineId: LineId): LineStation[] {
  const line = lineData[lineId];
  return line?.stations ?? [];
}

/**
 * Get line color
 */
export function getLineColor(lineId: LineId): string {
  const line = lineData[lineId];
  return line?.color ?? "#808183";
}

/**
 * Get line text color (for contrast on line color background)
 */
export function getLineTextColor(lineId: LineId): string {
  const line = lineData[lineId];
  return line?.textColor ?? "#FFFFFF";
}

/**
 * Get line long name
 */
export function getLineName(lineId: LineId): string {
  const line = lineData[lineId];
  return line?.name ?? lineId;
}

/**
 * Find station index in a line's station list
 * Returns -1 if not found
 */
export function findStationIndex(lineId: LineId, stationId: string): number {
  const stations = getLineStations(lineId);
  // Handle platform IDs (e.g., "A15N" -> "A15")
  const baseStationId = stationId.replace(/[NS]$/, "");
  return stations.findIndex(s => s.id === baseStationId);
}

/**
 * Check if a station is on a specific line
 */
export function isStationOnLine(lineId: LineId, stationId: string): boolean {
  return findStationIndex(lineId, stationId) !== -1;
}

/**
 * Get terminal stations for a line
 */
export function getLineTerminals(lineId: LineId): { north: LineStation | null; south: LineStation | null } {
  const stations = getLineStations(lineId);
  if (stations.length === 0) {
    return { north: null, south: null };
  }
  
  // First station is typically the northern terminal
  const north = stations[0];
  // Last station is typically the southern terminal
  const south = stations[stations.length - 1];
  
  return { north, south };
}

/**
 * Merge multiple line station lists for shared trunk display
 * Deduplicates stations while preserving order from the first line
 */
export function mergeLineStations(lineIds: LineId[]): LineStation[] {
  if (lineIds.length === 0) return [];
  if (lineIds.length === 1) return getLineStations(lineIds[0]);
  
  // Start with the first line's stations
  const merged: LineStation[] = [...getLineStations(lineIds[0])];
  const seenIds = new Set(merged.map(s => s.id));
  
  // Add unique stations from other lines
  for (let i = 1; i < lineIds.length; i++) {
    const stations = getLineStations(lineIds[i]);
    for (const station of stations) {
      if (!seenIds.has(station.id)) {
        // Find the best position to insert this station
        // For simplicity, append to end (could be smarter with lat/lon sorting)
        merged.push(station);
        seenIds.add(station.id);
      }
    }
  }
  
  return merged;
}

/**
 * Get which lines serve a specific station
 */
export function getLinesAtStation(stationId: string): LineId[] {
  const baseStationId = stationId.replace(/[NS]$/, "");
  const lines: LineId[] = [];
  
  for (const lineId of getAllLineIds()) {
    if (isStationOnLine(lineId, baseStationId)) {
      lines.push(lineId);
    }
  }
  
  return lines;
}

/**
 * Get station name by stop ID
 * Searches across all lines to find the station name
 */
export function getStationNameById(stopId: string): string | null {
  const baseStationId = stopId.replace(/[NS]$/, "");
  
  for (const lineId of getAllLineIds()) {
    const stations = getLineStations(lineId);
    const station = stations.find(s => s.id === baseStationId);
    if (station) {
      return station.name;
    }
  }
  
  return null;
}

/**
 * Get all line groups for UI organization
 */
export function getLineGroups(): typeof LINE_GROUPS {
  return LINE_GROUPS;
}

/**
 * Find which group a line belongs to
 */
export function getLineGroup(lineId: LineId): LineGroupId | null {
  for (const [groupId, group] of Object.entries(LINE_GROUPS)) {
    if ((group.lines as readonly string[]).includes(lineId)) {
      return groupId as LineGroupId;
    }
  }
  return null;
}

// ============================================================================
// Multi-Track Graph Layout
// ============================================================================

import type { 
  MultiTrackLayout, 
  TrackColumn, 
  ColumnStation, 
  GraphRow, 
  Junction,
  TrackSegment, 
  TrackLayout 
} from "@/types/gtfs";

/**
 * Build a multi-track graph layout from selected lines.
 * Each line gets its own column, with junctions where they share stations.
 */
export function buildMultiTrackLayout(lineIds: LineId[]): MultiTrackLayout {
  if (lineIds.length === 0) {
    return { columns: [], rows: [], junctions: [], totalRows: 0 };
  }

  // Step 1: Find all shared station IDs (junctions)
  const stationToLines = new Map<string, Set<string>>();
  
  for (const lineId of lineIds) {
    const stations = getLineStations(lineId);
    for (const station of stations) {
      if (!stationToLines.has(station.id)) {
        stationToLines.set(station.id, new Set());
      }
      stationToLines.get(station.id)!.add(lineId);
    }
  }

  // Identify junction station IDs (shared by 2+ selected lines)
  const junctionStationIds = new Set<string>();
  for (const [stationId, lines] of stationToLines) {
    if (lines.size > 1) {
      junctionStationIds.add(stationId);
    }
  }

  // Step 2: Build unified row ordering
  // Use the longest line as base, then align junctions
  const lineStationLists = lineIds.map(id => ({
    lineId: id,
    stations: getLineStations(id),
  }));
  
  // Sort by length descending - longest line sets the base structure
  lineStationLists.sort((a, b) => b.stations.length - a.stations.length);
  
  // Build row assignments: stationId -> rowIndex
  const stationToRow = new Map<string, number>();
  const rows: GraphRow[] = [];
  let currentRow = 0;

  // Process the longest line first to establish base ordering
  const baseLine = lineStationLists[0];
  for (const station of baseLine.stations) {
    stationToRow.set(station.id, currentRow);
    
    const linesAtStation = Array.from(stationToLines.get(station.id) || []);
    const isJunction = linesAtStation.length > 1;
    
    rows.push({
      index: currentRow,
      isJunction,
      junctionStationId: isJunction ? station.id : undefined,
      junctionStationName: isJunction ? station.name : undefined,
      junctionLines: isJunction ? linesAtStation : undefined,
      junctionColors: isJunction ? linesAtStation.map(l => getLineColor(l as LineId)) : undefined,
    });
    
    currentRow++;
  }

  // Process remaining lines - their unique stations go in-between or at ends
  for (let i = 1; i < lineStationLists.length; i++) {
    const { stations } = lineStationLists[i];
    let lastKnownRow = -1;
    const unplacedStations: Array<{ station: LineStation; afterRow: number }> = [];
    
    for (const station of stations) {
      if (stationToRow.has(station.id)) {
        // Station already placed (shared station)
        lastKnownRow = stationToRow.get(station.id)!;
        
        // Place any accumulated unplaced stations
        if (unplacedStations.length > 0) {
          // Insert these stations before this junction
          // For simplicity, we'll add them to the end and let sorting handle it
          for (const { station: unplacedStation } of unplacedStations) {
            stationToRow.set(unplacedStation.id, currentRow);
            rows.push({
              index: currentRow,
              isJunction: false,
            });
            currentRow++;
          }
          unplacedStations.length = 0;
        }
      } else {
        // New station unique to this line
        unplacedStations.push({ station, afterRow: lastKnownRow });
      }
    }
    
    // Place any remaining unplaced stations at the end
    for (const { station } of unplacedStations) {
      stationToRow.set(station.id, currentRow);
      rows.push({
        index: currentRow,
        isJunction: false,
      });
      currentRow++;
    }
  }

  // Step 3: Build columns (one per line)
  const columns: TrackColumn[] = lineIds.map((lineId, columnIndex) => {
    const stations = getLineStations(lineId);
    const columnStations: ColumnStation[] = stations.map(station => ({
      id: station.id,
      name: station.name,
      rowIndex: stationToRow.get(station.id) ?? 0,
      isTerminal: station.type === "terminal",
      isExpress: station.express ?? false,
    }));

    // Sort by row index to ensure proper ordering
    columnStations.sort((a, b) => a.rowIndex - b.rowIndex);

    return {
      lineId,
      columnIndex,
      color: getLineColor(lineId),
      stations: columnStations,
    };
  });

  // Step 4: Build junctions list
  const junctions: Junction[] = [];
  for (const [stationId, lines] of stationToLines) {
    if (lines.size > 1) {
      const linesArray = Array.from(lines);
      const rowIndex = stationToRow.get(stationId) ?? 0;
      const station = getLineStations(linesArray[0] as LineId).find(s => s.id === stationId);
      
      // Find which columns connect to this junction
      const columnIndices = linesArray
        .map(l => lineIds.indexOf(l as LineId))
        .filter(idx => idx !== -1);

      junctions.push({
        rowIndex,
        stationId,
        stationName: station?.name ?? stationId,
        lines: linesArray,
        columnIndices,
        colors: linesArray.map(l => getLineColor(l as LineId)),
      });
    }
  }

  // Sort junctions by row index
  junctions.sort((a, b) => a.rowIndex - b.rowIndex);

  return {
    columns,
    rows,
    junctions,
    totalRows: rows.length,
  };
}

/**
 * Get the column index for a specific line in the layout
 */
export function getColumnForLine(lineId: string, layout: MultiTrackLayout): number {
  const column = layout.columns.find(c => c.lineId === lineId);
  return column?.columnIndex ?? 0;
}

/**
 * Get the row index for a specific station on a specific line
 */
export function getRowForStation(
  stationId: string, 
  lineId: string, 
  layout: MultiTrackLayout
): number {
  const baseId = stationId.replace(/[NS]$/, "");
  const column = layout.columns.find(c => c.lineId === lineId);
  if (!column) return -1;
  
  const station = column.stations.find(s => s.id === baseId);
  return station?.rowIndex ?? -1;
}

/**
 * Check if a station is a junction in the layout
 */
export function isJunctionStation(stationId: string, layout: MultiTrackLayout): boolean {
  const baseId = stationId.replace(/[NS]$/, "");
  return layout.junctions.some(j => j.stationId === baseId);
}

// ============================================================================
// Legacy Layout Functions (for backwards compatibility)
// ============================================================================

/**
 * Legacy track layout builder (single-track)
 */
export function buildTrackLayout(lineIds: LineId[]): TrackLayout {
  if (lineIds.length === 0) {
    return { segments: [], totalPositions: 0, stationLineMap: new Map() };
  }
  
  const primaryLineId = lineIds[0];
  const primaryStations = getLineStations(primaryLineId);
  const stationLineMap = new Map<string, string[]>();
  
  for (const station of primaryStations) {
    const servingLines: string[] = [];
    for (const lineId of lineIds) {
      if (isStationOnLine(lineId, station.id)) {
        servingLines.push(lineId);
      }
    }
    stationLineMap.set(station.id, servingLines);
  }
  
  const segment: TrackSegment = {
    id: "main-track",
    type: "trunk",
    lines: lineIds as string[],
    stations: primaryStations.map((station, index) => ({
      id: station.id,
      name: station.name,
      type: station.type,
      express: station.express,
      servedBy: stationLineMap.get(station.id) || [primaryLineId],
      globalIndex: index,
    })),
    colors: getSegmentColors(lineIds),
    xOffset: 0,
  };
  
  return {
    segments: [segment],
    totalPositions: primaryStations.length,
    stationLineMap,
  };
}

function getSegmentColors(lineIds: LineId[]): string[] {
  const colors = new Set<string>();
  for (const lineId of lineIds) {
    colors.add(getLineColor(lineId));
  }
  return Array.from(colors);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getStationXOffset(_stationId: string, _layout: TrackLayout): number {
  // TODO: Implement X offset calculation for multi-line view
  return 0;
}

export function getSegmentForStation(stationId: string, layout: TrackLayout): TrackSegment | null {
  const baseId = stationId.replace(/[NS]$/, "");
  for (const segment of layout.segments) {
    if (segment.stations.some(s => s.id === baseId)) {
      return segment;
    }
  }
  return null;
}

export function getStationGlobalIndex(stationId: string, layout: TrackLayout): number {
  const baseId = stationId.replace(/[NS]$/, "");
  for (const segment of layout.segments) {
    const station = segment.stations.find(s => s.id === baseId);
    if (station) {
      return station.globalIndex;
    }
  }
  return -1;
}

