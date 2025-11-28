"use client";

/**
 * ArrivalsList Component
 * 
 * Displays a list of train arrivals for a station.
 * Shows line icon, destination, and time until arrival.
 */

import { Chip, Spinner } from "@heroui/react";
import { AlertCircle, Clock } from "lucide-react";
import { SubwayBullet } from "@/components/ui";
import type { TrainArrival } from "@/types/mta";

interface ArrivalsListProps {
  /** Arrivals to display */
  arrivals: TrainArrival[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Error message if any */
  error?: string | null;
  /** Direction label (e.g., "Uptown & The Bronx") */
  directionLabel?: string;
  /** Maximum number of arrivals to show */
  maxArrivals?: number;
  /** Whether to show compact view */
  compact?: boolean;
}

/**
 * Format minutes away for display
 */
function formatMinutesAway(minutes: number): string {
  if (minutes <= 0) return "Now";
  if (minutes === 1) return "1 min";
  return `${minutes} min`;
}

/**
 * Get delay chip if train is significantly delayed
 */
function getDelayChip(delaySeconds: number) {
  if (delaySeconds < 60) return null; // Less than 1 minute delay
  
  const delayMinutes = Math.round(delaySeconds / 60);
  return (
    <Chip size="sm" color="warning" variant="flat" className="ml-2">
      +{delayMinutes} min
    </Chip>
  );
}

export function ArrivalsList({
  arrivals,
  isLoading = false,
  error = null,
  directionLabel,
  maxArrivals = 5,
  compact = false,
}: ArrivalsListProps) {
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
        <p className="text-sm">No upcoming trains</p>
      </div>
    );
  }

  // Limit arrivals
  const displayArrivals = arrivals.slice(0, maxArrivals);

  return (
    <div className="space-y-1">
      {directionLabel && (
        <p className="text-xs font-medium text-foreground/50 uppercase tracking-wider mb-2">
          {directionLabel}
        </p>
      )}
      <div className={compact ? "space-y-2" : "space-y-3"}>
        {displayArrivals.map((arrival, index) => (
          <div
            key={`${arrival.tripId}-${arrival.stopId}-${index}`}
            className={`flex items-center justify-between ${
              compact ? "py-1" : "py-2"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <SubwayBullet line={arrival.routeId} size={compact ? "sm" : "md"} />
              <div className="min-w-0">
                <p className={`text-foreground truncate ${compact ? "text-sm" : ""}`}>
                  {arrival.headsign || getDefaultHeadsign(arrival.routeId, arrival.direction)}
                </p>
                {!compact && !arrival.isAssigned && (
                  <p className="text-xs text-foreground/50">Scheduled</p>
                )}
              </div>
            </div>
            <div className="flex items-center shrink-0">
              <span
                className={`font-semibold ${
                  arrival.minutesAway <= 1
                    ? "text-success"
                    : arrival.minutesAway <= 5
                    ? "text-warning"
                    : "text-foreground"
                } ${compact ? "text-sm" : ""}`}
              >
                {formatMinutesAway(arrival.minutesAway)}
              </span>
              {!compact && getDelayChip(arrival.delay)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Get a default headsign based on line and direction
 * This is a fallback when the API doesn't provide a headsign
 */
function getDefaultHeadsign(routeId: string, direction: "N" | "S"): string {
  // Common terminal mappings for NYC subway
  const terminals: Record<string, { N: string; S: string }> = {
    "1": { N: "Van Cortlandt Park-242 St", S: "South Ferry" },
    "2": { N: "Wakefield-241 St", S: "Flatbush Av-Brooklyn College" },
    "3": { N: "Harlem-148 St", S: "New Lots Av" },
    "4": { N: "Woodlawn", S: "Crown Hts-Utica Av" },
    "5": { N: "Eastchester-Dyre Av", S: "Flatbush Av-Brooklyn College" },
    "6": { N: "Pelham Bay Park", S: "Brooklyn Bridge-City Hall" },
    "7": { N: "Flushing-Main St", S: "34 St-Hudson Yards" },
    A: { N: "Inwood-207 St", S: "Far Rockaway" },
    C: { N: "168 St", S: "Euclid Av" },
    E: { N: "Jamaica Center", S: "World Trade Center" },
    B: { N: "Bedford Park Blvd", S: "Brighton Beach" },
    D: { N: "Norwood-205 St", S: "Coney Island-Stillwell Av" },
    F: { N: "Jamaica-179 St", S: "Coney Island-Stillwell Av" },
    M: { N: "Forest Hills-71 Av", S: "Middle Village-Metropolitan Av" },
    G: { N: "Court Sq", S: "Church Av" },
    J: { N: "Jamaica Center", S: "Broad St" },
    Z: { N: "Jamaica Center", S: "Broad St" },
    L: { N: "8 Av", S: "Canarsie-Rockaway Pkwy" },
    N: { N: "Astoria-Ditmars Blvd", S: "Coney Island-Stillwell Av" },
    Q: { N: "96 St", S: "Coney Island-Stillwell Av" },
    R: { N: "Forest Hills-71 Av", S: "Bay Ridge-95 St" },
    W: { N: "Astoria-Ditmars Blvd", S: "Whitehall St" },
    S: { N: "Times Sq-42 St", S: "Grand Central-42 St" },
  };

  const terminal = terminals[routeId];
  if (terminal) {
    return terminal[direction];
  }

  return direction === "N" ? "Uptown" : "Downtown";
}

