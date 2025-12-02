/**
 * Commute Summary API
 * 
 * GET - Get commute summary with departure suggestion
 * Uses saved settings and OTP API to calculate trip times
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { format, differenceInMinutes } from "date-fns";

// OTP API configuration (same as routes/trip)
const OTP_API_URL = "https://otp-mta-prod.camsys-apps.com/otp/routers/default/plan";
const OTP_API_KEY = "Z276E3rCeTzOQEoBPPN4JCEc6GfvdnYE";

interface OTPLeg {
  mode: string;
  route?: string;
  routeShortName?: string;
  routeLongName?: string;
  duration: number;
  transitLeg: boolean;
  from: { name: string; stopId?: string };
  to: { name: string; stopId?: string };
  startTime: number;
  endTime: number;
  distance?: number;
}

interface OTPItinerary {
  duration: number;
  startTime: number;
  endTime: number;
  walkTime: number;
  transitTime: number;
  transfers: number;
  legs: OTPLeg[];
}

// Simplified leg for response
interface RouteLeg {
  mode: string;
  route: string | null;
  from: string;
  to: string;
  duration: number; // minutes
  isTransit: boolean;
  departureTime: string; // formatted time
  arrivalTime: string; // formatted time
}

interface OTPResponse {
  plan?: {
    itineraries: OTPItinerary[];
  };
  error?: {
    msg: string;
  };
}

// Response helpers
function jsonResponse<T>(data: T, status = 200) {
  return NextResponse.json({
    success: status < 400,
    data,
    timestamp: new Date().toISOString(),
  }, { status });
}

function errorResponse(error: string, status = 400) {
  return NextResponse.json({
    success: false,
    data: null,
    error,
    timestamp: new Date().toISOString(),
  }, { status });
}

/**
 * Extract transit route summary (e.g., "F → A → 1")
 */
function extractRouteString(itinerary: OTPItinerary): string {
  const transitLegs = itinerary.legs
    .filter(leg => leg.transitLeg && (leg.route || leg.routeShortName))
    .map(leg => leg.routeShortName || leg.route!);
  
  if (transitLegs.length === 0) return "Walk";
  return transitLegs.join(" → ");
}

/**
 * Extract detailed legs from itinerary
 */
function extractLegs(itinerary: OTPItinerary): RouteLeg[] {
  return itinerary.legs.map(leg => ({
    mode: leg.mode,
    route: leg.routeShortName || leg.route || null,
    from: leg.from.name,
    to: leg.to.name,
    duration: Math.round(leg.duration / 60),
    isTransit: leg.transitLeg,
    // Add timing info
    departureTime: format(new Date(leg.startTime), "h:mm a"),
    arrivalTime: format(new Date(leg.endTime), "h:mm a"),
  }));
}

/**
 * Parse itinerary into response format
 */
function parseItinerary(itinerary: OTPItinerary, now: Date) {
  const durationMinutes = Math.round(itinerary.duration / 60);
  const routeString = extractRouteString(itinerary);
  const departureTime = new Date(itinerary.startTime);
  const arrivalTime = new Date(itinerary.endTime);
  const legs = extractLegs(itinerary);
  
  const minutesUntilDeparture = differenceInMinutes(departureTime, now);
  const leaveIn = minutesUntilDeparture <= 0 
    ? "Now" 
    : minutesUntilDeparture < 60 
      ? `${minutesUntilDeparture} min`
      : `${Math.floor(minutesUntilDeparture / 60)}h ${minutesUntilDeparture % 60}m`;

  return {
    leaveIn,
    leaveAt: departureTime.toISOString(),
    arriveBy: format(arrivalTime, "h:mm a"),
    duration: durationMinutes,
    route: routeString,
    transfers: itinerary.transfers,
    walkTime: Math.round(itinerary.walkTime / 60),
    legs,
  };
}

/**
 * Parse target arrival time string (HH:MM) to today's Date
 * Returns null if the target time has already passed today
 */
function parseTargetArrival(targetArrival: string): { target: Date; isPastWindow: boolean } {
  const [hours, minutes] = targetArrival.split(":").map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  
  // Check if target has passed - give 1 hour grace period after target
  const graceWindow = new Date(target);
  graceWindow.setHours(graceWindow.getHours() + 1);
  
  const isPastWindow = now > graceWindow;
  
  return { target, isPastWindow };
}

