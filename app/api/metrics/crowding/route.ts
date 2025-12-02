import { NextRequest, NextResponse } from "next/server";
import { 
  calculateRouteCrowding, 
  getNetworkCrowding,
  calculateRouteCrowdingEnhanced,
  getNetworkCrowdingEnhanced
} from "@/lib/crowding";
import { SubwayLine } from "@/types/mta";

export const revalidate = 60; // Cache for 60 seconds - crowding doesn't need sub-minute updates

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const routeId = searchParams.get("route");
  const enhanced = searchParams.get("enhanced") === "true";
  // const mode = searchParams.get("mode") || "subway"; // TODO: Implement bus/LIRR/Metro-North modes

  try {
    // Enhanced multi-factor crowding (new)
    if (enhanced) {
      if (routeId) {
        // Single route with segment breakdown
        const data = await calculateRouteCrowdingEnhanced(routeId as SubwayLine);
        if (!data) {
          return NextResponse.json(
            { error: "Route not found or no data available" },
            { status: 404 }
          );
        }
        return NextResponse.json(data);
      } else {
        // Network-wide enhanced crowding
        const data = await getNetworkCrowdingEnhanced();
        return NextResponse.json(data);
      }
    }

    // Legacy simple crowding (backward compatibility)
    if (routeId) {
      const data = await calculateRouteCrowding(routeId as SubwayLine);
      return NextResponse.json(data);
    } else {
      const data = await getNetworkCrowding();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("Error fetching crowding metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch crowding metrics" },
      { status: 500 }
    );
  }
}
