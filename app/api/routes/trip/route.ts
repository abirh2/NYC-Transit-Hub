import { NextRequest, NextResponse } from "next/server";

// MTA's OpenTripPlanner API
const OTP_API_URL = "https://otp-mta-prod.camsys-apps.com/otp/routers/default/plan";
const OTP_API_KEY = "Z276E3rCeTzOQEoBPPN4JCEc6GfvdnYE";

export interface OTPLeg {
  startTime: number;
  startTimeFmt: string;
  endTime: number;
  endTimeFmt: string;
  mode: "WALK" | "BUS" | "SUBWAY" | "TRAM" | "RAIL" | "FERRY";
  route?: string;
  routeColor?: string;
  routeId?: string;
  agencyName?: string;
  headsign?: string;
  tripHeadsign?: string;
  duration: number;
  distance: number;
  from: {
    name: string;
    stopId?: string;
    lon: number;
    lat: number;
    departure?: number;
    departureFmt?: string;
  };
  to: {
    name: string;
    stopId?: string;
    lon: number;
    lat: number;
    arrival?: number;
    arrivalFmt?: string;
  };
  intermediateStops?: Array<{
    name: string;
    stopId: string;
    lon: number;
    lat: number;
    arrival: number;
    departure: number;
  }>;
  steps?: Array<{
    distance: number;
    relativeDirection: string;
    streetName: string;
    absoluteDirection?: string;
    instructionText?: string;
  }>;
  transitLeg: boolean;
}

export interface OTPItinerary {
  duration: number;
  startTime: number;
  startTimeFmt: string;
  endTime: number;
  endTimeFmt: string;
  walkTime: number;
  transitTime: number;
  waitingTime: number;
  walkDistance: number;
  transfers: number;
  legs: OTPLeg[];
}

export interface OTPResponse {
  requestParameters: Record<string, string>;
  plan?: {
    date: number;
    from: { name: string; lon: number; lat: number };
    to: { name: string; lon: number; lat: number };
    itineraries: OTPItinerary[];
  };
  error?: {
    id: number;
    msg: string;
    message: string;
    noPath?: boolean;
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const fromLat = searchParams.get("fromLat");
  const fromLon = searchParams.get("fromLon");
  const toLat = searchParams.get("toLat");
  const toLon = searchParams.get("toLon");
  const wheelchair = searchParams.get("wheelchair") ?? "false";
  const date = searchParams.get("date"); // MM/DD/YY format
  const time = searchParams.get("time"); // h:mma format
  const numItineraries = searchParams.get("numItineraries") ?? "3";
  
  if (!fromLat || !fromLon || !toLat || !toLon) {
    return NextResponse.json({
      success: false,
      error: "Missing coordinates. Required: fromLat, fromLon, toLat, toLon"
    }, { status: 400 });
  }
  
  // Build OTP API URL - use NYC timezone
  const now = new Date();
  const nycFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
  
  const parts = nycFormatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || "";
  
  const defaultDate = `${getPart("month")}/${getPart("day")}/${getPart("year")}`;
  const hour = getPart("hour");
  const minute = getPart("minute");
  const dayPeriod = getPart("dayPeriod").toLowerCase();
  const defaultTime = `${hour}:${minute}${dayPeriod}`;
  
  const params = new URLSearchParams({
    apikey: OTP_API_KEY,
    fromPlace: `${fromLat},${fromLon}`,
    toPlace: `${toLat},${toLon}`,
    mode: "TRANSIT,WALK",
    numItineraries,
    showIntermediateStops: "true",
    maxWalkDistance: "1200", // ~0.75 miles
    wheelchair,
    date: date || defaultDate,
    time: time || defaultTime,
    arriveBy: "false",
    optimize: "TRANSFERS"
  });
  
  try {
    const response = await fetch(`${OTP_API_URL}?${params}`, {
      headers: {
        "User-Agent": "NYC-Transit-Hub/1.0"
      },
      // Add timeout
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      throw new Error(`OTP API returned ${response.status}`);
    }
    
    const data: OTPResponse = await response.json();
    
    if (data.error) {
      return NextResponse.json({
        success: false,
        error: data.error.msg || "No route found",
        noPath: data.error.noPath
      });
    }
    
    if (!data.plan || data.plan.itineraries.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No routes found for this trip",
        noPath: true
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        from: data.plan.from,
        to: data.plan.to,
        itineraries: data.plan.itineraries,
        wheelchair: wheelchair === "true"
      }
    });
  } catch (error) {
    console.error("OTP API error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch trip"
    }, { status: 500 });
  }
}