/**
 * GET /api/commute/summary
 * Returns commute summary with real-time departure suggestion
 * Query params:
 *   - id: specific commute ID (optional, defaults to default commute)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const commuteId = searchParams.get("id");

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // For unauthenticated users, return not configured
    if (authError || !user) {
      return jsonResponse({
        isAuthenticated: false,
        isConfigured: false,
        leaveIn: null,
        leaveAt: null,
        arriveBy: null,
        duration: null,
        route: null,
        status: null,
        delayMinutes: null,
      });
    }

    // Fetch commute - specific one or default
    let commute;
    if (commuteId) {
      commute = await db.commute.findFirst({
        where: { id: commuteId, userId: user.id },
      });
    } else {
      // Get default commute, or first commute if none is default
      commute = await db.commute.findFirst({
        where: { userId: user.id, isDefault: true },
      });
      if (!commute) {
        commute = await db.commute.findFirst({
          where: { userId: user.id },
          orderBy: { sortOrder: "asc" },
        });
      }
    }

    // Alias for backwards compatibility
    const settings = commute ? {
      homeAddress: commute.fromAddress,
      homeLat: commute.fromLat,
      homeLon: commute.fromLon,
      workAddress: commute.toAddress,
      workLat: commute.toLat,
      workLon: commute.toLon,
      targetArrival: commute.targetArrival,
    } : null;

    // If no settings or incomplete settings
    if (!settings || !settings.homeAddress || !settings.workAddress ||
        settings.homeLat === null || settings.homeLon === null ||
        settings.workLat === null || settings.workLon === null) {
      return jsonResponse({
        isAuthenticated: true,
        isConfigured: false,
        leaveIn: null,
        leaveAt: null,
        arriveBy: null,
        duration: null,
        route: null,
        status: null,
        delayMinutes: null,
      });
    }

    // Get current time in NYC
    const now = new Date();
    const nycFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "numeric",
      day: "numeric",
      year: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    
    const parts = nycFormatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || "";
    const dateStr = `${getPart("month")}/${getPart("day")}/${getPart("year")}`;

    // Determine query mode:
    // If target arrival is set and in the future, use "arrive by" mode
    // Otherwise, use "depart now" mode
    let useArriveBy = false;
    let queryTime = `${getPart("hour")}:${getPart("minute")}${getPart("dayPeriod").toLowerCase()}`;
    
    if (settings.targetArrival) {
      const { target: targetTime, isPastWindow } = parseTargetArrival(settings.targetArrival);
      
      // If target is still in the future (not past window), query for arrival by that time
      if (!isPastWindow) {
        useArriveBy = true;
        // Format target time for OTP
        const targetHour = targetTime.getHours();
        const targetMinute = targetTime.getMinutes();
        const ampm = targetHour >= 12 ? "pm" : "am";
        const hour12 = targetHour > 12 ? targetHour - 12 : (targetHour === 0 ? 12 : targetHour);
        queryTime = `${hour12}:${targetMinute.toString().padStart(2, "0")}${ampm}`;
      }
    }

    // Call OTP API for trip - get 3 itineraries for alternatives
    const params = new URLSearchParams({
      apikey: OTP_API_KEY,
      fromPlace: `${settings.homeLat},${settings.homeLon}`,
      toPlace: `${settings.workLat},${settings.workLon}`,
      mode: "TRANSIT,WALK",
      numItineraries: "3",
      showIntermediateStops: "false",
      maxWalkDistance: "1200",
      wheelchair: "false",
      date: dateStr,
      time: queryTime,
      arriveBy: useArriveBy ? "true" : "false",
      optimize: "QUICK",
    });

    const response = await fetch(`${OTP_API_URL}?${params}`, {
      headers: { "User-Agent": "NYC-Transit-Hub/1.0" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error("OTP API error:", response.status);
      return jsonResponse({
        isAuthenticated: true,
        isConfigured: true,
        leaveIn: null,
        leaveAt: null,
        arriveBy: null,
        duration: null,
        route: null,
        status: "error",
        delayMinutes: null,
        error: "Unable to fetch trip data",
      });
    }

    const data: OTPResponse = await response.json();

    if (data.error || !data.plan || data.plan.itineraries.length === 0) {
      return jsonResponse({
        isAuthenticated: true,
        isConfigured: true,
        leaveIn: null,
        leaveAt: null,
        arriveBy: null,
        duration: null,
        route: null,
        status: "error",
        delayMinutes: null,
        error: data.error?.msg || "No route found",
      });
    }

    // Parse primary itinerary
    const primaryItinerary = data.plan.itineraries[0];
    const primary = parseItinerary(primaryItinerary, now);
    const arrivalTime = new Date(primaryItinerary.endTime);

    // Parse alternative itineraries (skip first, take up to 2 more)
    const alternatives = data.plan.itineraries.slice(1, 3).map(it => parseItinerary(it, now));

    // Determine status based on target arrival
    let status: "on_time" | "delayed" | "early" | null = null;
    let delayMinutes: number | null = null;
    let targetArrivalDisplay: string | null = null;
    let isPastWindow = false;

    if (settings.targetArrival) {
      const { target: targetTime, isPastWindow: pastWindow } = parseTargetArrival(settings.targetArrival);
      isPastWindow = pastWindow;
      targetArrivalDisplay = format(targetTime, "h:mm a");
      
      // Only calculate status if we're still within the commute window
      if (!isPastWindow) {
        const diff = differenceInMinutes(arrivalTime, targetTime);
        
        if (diff > 5) {
          status = "delayed";
          delayMinutes = diff;
        } else if (diff < -10) {
          status = "early";
          delayMinutes = Math.abs(diff);
        } else {
          status = "on_time";
          delayMinutes = 0;
        }
      }
    }

    return jsonResponse({
      isAuthenticated: true,
      isConfigured: true,
      // Commute info
      commuteId: commute?.id,
      commuteLabel: commute?.label,
      // Primary route info
      leaveIn: primary.leaveIn,
      leaveAt: primary.leaveAt,
      arriveBy: primary.arriveBy,
      duration: primary.duration,
      route: primary.route,
      transfers: primary.transfers,
      walkTime: primary.walkTime,
      legs: primary.legs,
      // Status info
      status,
      delayMinutes,
      targetArrival: targetArrivalDisplay,
      isPastWindow,
      // Alternative routes
      alternatives,
      // Location info for display
      fromAddress: settings?.homeAddress,
      toAddress: settings?.workAddress,
      // Legacy aliases
      homeAddress: settings?.homeAddress,
      workAddress: settings?.workAddress,
    });
  } catch (error) {
    console.error("Error fetching commute summary:", error);
    return errorResponse("Failed to fetch commute summary", 500);
  }
}

