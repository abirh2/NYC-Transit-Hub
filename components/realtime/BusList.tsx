"use client";

/**
 * BusList Component
 * 
 * Displays a list of bus arrivals for a selected route.
 * Shows destination, next stop, ETA, and distance.
 */

import { Card, CardBody, Spinner, Chip } from "@heroui/react";
import { Bus, MapPin, Clock, Navigation } from "lucide-react";
import { BusBadge } from "@/components/ui/BusBadge";
import type { BusArrival } from "@/types/mta";
import { formatDistanceToNow } from "date-fns";

interface BusListProps {
  /** Selected route ID */
  selectedRoute: string | null;
  /** Bus arrivals from API */
  buses: BusArrival[];
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
function formatMinutesAway(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes <= 0) return "Now";
  if (minutes === 1) return "1 min";
  return `${minutes} min`;
}

/**
 * Format distance for display
 */
function formatDistance(meters: number | null): string {
  if (meters === null) return "";
  if (meters < 100) return "arriving";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Get color based on minutes away
 */
function getMinutesColor(minutes: number | null): "success" | "warning" | "default" {
  if (minutes === null) return "default";
  if (minutes <= 2) return "success";
  if (minutes <= 5) return "warning";
  return "default";
}

export function BusList({
  selectedRoute,
  buses,
  isLoading = false,
  error = null,
  lastUpdated = null,
}: BusListProps) {
  // Empty state - no route selected
  if (!selectedRoute) {
    return (
      <Card className="h-full">
        <CardBody className="flex flex-col items-center justify-center h-full text-center">
          <Bus className="h-12 w-12 text-foreground/30 mb-4" />
          <p className="text-foreground/60">
            Select a bus route above to see live arrivals
          </p>
        </CardBody>
      </Card>
    );
  }

  // Loading state
  if (isLoading && buses.length === 0) {
    return (
      <Card className="h-full">
        <CardBody className="flex flex-col items-center justify-center h-full">
          <Spinner size="lg" />
          <p className="text-foreground/60 mt-4">Loading buses...</p>
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

  // No buses found
  if (buses.length === 0) {
    return (
      <Card className="h-full">
        <CardBody className="flex flex-col items-center justify-center h-full text-center">
          <Bus className="h-12 w-12 text-foreground/30 mb-4" />
          <p className="text-foreground/60">
            No active buses found for {selectedRoute}
          </p>
          <p className="text-foreground/40 text-sm mt-2">
            This route may not be running right now
          </p>
        </CardBody>
      </Card>
    );
  }

  // Group buses by direction
  const busesByDirection = buses.reduce((acc, bus) => {
    // Direction is typically "0" (outbound) or "1" (inbound)
    // We'll use destination as a more meaningful grouping if available
    const destination = bus.headsign ?? "Unknown";
    if (!acc[destination]) acc[destination] = [];
    acc[destination].push(bus);
    return acc;
  }, {} as Record<string, BusArrival[]>);

  return (
    <Card className="h-full overflow-hidden">
      <CardBody className="p-0 h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-divider bg-default-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BusBadge route={selectedRoute} size="lg" />
              <div>
                <h3 className="font-semibold">{selectedRoute} Bus</h3>
                <p className="text-xs text-foreground/60">
                  {buses.length} bus{buses.length !== 1 ? "es" : ""} active
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

        {/* Bus List by Destination */}
        <div className="flex-1 overflow-y-auto">
          {Object.entries(busesByDirection).map(([destination, directionBuses]) => (
            <div key={destination} className="border-b border-divider last:border-b-0">
              {/* Destination Header */}
              <div className="px-4 py-2 bg-default-50/50">
                <div className="flex items-center gap-2">
                  <Navigation className="h-3.5 w-3.5 text-foreground/50" />
                  <span className="text-sm font-medium text-foreground/70">
                    To {destination}
                  </span>
                  <span className="text-xs text-foreground/40">
                    ({directionBuses.length})
                  </span>
                </div>
              </div>

              {/* Buses in this direction */}
              <div className="divide-y divide-divider/50">
                {directionBuses.slice(0, 10).map((bus, index) => (
                  <div 
                    key={`${bus.vehicleId}-${index}`}
                    className="px-4 py-3 hover:bg-default-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Bus Info */}
                      <div className="flex-1 min-w-0">
                        {/* Next Stop */}
                        {bus.nextStopName && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-foreground/50 flex-shrink-0" />
                            <span className="truncate">{bus.nextStopName}</span>
                          </div>
                        )}
                        
                        {/* Status/Distance */}
                        <div className="flex items-center gap-2 mt-1 text-xs text-foreground/50">
                          {bus.progressStatus && (
                            <span className="capitalize">{bus.progressStatus}</span>
                          )}
                          {bus.distanceFromStop && (
                            <span>{formatDistance(bus.distanceFromStop)} away</span>
                          )}
                          {bus.vehicleId && (
                            <span className="text-foreground/30">#{bus.vehicleId.split("_").pop()}</span>
                          )}
                        </div>
                      </div>

                      {/* ETA */}
                      <div className="flex-shrink-0 text-right">
                        <Chip
                          size="sm"
                          variant="flat"
                          color={getMinutesColor(bus.minutesAway)}
                          classNames={{
                            base: "h-6",
                            content: "font-semibold",
                          }}
                        >
                          {formatMinutesAway(bus.minutesAway)}
                        </Chip>
                        {bus.arrivalTime && (
                          <p className="text-xs text-foreground/40 mt-0.5">
                            {bus.arrivalTime.toLocaleTimeString([], { 
                              hour: "numeric", 
                              minute: "2-digit" 
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

