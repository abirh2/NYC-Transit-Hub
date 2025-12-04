"use client";

/**
 * RailArrivalsList Component
 * 
 * Displays a list of rail arrivals for LIRR or Metro-North.
 * Shows train number, branch, direction, and time until arrival.
 */

import { Chip, Spinner, Tooltip } from "@heroui/react";
import { AlertCircle, Clock, Train as TrainIcon, Info } from "lucide-react";
import { RailBadge } from "@/components/ui/RailBadge";
import { getAllLirrBranches, getAllMnrLines } from "@/lib/gtfs/rail-stations";
import type { RailArrival, TransitMode } from "@/types/mta";

interface RailArrivalsListProps {
  /** Arrivals to display */
  arrivals: RailArrival[];
  /** Transit mode (lirr or metro-north) */
  mode: TransitMode;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Error message if any */
  error?: string | null;
  /** Direction label (e.g., "Inbound to Penn Station") */
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
  if (delaySeconds < 120) return null; // Less than 2 minutes delay
  
  const delayMinutes = Math.round(delaySeconds / 60);
  return (
    <Chip size="sm" color="warning" variant="flat" className="ml-2">
      +{delayMinutes} min
    </Chip>
  );
}

export function RailArrivalsList({
  arrivals,
  mode,
  isLoading = false,
  error = null,
  directionLabel,
  maxArrivals = 5,
  compact = false,
}: RailArrivalsListProps) {
  // Get branch info for displaying badges
  const branchInfo = mode === "lirr" ? getAllLirrBranches() : getAllMnrLines();
  const branchMap = new Map(branchInfo.map(b => [b.id, b]));

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

  // Check if any arrivals have delays to show the legend
  const hasDelays = arrivals.some(a => a.delay >= 120);

  return (
    <div className="space-y-1">
      {directionLabel && (
        <div className="flex items-center gap-2 mb-2">
          <p className="text-xs font-medium text-foreground/50 uppercase tracking-wider">
            {directionLabel}
          </p>
          {hasDelays && !compact && (
            <Tooltip
              content={
                <div className="px-1 py-2 max-w-xs">
                  <p className="text-sm font-semibold mb-1">Delay Indicator</p>
                  <p className="text-xs text-foreground/80">
                    The <span className="text-warning font-medium">+X min</span> badge shows how much later 
                    than scheduled the train is expected to arrive. For example, +10 min means the train 
                    is running 10 minutes behind schedule.
                  </p>
                </div>
              }
              placement="top"
            >
              <button className="text-foreground/40 hover:text-foreground/60 transition-colors">
                <Info className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
      )}
      <div className={compact ? "space-y-2" : "space-y-3"}>
        {displayArrivals.map((arrival, index) => {
          const branch = branchMap.get(arrival.routeId);
          
          return (
            <div
              key={`${arrival.tripId}-${arrival.stopId}-${index}`}
              className={`flex items-center justify-between ${
                compact ? "py-1" : "py-2"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Train icon or badge */}
                {branch ? (
                  <RailBadge
                    branchId={arrival.routeId}
                    branchName={branch.name}
                    mode={mode}
                    size={compact ? "sm" : "md"}
                    abbreviated
                  />
                ) : (
                  <TrainIcon className="h-5 w-5 text-foreground/50" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-foreground ${compact ? "text-sm" : ""}`}>
                      {arrival.branchName || branch?.name || "Train"}
                    </p>
                    {arrival.trainId && (
                      <span className="text-xs text-foreground/50 font-mono">
                        #{arrival.trainId}
                      </span>
                    )}
                  </div>
                  {!compact && (
                    <p className="text-xs text-foreground/50 capitalize">
                      {arrival.direction === "inbound" 
                        ? mode === "lirr" ? "To Penn Station" : "To Grand Central"
                        : mode === "lirr" ? "From Penn Station" : "From Grand Central"}
                    </p>
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
          );
        })}
      </div>
    </div>
  );
}

