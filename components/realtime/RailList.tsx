"use client";

/**
 * RailList Component
 * 
 * Displays a list of rail arrivals for a selected branch/line.
 * Shows direction, destination, ETA, and delay status.
 */

import { Card, CardBody, Spinner, Chip } from "@heroui/react";
import { TrainFront, MapPin, Clock, ArrowRight, AlertCircle } from "lucide-react";
import { RailBadge } from "@/components/ui/RailBadge";
import { getRailStationName } from "@/lib/gtfs/rail-stations";
import type { RailArrival, TransitMode } from "@/types/mta";
import { formatDistanceToNow } from "date-fns";

interface RailListProps {
  /** Transit mode */
  mode: TransitMode;
  /** Selected branch/line ID */
  selectedBranch: string | null;
  /** Selected branch name */
  selectedBranchName?: string;
  /** Rail arrivals from API */
  trains: RailArrival[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Error message if any */
  error?: string | null;
  /** Last updated timestamp */
  lastUpdated?: Date | null;
}

/**
 * Format minutes away for display
 */
function formatMinutesAway(minutes: number): string {
  if (minutes <= 0) return "Now";
  if (minutes === 1) return "1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format delay for display
 */
function formatDelay(delaySeconds: number): string | null {
  if (Math.abs(delaySeconds) < 60) return null; // Less than a minute, ignore
  const minutes = Math.round(delaySeconds / 60);
  if (minutes > 0) return `${minutes} min late`;
  return `${Math.abs(minutes)} min early`;
}

/**
 * Get color based on minutes away
 */
function getMinutesColor(minutes: number): "success" | "warning" | "default" {
  if (minutes <= 5) return "success";
  if (minutes <= 15) return "warning";
  return "default";
}

export function RailList({
  mode,
  selectedBranch,
  selectedBranchName,
  trains,
  isLoading = false,
  error = null,
  lastUpdated = null,
}: RailListProps) {
  const modeLabel = mode === "lirr" ? "LIRR" : "Metro-North";
  const branchLabel = mode === "lirr" ? "branch" : "line";

  // Empty state - no branch selected
  if (!selectedBranch) {
    return (
      <Card className="h-full">
        <CardBody className="flex flex-col items-center justify-center h-full text-center">
          <TrainFront className="h-12 w-12 text-foreground/30 mb-4" />
          <p className="text-foreground/60">
            Select a {modeLabel} {branchLabel} above to see live arrivals
          </p>
        </CardBody>
      </Card>
    );
  }

  // Loading state
  if (isLoading && trains.length === 0) {
    return (
      <Card className="h-full">
        <CardBody className="flex flex-col items-center justify-center h-full">
          <Spinner size="lg" />
          <p className="text-foreground/60 mt-4">Loading trains...</p>
        </CardBody>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="h-full">
        <CardBody className="flex flex-col items-center justify-center h-full text-center">
          <p className="text-danger mb-2">{error}</p>
          <p className="text-foreground/60 text-sm">Please try again later</p>
        </CardBody>
      </Card>
    );
  }

  // No trains found
  if (trains.length === 0) {
    return (
      <Card className="h-full">
        <CardBody className="flex flex-col items-center justify-center h-full text-center">
          <TrainFront className="h-12 w-12 text-foreground/30 mb-4" />
          <p className="text-foreground/60">
            No scheduled trains on {selectedBranchName ?? `this ${branchLabel}`}
          </p>
          <p className="text-foreground/40 text-sm mt-2">
            Service may be limited at this time
          </p>
        </CardBody>
      </Card>
    );
  }

  // Group trains by direction
  const trainsByDirection = trains.reduce((acc, train) => {
    const directionLabel = train.direction === "inbound" 
      ? mode === "lirr" ? "To Penn Station" : "To Grand Central"
      : mode === "lirr" ? "From Penn Station" : "From Grand Central";
    
    if (!acc[directionLabel]) acc[directionLabel] = [];
    acc[directionLabel].push(train);
    return acc;
  }, {} as Record<string, RailArrival[]>);

  return (
    <Card className="h-full overflow-hidden">
      <CardBody className="p-0">
        {/* Header */}
        <div className="p-4 border-b border-divider bg-default-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RailBadge 
                branchId={selectedBranch}
                branchName={selectedBranchName ?? selectedBranch}
                mode={mode}
                size="lg"
              />
              <div>
                <h3 className="font-semibold">{selectedBranchName}</h3>
                <p className="text-xs text-foreground/60">
                  {trains.length} train{trains.length !== 1 ? "s" : ""} scheduled
                </p>
              </div>
            </div>
            {lastUpdated && (
              <div className="text-xs text-foreground/50 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              </div>
            )}
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 mt-2 text-xs text-foreground/50">
              <Spinner size="sm" />
              Refreshing...
            </div>
          )}
        </div>

        {/* Train List by Direction */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 400px)" }}>
          {Object.entries(trainsByDirection).map(([direction, directionTrains]) => (
            <div key={direction} className="border-b border-divider last:border-b-0">
              {/* Direction Header */}
              <div className="px-4 py-2 bg-default-50/50">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-3.5 w-3.5 text-foreground/50" />
                  <span className="text-sm font-medium text-foreground/70">
                    {direction}
                  </span>
                  <span className="text-xs text-foreground/40">
                    ({directionTrains.length})
                  </span>
                </div>
              </div>

              {/* Trains in this direction */}
              <div className="divide-y divide-divider/50">
                {directionTrains.slice(0, 15).map((train, index) => {
                  const delayText = formatDelay(train.delay);
                  const isDelayed = train.delay > 120; // More than 2 minutes
                  
                  return (
                    <div 
                      key={`${train.tripId}-${index}`}
                      className="px-4 py-3 hover:bg-default-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Train Info */}
                        <div className="flex-1 min-w-0">
                          {/* Stop Name */}
                          {train.stopId && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <MapPin className="h-3.5 w-3.5 text-foreground/50 flex-shrink-0" />
                              <span className="truncate">
                                {getRailStationName(train.stopId, mode)}
                              </span>
                            </div>
                          )}
                          
                          {/* Train ID & Delay */}
                          <div className="flex items-center gap-2 mt-1 text-xs text-foreground/50">
                            {train.trainId && (
                              <span>Train {train.trainId}</span>
                            )}
                            {delayText && (
                              <span className={`flex items-center gap-1 ${isDelayed ? "text-warning" : "text-success"}`}>
                                <AlertCircle className="h-3 w-3" />
                                {delayText}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* ETA */}
                        <div className="flex-shrink-0 text-right">
                          <Chip
                            size="sm"
                            variant="flat"
                            color={getMinutesColor(train.minutesAway)}
                            classNames={{
                              base: "h-6",
                              content: "font-semibold",
                            }}
                          >
                            {formatMinutesAway(train.minutesAway)}
                          </Chip>
                          {train.arrivalTime && (
                            <p className="text-xs text-foreground/40 mt-0.5">
                              {train.arrivalTime.toLocaleTimeString([], { 
                                hour: "numeric", 
                                minute: "2-digit" 
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

