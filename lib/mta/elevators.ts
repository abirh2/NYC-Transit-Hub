/**
 * MTA Elevator/Escalator Status Client
 * Fetches and parses elevator/escalator outage data
 * 
 * VERIFIED against real API response on 2024-11-28
 * API returns array directly (not wrapped in object)
 * Outage API uses "equipment" field, Equipment API uses "equipmentno"
 */

import { z } from "zod";
import type { EquipmentOutage, EquipmentType } from "@/types/mta";
import { ELEVATOR_FEED_URLS } from "./config";

// ============================================================================
// Zod Schemas for Validation (matching actual MTA API response)
// ============================================================================

// Outage response schema - returns array directly
const OutageItemSchema = z.object({
  station: z.string(),
  borough: z.string().optional().nullable(),
  trainno: z.string().optional().nullable(), // e.g., "A/C/E" or "6"
  equipment: z.string(), // Equipment ID (different from equipments API!)
  equipmenttype: z.string(), // "EL" or "ES"
  serving: z.string().optional().nullable(),
  ADA: z.string().optional().nullable(), // "Y" or "N"
  outagedate: z.string().optional().nullable(), // "MM/DD/YYYY HH:MM:SS AM/PM"
  estimatedreturntoservice: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  isupcomingoutage: z.string().optional().nullable(), // "Y" or "N"
  ismaintenanceoutage: z.string().optional().nullable(), // "Y" or "N"
});

const OutageArraySchema = z.array(OutageItemSchema);

// Equipment list schema - returns array directly
const EquipmentItemSchema = z.object({
  station: z.string(),
  borough: z.string().optional().nullable(),
  trainno: z.string().optional().nullable(),
  equipmentno: z.string(), // Different from outage API!
  equipmenttype: z.string(),
  serving: z.string().optional().nullable(),
  ADA: z.string().optional().nullable(),
  isactive: z.string().optional().nullable(), // "Y" or "N"
  nonNYCT: z.string().optional().nullable(),
  shortdescription: z.string().optional().nullable(),
  linesservedbyelevator: z.string().optional().nullable(),
  elevatorsgtfsstopid: z.string().optional().nullable(),
  elevatormrn: z.string().optional().nullable(),
  stationcomplexid: z.string().optional().nullable(),
  nextadanorth: z.string().optional().nullable(),
  nextadasouth: z.string().optional().nullable(),
  redundant: z.union([z.number(), z.string()]).optional().nullable(),
  busconnections: z.string().optional().nullable(),
  alternativeroute: z.string().optional().nullable(),
});

const EquipmentArraySchema = z.array(EquipmentItemSchema);

// ============================================================================
// Elevator Status Fetching
// ============================================================================

/**
 * Fetch current elevator/escalator outages
 */
