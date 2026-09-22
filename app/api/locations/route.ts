import { NextRequest, NextResponse } from "next/server";

import {
  locationSearchRequestSchema,
  searchLocations,
} from "@/lib/transit/location-search";
import type { ApiErrorResponse, ApiResponse } from "@/types/api";
import type { LocationSearchResponse } from "@/types/location";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<LocationSearchResponse> | ApiErrorResponse>> {
  const parsed = locationSearchRequestSchema.safeParse({
    query: request.nextUrl.searchParams.get("query") ?? "",
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({
      success: false,
      data: null,
      error: "Enter 2–100 characters and request no more than 10 results.",
      timestamp: new Date().toISOString(),
    }, { status: 400 });
  }

  try {
    const locations = await searchLocations(parsed.data.query, parsed.data.limit);
    return NextResponse.json({
      success: true,
      data: { locations },
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      success: false,
      data: null,
      error: "Location search is temporarily unavailable.",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
