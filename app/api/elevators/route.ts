/**
 * Elevator/Escalator Status API
 * GET /api/elevators
 * 
 * Returns elevator and escalator status.
 * Fetches directly from MTA feeds.
 * 
 * Query Parameters:
 * - stationName: Filter by station name (partial match)
 * - line: Filter by subway line (e.g., "A", "F")
 * - equipmentType: Filter by type ("ELEVATOR" or "ESCALATOR")
 * - outagesOnly: If "true", only show equipment with outages
 * - adaOnly: If "true", only show ADA-compliant equipment
 * - limit: Maximum number of results
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchCurrentOutages, filterOutages, getOutageSummary } from "@/lib/mta";
import type { ElevatorsResponse, ApiResponse, ApiErrorResponse } from "@/types/api";
import type { EquipmentType } from "@/types/mta";

export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache for 5 minutes

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ElevatorsResponse> | ApiErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;
  
  // Parse query parameters
  const stationName = searchParams.get("stationName") ?? undefined;
  const line = searchParams.get("line") ?? undefined;
  const equipmentType = searchParams.get("equipmentType") as EquipmentType | undefined;
  // const outagesOnly = searchParams.get("outagesOnly") === "true"; // TODO: implement filter
  const adaOnly = searchParams.get("adaOnly") === "true";
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  try {
    // Fetch current outages from MTA
    let outages = await fetchCurrentOutages();
    
    // Apply filters
    outages = filterOutages(outages, {
      stationName,
      line,
      equipmentType,
      adaOnly,
    });

    // Apply limit
    if (limit && limit > 0) {
      outages = outages.slice(0, limit);
    }

    // Get summary statistics
    const summary = getOutageSummary(outages);

    return NextResponse.json({
      success: true,
      data: {
        equipment: outages,
        totalOutages: summary.totalOutages,
        lastUpdated: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching elevator status:", error);
    
    return NextResponse.json({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Failed to fetch elevator status",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