export async function fetchCurrentOutages(): Promise<EquipmentOutage[]> {
  try {
    const response = await fetch(ELEVATOR_FEED_URLS.currentOutages, {
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch outages: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return parseOutageResponse(data);
  } catch (error) {
    console.error("Error fetching outages:", error);
    return [];
  }
}

/**
 * Fetch upcoming planned outages
 */
export async function fetchUpcomingOutages(): Promise<EquipmentOutage[]> {
  try {
    const response = await fetch(ELEVATOR_FEED_URLS.upcomingOutages, {
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 300 },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch upcoming outages: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return parseOutageResponse(data);
  } catch (error) {
    console.error("Error fetching upcoming outages:", error);
    return [];
  }
}

/**
 * Fetch all equipment (for reference data)
 */
export async function fetchAllEquipment(): Promise<EquipmentOutage[]> {
  try {
    const response = await fetch(ELEVATOR_FEED_URLS.allEquipment, {
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour (mostly static data)
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch equipment: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return parseEquipmentResponse(data);
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return [];
  }
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse outage response (array format)
 */
function parseOutageResponse(data: unknown): EquipmentOutage[] {
  const result = OutageArraySchema.safeParse(data);
  
  if (!result.success) {
    console.error("Failed to parse outage response:", result.error.issues);
    return [];
  }
  
  const outages: EquipmentOutage[] = [];
  
  for (const outage of result.data) {
    const equipmentType = parseEquipmentType(outage.equipmenttype);
    const trainLines = parseTrainLines(outage.trainno);
    
    outages.push({
      equipmentId: outage.equipment,
      stationName: outage.station,
      borough: outage.borough || null,
      equipmentType,
      serving: outage.serving || null,
      adaCompliant: outage.ADA === "Y",
      isActive: false, // This is an outage, so not active
      outageReason: outage.reason || null,
      outageStartTime: parseDate(outage.outagedate),
      estimatedReturn: parseDate(outage.estimatedreturntoservice),
      trainLines,
    });
  }
  
  return outages;
}

/**
 * Parse equipment list response (array format)
 */
function parseEquipmentResponse(data: unknown): EquipmentOutage[] {
  const result = EquipmentArraySchema.safeParse(data);
  
  if (!result.success) {
    console.error("Failed to parse equipment response:", result.error.issues);
    return [];
  }
  
  const equipment: EquipmentOutage[] = [];
  
  for (const eq of result.data) {
    const equipmentType = parseEquipmentType(eq.equipmenttype);
    const trainLines = parseTrainLines(eq.trainno || eq.linesservedbyelevator);
    
    equipment.push({
      equipmentId: eq.equipmentno,
      stationName: eq.station,
      borough: eq.borough || null,
      equipmentType,
      serving: eq.serving || null,
      adaCompliant: eq.ADA === "Y",
      isActive: eq.isactive !== "N", // Default to active unless explicitly "N"
      outageReason: null,
      outageStartTime: null,
      estimatedReturn: null,
      trainLines,
    });
  }
  
  return equipment;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse equipment type from MTA code
 */
function parseEquipmentType(typeCode: string): EquipmentType {
  const upper = typeCode.toUpperCase();
  if (upper === "ES" || upper.includes("ESCALATOR")) return "ESCALATOR";
  return "ELEVATOR"; // Default to elevator
}

/**
 * Parse train lines from string (e.g., "A/C/E" or "6" or "F/G")
 */
function parseTrainLines(trainStr: string | null | undefined): string[] {
  if (!trainStr) return [];
  
  // Split by common separators and clean up
  return trainStr
    .split(/[,/]/)
    .map(line => line.trim().toUpperCase())
    .filter(line => line.length > 0 && line.length <= 4); // Allow "LIRR" etc.
}

/**
 * Parse date string to Date object
 * MTA dates are in format "MM/DD/YYYY HH:MM:SS AM/PM"
 */
function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  
  try {
    // Try standard Date parsing first
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
    
    // Try parsing MM/DD/YYYY HH:MM:SS AM/PM format
    const match = dateStr.match(
      /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?/i
    );
    if (match) {
      const [, month, day, year, hours, minutes, seconds, ampm] = match;
      let hour = parseInt(hours);
      
      // Handle AM/PM
      if (ampm) {
        if (ampm.toUpperCase() === "PM" && hour !== 12) hour += 12;
        if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;
      }
      
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        hour,
        parseInt(minutes),
        parseInt(seconds)
      );
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Filter outages by station or line
 */
export function filterOutages(
  outages: EquipmentOutage[],
  options?: {
    stationName?: string;
    line?: string;
    equipmentType?: EquipmentType;
    adaOnly?: boolean;
  }
): EquipmentOutage[] {
  let filtered = outages;
  
  if (options?.stationName) {
    const searchTerm = options.stationName.toLowerCase();
    filtered = filtered.filter(o => 
      o.stationName.toLowerCase().includes(searchTerm)
    );
  }
  
  if (options?.line) {
    filtered = filtered.filter(o => 
      o.trainLines.includes(options.line!.toUpperCase())
    );
  }
  
  if (options?.equipmentType) {
    filtered = filtered.filter(o => o.equipmentType === options.equipmentType);
  }
  
  if (options?.adaOnly) {
    filtered = filtered.filter(o => o.adaCompliant);
  }
  
  return filtered;
}

/**
 * Get summary statistics for outages
 */
export function getOutageSummary(outages: EquipmentOutage[]): {
  totalOutages: number;
  elevatorOutages: number;
  escalatorOutages: number;
  adaOutages: number;
  byBorough: Record<string, number>;
} {
  const byBorough: Record<string, number> = {};
  
  let elevatorOutages = 0;
  let escalatorOutages = 0;
  let adaOutages = 0;
  
  for (const outage of outages) {
    if (outage.equipmentType === "ELEVATOR") elevatorOutages++;
    if (outage.equipmentType === "ESCALATOR") escalatorOutages++;
    if (outage.adaCompliant) adaOutages++;
    
    const borough = outage.borough || "Unknown";
    byBorough[borough] = (byBorough[borough] ?? 0) + 1;
  }
  
  return {
    totalOutages: outages.length,
    elevatorOutages,
    escalatorOutages,
    adaOutages,
    byBorough,
  };
}
