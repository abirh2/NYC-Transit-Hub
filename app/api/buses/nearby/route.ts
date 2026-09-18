import { NextRequest, NextResponse } from "next/server";

import {
  getNearbyBusRealtime,
  MAX_NEARBY_BUS_STOP_IDS,
  normalizeNearbyBusStopIds,
} from "@/lib/transit/nearby-bus-service";
import type {
  ApiErrorResponse,
  ApiResponse,
  NearbyBusRealtimeResponse,
} from "@/types/api";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<NearbyBusRealtimeResponse> | ApiErrorResponse>> {
  const rawStopIds = request.nextUrl.searchParams.getAll("stopId");
  if (rawStopIds.length === 0 || rawStopIds.length > MAX_NEARBY_BUS_STOP_IDS) {
    return NextResponse.json({
      success: false,
      data: null,
      error: `Provide between 1 and ${MAX_NEARBY_BUS_STOP_IDS} stopId parameters.`,
      timestamp: new Date().toISOString(),
    }, { status: 400 });
  }
  const requestedStopIds = normalizeNearbyBusStopIds(rawStopIds);
  if (requestedStopIds.length === 0 || requestedStopIds.length !== new Set(rawStopIds.map((id) => id.trim())).size) {
    return NextResponse.json({
      success: false,
      data: null,
      error: "One or more stop IDs are invalid.",
      timestamp: new Date().toISOString(),
    }, { status: 400 });
  }

  const results = await getNearbyBusRealtime(requestedStopIds);
  const generatedAt = new Date().toISOString();
  return NextResponse.json({
    success: true,
    data: {
      results: results.map((result) => ({
        ...result,
        feedTimestamp: result.feedTimestamp?.toISOString() ?? null,
      })),
      requestedStopIds,
      generatedAt,
    },
    timestamp: generatedAt,
  });
}
