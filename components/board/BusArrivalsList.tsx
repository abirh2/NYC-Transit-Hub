"use client";

/**
 * BusArrivalsList Component
 * 
 * Displays a list of bus arrivals grouped by route.
 * Shows route, headsign, minutes away, and distance.
 */

import { Spinner } from "@heroui/react";
import { AlertCircle, Clock } from "lucide-react";
import type { BusArrival } from "@/types/mta";

interface BusArrivalsListProps {
  /** Arrivals to display */
  arrivals: BusArrival[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Error message if any */
  error?: string | null;
  /** Header label */
  headerLabel?: string;
  /** Maximum number of arrivals to show */
  maxArrivals?: number;
  /** Whether to show compact view */
  compact?: boolean;
  /** Group arrivals by route */
  groupByRoute?: boolean;
}

/**
 * Format minutes away for display
 */
function formatMinutesAway(minutes: number | null): string {
  if (minutes === null) return "---";
  if (minutes <= 0) return "Now";
  if (minutes === 1) return "1 min";
  return `${minutes} min`;
}

/**
 * Format distance for display
 */
function formatDistance(meters: number | null): string {
  if (meters === null) return "";
  if (meters < 100) return "nearby";
  if (meters < 1609) {
    return `${Math.round(meters / 100) * 100}m`;
  }
  return `${(meters / 1609).toFixed(1)} mi`;
}

/**
 * Get route badge color based on route type
 */
function getRouteColor(routeId: string): string {
  // Express routes
  if (routeId.startsWith("BM") || routeId.startsWith("QM") || 
      routeId.startsWith("BXM") || routeId.startsWith("SIM") || 
      routeId.startsWith("X")) {
    return "#6E3219"; // Brown for express
  }
  // SBS routes (with + suffix)
  if (routeId.includes("+")) {
    return "#B933AD"; // Purple for SBS
  }
  // Local routes by borough
  if (routeId.startsWith("M")) return "#0039A6"; // Blue for Manhattan
  if (routeId.startsWith("B")) return "#00933C"; // Green for Brooklyn
  if (routeId.startsWith("Q")) return "#FCCC0A"; // Yellow for Queens
  if (routeId.startsWith("BX") || routeId.startsWith("Bx")) return "#FF6319"; // Orange for Bronx
  if (routeId.startsWith("S")) return "#808183"; // Gray for Staten Island
  return "#3b82f6"; // Default blue
}

/**
 * Get text color for route badge
 */
function getTextColor(routeId: string): string {
  // Yellow badges need dark text
  if (routeId.startsWith("Q") && !routeId.startsWith("QM")) {
    return "#000000";
  }
  return "#FFFFFF";
}

export function BusArrivalsList({
  arrivals,
  isLoading = false,
  error = null,
  headerLabel,
  maxArrivals = 10,
  compact = false,
  groupByRoute = false,
}: BusArrivalsListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Spinner size="md" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg bg-danger/10 text-danger">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // Empty state
  if (arrivals.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg bg-default-100 text-foreground/60">
        <Clock className="h-4 w-4 shrink-0" />
        <p className="text-sm">No buses nearby</p>
      </div>
    );
  }

  // Limit arrivals
  const displayArrivals = arrivals.slice(0, maxArrivals);

  // Group by route if requested
  if (groupByRoute) {
    const grouped = new Map<string, BusArrival[]>();
    for (const arrival of displayArrivals) {
      const existing = grouped.get(arrival.routeId) ?? [];
      existing.push(arrival);
      grouped.set(arrival.routeId, existing);
    }

    return (
      <div className="space-y-4">
        {headerLabel && (
          <p className="text-xs font-medium text-foreground/50 uppercase tracking-wider">
            {headerLabel}
          </p>
        )}
        {Array.from(grouped.entries()).map(([routeId, routeArrivals]) => (
          <div key={routeId} className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded text-xs font-bold"
                style={{
                  backgroundColor: getRouteColor(routeId),
                  color: getTextColor(routeId),
                }}
              >
                {routeId}
              </span>
              <span className="text-sm text-foreground/70">
                {routeArrivals[0]?.headsign || ""}
              </span>
            </div>
            <div className="pl-8 space-y-1">
              {routeArrivals.slice(0, 3).map((arrival, index) => (
                <div
                  key={`${arrival.vehicleId}-${index}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-foreground/60">
                    {formatDistance(arrival.distanceFromStop)}
                  </span>
                  <span
                    className={`font-medium ${
                      arrival.minutesAway !== null && arrival.minutesAway <= 1
                        ? "text-success"
                        : arrival.minutesAway !== null && arrival.minutesAway <= 5
                        ? "text-warning"
                        : "text-foreground"
                    }`}
                  >
                    {formatMinutesAway(arrival.minutesAway)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Flat list view
  return (
    <div className="space-y-1">
      {headerLabel && (
        <p className="text-xs font-medium text-foreground/50 uppercase tracking-wider mb-2">
          {headerLabel}
        </p>
      )}
      <div className={compact ? "space-y-2" : "space-y-3"}>
        {displayArrivals.map((arrival, index) => (
          <div
            key={`${arrival.vehicleId}-${index}`}
            className={`flex items-center justify-between ${
              compact ? "py-1" : "py-2"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`px-2 py-0.5 rounded font-bold ${compact ? "text-xs" : "text-sm"}`}
                style={{
                  backgroundColor: getRouteColor(arrival.routeId),
                  color: getTextColor(arrival.routeId),
                }}
              >
                {arrival.routeId}
              </span>
              <div className="min-w-0">
                <p className={`text-foreground truncate ${compact ? "text-sm" : ""}`}>
                  {arrival.headsign || "Bus"}
                </p>
                {!compact && arrival.nextStopName && (
                  <p className="text-xs text-foreground/50 truncate">
                    Next: {arrival.nextStopName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!compact && arrival.distanceFromStop && (
                <span className="text-xs text-foreground/50">
                  {formatDistance(arrival.distanceFromStop)}
                </span>
              )}
              <span
                className={`font-semibold ${
                  arrival.minutesAway !== null && arrival.minutesAway <= 1
                    ? "text-success"
                    : arrival.minutesAway !== null && arrival.minutesAway <= 5
                    ? "text-warning"
                    : "text-foreground"
                } ${compact ? "text-sm" : ""}`}
              >
                {formatMinutesAway(arrival.minutesAway)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

