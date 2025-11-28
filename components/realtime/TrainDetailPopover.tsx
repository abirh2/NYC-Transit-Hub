"use client";

/**
 * TrainDetailPopover Component
 * 
 * Displays detailed information about a selected train.
 * Shows destination as heading, next stop with proper name, and arrival time.
 */

import { Card, CardBody, CardHeader, Button, Chip, Divider } from "@heroui/react";
import { X, Clock, AlertTriangle, MapPin } from "lucide-react";
import { SubwayBullet } from "@/components/ui";
import { getStationNameById } from "@/lib/gtfs/line-stations";
import type { TrainArrival } from "@/types/mta";

interface TrainDetailPopoverProps {
  /** Selected train data */
  train: TrainArrival;
  /** Close handler */
  onClose: () => void;
}

/**
 * Format minutes for display
 */
function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "Arriving now";
  if (minutes === 1) return "1 min";
  return `${minutes} min`;
}

export function TrainDetailPopover({ train, onClose }: TrainDetailPopoverProps) {
  const isNorthbound = train.direction === "N";
  const delayMinutes = Math.round(train.delay / 60);
  const hasDelay = train.delay >= 60;
  
  // Get the destination - prefer headsign over generic direction
  const destination = train.headsign || (isNorthbound ? "Uptown" : "Downtown");
  
  // Look up the actual station name from stop ID
  const nextStop = getStationNameById(train.stopId) || train.stationName || "Unknown Station";
  
  return (
    <Card className="w-full shadow-none border-none">
      {/* Header - Destination is the main heading */}
      <CardHeader className="flex justify-between items-start pb-2 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <SubwayBullet line={train.routeId} size="lg" />
          <div className="min-w-0">
            <p className="font-bold text-lg text-foreground truncate">
              {destination}
            </p>
            <p className="text-xs text-foreground/60">
              {train.routeId} Train · {isNorthbound ? "Northbound" : "Southbound"}
            </p>
          </div>
        </div>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={onClose}
          className="text-foreground/50 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardBody className="pt-0 space-y-3">
        {/* Next Stop - Prominent display */}
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-foreground/50">Next Stop</p>
            <p className="font-semibold text-foreground">
              {nextStop}
            </p>
          </div>
        </div>

        {/* Arrival Time - Clear and prominent */}
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-foreground/50 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-foreground/50">Arriving at next stop</p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className={`
                text-xl font-bold
                ${train.minutesAway <= 1 ? "text-success" : 
                  train.minutesAway <= 5 ? "text-warning" : "text-foreground"}
              `}>
                {formatMinutes(train.minutesAway)}
              </span>
              <span className="text-sm text-foreground/50">
                ({train.arrivalTime.toLocaleTimeString([], { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true
                })})
              </span>
            </div>
          </div>
        </div>

        {/* Delay Warning */}
        {hasDelay && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <div>
              <p className="text-xs text-warning font-medium">Delayed</p>
              <p className="text-xs text-foreground/70">
                Running {delayMinutes}+ minutes behind schedule
              </p>
            </div>
          </div>
        )}

        <Divider />

        {/* Status Chips */}
        <div className="flex flex-wrap gap-1.5">
          {train.isAssigned ? (
            <Chip size="sm" variant="flat" color="success">
              Live Tracking
            </Chip>
          ) : (
            <Chip size="sm" variant="flat" color="default">
              Scheduled
            </Chip>
          )}
          {hasDelay && (
            <Chip 
              size="sm" 
              variant="flat" 
              color="warning"
            >
              +{delayMinutes} min delay
            </Chip>
          )}
        </div>

        {/* Trip ID (smaller, less prominent) */}
        <p className="text-[10px] text-foreground/30 truncate">
          Trip: {train.tripId}
        </p>
      </CardBody>
    </Card>
  );
}

