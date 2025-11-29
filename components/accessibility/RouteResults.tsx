"use client";

import { useState } from "react";
import { Card, CardBody, Chip, Button, Divider } from "@heroui/react";
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Repeat,
  MapPin,
  ChevronDown,
  ChevronUp,
  Accessibility,
  Navigation,
  Train,
  Timer
} from "lucide-react";
import { SubwayBullet } from "@/components/ui";
import { format } from "date-fns";
import type { AccessibleRoute, AccessibleRouteResponse, RealtimeDeparture } from "@/types/api";

/**
 * Format time for display (e.g., "2:35 PM")
 */
function formatTime(isoString: string | undefined): string {
  if (!isoString) return "";
  try {
    return format(new Date(isoString), "h:mm a");
  } catch {
    return "";
  }
}

interface RouteResultsProps {
  routeData: AccessibleRouteResponse;
}

function RouteCard({ 
  route, 
  isAlternative = false,
  label 
}: { 
  route: AccessibleRoute; 
  isAlternative?: boolean;
  label?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(!isAlternative);
  
  // Check if we have real-time data
  const hasRealtimeData = !!route.departureTime;
  
  // Group consecutive segments on the same line
  const groupedSegments: Array<{
    line: string;
    isExpress: boolean;
    stations: string[];
    stationNames: string[];
    totalMinutes: number;
    hasInaccessible: boolean;
    departureTime?: string;
    arrivalTime?: string;
  }> = [];
  
  for (const segment of route.segments) {
    const lastGroup = groupedSegments[groupedSegments.length - 1];
    
    if (lastGroup && lastGroup.line === segment.line && lastGroup.isExpress === segment.isExpress) {
      // Add to existing group
      if (!lastGroup.stations.includes(segment.toStationId)) {
        lastGroup.stations.push(segment.toStationId);
        lastGroup.stationNames.push(segment.toStationName);
      }
      lastGroup.totalMinutes += segment.travelMinutes;
      lastGroup.arrivalTime = segment.arrivalTime;
      if (!segment.isAccessible) {
        lastGroup.hasInaccessible = true;
      }
    } else {
      // Start new group
      groupedSegments.push({
        line: segment.line,
        isExpress: segment.isExpress,
        stations: [segment.fromStationId, segment.toStationId],
        stationNames: [segment.fromStationName, segment.toStationName],
        totalMinutes: segment.travelMinutes,
        hasInaccessible: !segment.isAccessible,
        departureTime: segment.departureTime,
        arrivalTime: segment.arrivalTime,
      });
    }
  }

  return (
    <Card className={`${
      isAlternative ? "border border-default-200" : "border-2 border-primary"
    }`}>
      <CardBody className="py-3 px-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Label */}
            {label && (
              <Chip 
                size="sm" 
                color={isAlternative ? "default" : "primary"}
                variant={isAlternative ? "bordered" : "solid"}
              >
                {label}
              </Chip>
            )}
            
            {/* Real-time departure/arrival */}
            {hasRealtimeData && route.departureTime && route.arrivalTime && (
              <div className="flex items-center gap-1.5 text-sm">
                <Timer className="h-4 w-4 text-success" />
                <span className="font-semibold text-success">
                  {formatTime(route.departureTime)}
                </span>
                <span className="text-foreground/50">→</span>
                <span className="font-semibold text-foreground">
                  {formatTime(route.arrivalTime)}
                </span>
              </div>
            )}
            
            {/* Travel Time */}
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-foreground/60" />
              <span className="font-semibold text-foreground">
                {Math.round(route.totalMinutes)} min
              </span>
            </div>
            
            {/* Transfers */}
            {route.transferCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-foreground/60">
                <Repeat className="h-3.5 w-3.5" />
                <span>{route.transferCount} transfer{route.transferCount !== 1 ? "s" : ""}</span>
              </div>
            )}
            
            {/* Accessibility Status */}
            {route.isFullyAccessible ? (
              <Chip
                size="sm"
                color="success"
                variant="flat"
                startContent={<CheckCircle2 className="h-3 w-3" />}
              >
                Accessible
              </Chip>
            ) : (
              <Chip
                size="sm"
                color="warning"
                variant="flat"
                startContent={<AlertTriangle className="h-3 w-3" />}
              >
                {route.blockedStations.length} inaccessible
              </Chip>
            )}
          </div>
          
          {/* Expand Button */}
          <Button
            size="sm"
            variant="light"
            isIconOnly
            onPress={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Route Lines Preview */}
        {!isExpanded && (
          <div className="flex items-center gap-1 mt-2">
            {groupedSegments.map((group, idx) => (
              <div key={idx} className="flex items-center gap-1">
                {idx > 0 && group.line !== "TRANSFER" && (
                  <Repeat className="h-3 w-3 text-foreground/40 mx-1" />
                )}
                {group.line !== "TRANSFER" && (
                  <SubwayBullet line={group.line} size="sm" />
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Expanded Route Details */}
        {isExpanded && (
          <div className="mt-4 space-y-3">
            {/* Blocked Stations Warning */}
            {route.blockedStations.length > 0 && (
              <div className="px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-warning">
                      Accessibility Warning
                    </p>
                    <p className="text-xs text-foreground/70 mt-0.5">
                      The following stations may not be wheelchair accessible due to elevator outages:
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {route.blockedStations.map((station) => (
                        <Chip key={station.stationId} size="sm" variant="bordered">
                          {station.stationName}
                          {station.outageReason && (
                            <span className="text-foreground/50 ml-1">
                              ({station.outageReason})
                            </span>
                          )}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Route Steps */}
            <div className="space-y-0">
              {groupedSegments.map((group, idx) => (
                <div key={idx}>
                  {/* Transfer indicator */}
                  {group.line === "TRANSFER" ? (
                    <div className="flex items-center gap-2 py-2 px-3 ml-4 border-l-2 border-dashed border-foreground/20">
                      <Repeat className="h-4 w-4 text-foreground/50" />
                      <span className="text-sm text-foreground/60">
                        Transfer ({Math.round(group.totalMinutes)} min)
                      </span>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      {/* Line indicator and track */}
                      <div className="flex flex-col items-center">
                        <SubwayBullet line={group.line} size="md" />
                        <div 
                          className="w-1 flex-1 min-h-8" 
                          style={{ 
                            backgroundColor: `var(--subway-${group.line.toLowerCase()}, #808183)` 
                          }}
                        />
                      </div>
                      
                      {/* Segment details */}
                      <div className="flex-1 pb-3">
                        {/* Line header */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-medium text-foreground">
                            {group.line} Train
                          </span>
                          {group.isExpress && (
                            <Chip size="sm" variant="flat" color="secondary">
                              Express
                            </Chip>
                          )}
                          <span className="text-sm text-foreground/60">
                            {Math.round(group.totalMinutes)} min
                          </span>
                          {group.hasInaccessible && (
                            <Accessibility className="h-4 w-4 text-warning" />
                          )}
                        </div>
                        
                        {/* Stations with times */}
                        <div className="space-y-1.5">
                          {group.stationNames.map((name, stationIdx) => {
                            // Show departure time for first station, arrival for last
                            const showTime = stationIdx === 0 
                              ? group.departureTime 
                              : (stationIdx === group.stationNames.length - 1 ? group.arrivalTime : undefined);
                            
                            return (
                              <div 
                                key={stationIdx}
                                className="flex items-center gap-2 text-sm"
                              >
                                <MapPin className="h-3.5 w-3.5 text-foreground/40" />
                                <span className={
                                  stationIdx === 0 || stationIdx === group.stationNames.length - 1
                                    ? "font-medium text-foreground"
                                    : "text-foreground/60"
                                }>
                                  {name}
                                </span>
                                {/* Real-time departure/arrival time */}
                                {showTime && (
                                  <span className="text-xs text-success font-medium">
                                    {formatTime(showTime)}
                                  </span>
                                )}
                                {stationIdx === 0 && idx === 0 && (
                                  <Chip size="sm" variant="dot" color="success">Start</Chip>
                                )}
                                {stationIdx === group.stationNames.length - 1 && 
                                 idx === groupedSegments.length - 1 && (
                                  <Chip size="sm" variant="dot" color="primary">End</Chip>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/**
 * Upcoming departures card
 */
function DeparturesCard({ departures, stationName }: { departures: RealtimeDeparture[]; stationName: string }) {
  if (departures.length === 0) return null;
  
  return (
    <Card className="bg-default-50">
      <CardBody className="py-3 px-4">
        <div className="flex items-center gap-2 mb-3">
          <Train className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Next trains from {stationName}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {departures.map((dep, idx) => (
            <div 
              key={idx} 
              className="flex items-center gap-2 text-sm bg-background rounded-lg px-3 py-2"
            >
              <SubwayBullet line={dep.line} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {dep.destination}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-success">
                  {dep.minutesAway <= 1 ? "Now" : `${dep.minutesAway} min`}
                </p>
                <p className="text-xs text-foreground/50">
                  {formatTime(dep.departureTime)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

export function RouteResults({ routeData }: RouteResultsProps) {
  const { primary, alternatives, warnings, fromStation, toStation, departures } = routeData;
  
  // No route found
  if (!primary && alternatives.length === 0) {
    return (
      <Card>
        <CardBody className="py-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-warning mb-4" />
          <p className="text-lg font-medium text-foreground">No Route Found</p>
          <p className="text-sm text-foreground/60 mt-1">
            {warnings.length > 0 
              ? warnings.join(". ")
              : `Could not find a route from ${fromStation.name} to ${toStation.name}.`
            }
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Route Header */}
      <div className="flex items-center gap-2 text-sm text-foreground/70">
        <Navigation className="h-4 w-4" />
        <span>
          <strong className="text-foreground">{fromStation.name}</strong>
          {" → "}
          <strong className="text-foreground">{toStation.name}</strong>
        </span>
      </div>
      
      {/* Upcoming Departures */}
      {departures && departures.length > 0 && (
        <DeparturesCard departures={departures} stationName={fromStation.name} />
      )}
      
      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="px-4 py-3 bg-warning/10 border border-warning/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
            <div className="text-sm text-foreground/80">
              {warnings.map((warning, idx) => (
                <p key={idx}>{warning}</p>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Primary Route */}
      {primary && (
        <RouteCard 
          route={primary} 
          label="Recommended" 
        />
      )}
      
      {/* Alternatives */}
      {alternatives.length > 0 && (
        <>
          <Divider className="my-4" />
          <div className="text-sm font-medium text-foreground/60 mb-2">
            Alternative Routes
          </div>
          <div className="space-y-3">
            {alternatives.map((alt, idx) => (
              <RouteCard 
                key={idx}
                route={alt} 
                isAlternative
                label={alt.isFullyAccessible ? "Accessible Alternative" : `Alternative ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

