"use client";

/**
 * RailDiagram Component
 * 
 * Vertical line diagram for LIRR and Metro-North showing stations and train positions.
 * Styled similarly to the subway LineDiagram component.
 */

import { useState, useMemo, useCallback } from "react";
import { Card, CardBody, Spinner, Chip } from "@heroui/react";
import { TrainFront, Clock, AlertCircle } from "lucide-react";
import { RailBadge } from "@/components/ui/RailBadge";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui";
import { TransitBottomSheet } from "./TransitBottomSheet";
import {
  getRailBranch,
  getRailBranchStations,
  getRailStationName,
} from "@/lib/gtfs/rail-stations";
import type { RailArrival, TransitMode } from "@/types/mta";
import { formatDistanceToNow } from "date-fns";

interface RailDiagramProps {
  /** Transit mode (lirr or metro-north) */
  mode: TransitMode;
  /** The selected branch/line ID */
  selectedBranch: string | null;
  /** Selected branch name for display */
  selectedBranchName?: string;
  /** Train arrivals from API */
  trains: RailArrival[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Error message if any */
  error?: string | null;
  /** Last updated timestamp */
  lastUpdated?: Date | null;
}

// Pixel spacing per station (increased for better readability)
const STATION_SPACING = 85;

/** Centers a shared state primitive in the panel the diagram would have filled. */
function DiagramState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center p-4">{children}</div>
  );
}

/**
 * Get a user-friendly train name
 */
function getTrainDisplayName(train: RailArrival): string {
  // If we have a train number, show "Train 123"
  if (train.trainId) {
    return `Train ${train.trainId}`;
  }
  
  // Otherwise show just the branch name and direction
  return train.branchName;
}

/**
 * Get direction description
 */
function getDirectionDescription(train: RailArrival, mode: TransitMode): string {
  if (train.direction === "inbound") {
    return mode === "lirr" ? "To Penn Station" : "To Grand Central";
  }
  return mode === "lirr" ? "From Penn Station" : "From Grand Central";
}

/**
 * Train detail popover content
 */
function TrainDetailContent({ 
  train, 
  mode,
  onClose 
}: { 
  train: RailArrival; 
  mode: TransitMode;
  onClose: () => void;
}) {
  const stationName = getRailStationName(train.stopId, mode);
  const delayMinutes = Math.round(train.delay / 60);
  const isDelayed = train.delay > 120;
  const trainName = getTrainDisplayName(train);
  const directionDesc = getDirectionDescription(train, mode);
  
  return (
    <div className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <RailBadge 
            branchId={train.routeId} 
            branchName={train.branchName || train.routeId}
            mode={mode}
            size="md"
          />
          <div>
            <p className="font-semibold">{trainName}</p>
            <p className="text-xs text-foreground/60">{directionDesc}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-foreground/40 hover:text-foreground text-xl leading-none"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-foreground/60">Next Stop</span>
          <span className="font-medium">{stationName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-foreground/60">Arriving</span>
          <Chip
            size="sm"
            variant="flat"
            color={train.minutesAway <= 5 ? "success" : train.minutesAway <= 15 ? "warning" : "default"}
          >
            {train.minutesAway <= 0 ? "Now" : `${train.minutesAway} min`}
          </Chip>
        </div>
        {train.arrivalTime && (
          <div className="flex items-center justify-between">
            <span className="text-foreground/60">Time</span>
            <span>
              {train.arrivalTime.toLocaleTimeString([], { 
                hour: "numeric", 
                minute: "2-digit" 
              })}
            </span>
          </div>
        )}
        {delayMinutes !== 0 && (
          <div className="flex items-center justify-between">
            <span className="text-foreground/60">Status</span>
            <span className={`flex items-center gap-1 ${isDelayed ? "text-warning" : "text-success"}`}>
              <AlertCircle className="h-3 w-3" />
              {delayMinutes > 0 ? `${delayMinutes} min late` : `${Math.abs(delayMinutes)} min early`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function RailDiagram({
  mode,
  selectedBranch,
  selectedBranchName,
  trains,
  isLoading = false,
  error = null,
  lastUpdated = null,
}: RailDiagramProps) {
  const [selectedTrain, setSelectedTrain] = useState<RailArrival | null>(null);

  const modeLabel = mode === "lirr" ? "LIRR" : "Metro-North";
  const branchLabel = mode === "lirr" ? "branch" : "line";

  // Get branch info
  const branch = useMemo(() => {
    if (!selectedBranch) return null;
    return getRailBranch(selectedBranch, mode);
  }, [selectedBranch, mode]);

  // Get stations for the selected branch
  const stations = useMemo(() => {
    if (!selectedBranch) return [];
    return getRailBranchStations(selectedBranch, mode);
  }, [selectedBranch, mode]);

  // Create a map for quick station lookup by ID
  const stationIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    stations.forEach((station, idx) => {
      map.set(station.id, idx);
    });
    return map;
  }, [stations]);

  // Get branch color
  const branchColor = branch?.color ?? "#4D5357";

  // Calculate train positions, grouped by station
  const { trainGroups, totalTrains, stationsWithTrains } = useMemo(() => {
    if (!selectedBranch || stations.length === 0) {
      return { trainGroups: [], totalTrains: 0, stationsWithTrains: 0 };
    }
    
    // Group trains by their stop ID
    const groupsByStop = new Map<string, RailArrival[]>();
    let total = 0;
    
    for (const train of trains) {
      // Only show trains on selected branch
      if (train.routeId !== selectedBranch) continue;
      
      total++;
      const key = train.stopId;
      if (!groupsByStop.has(key)) {
        groupsByStop.set(key, []);
      }
      groupsByStop.get(key)!.push(train);
    }
    
    // Convert groups to positioned groups
    const groups: Array<{ 
      trains: RailArrival[]; 
      topPercent: number; 
      stationName: string;
    }> = [];
    
    for (const [stopId, groupTrains] of groupsByStop) {
      // Find station index
      const stationIndex = stationIndexMap.get(stopId);
      const stationName = getRailStationName(stopId, mode);
      
      let topPercent: number;
      
      if (stationIndex === undefined) {
        // If station not found in branch, use approximate position
        const firstTrain = groupTrains[0];
        const approxPosition = Math.min(firstTrain.minutesAway * 2, 90);
        topPercent = firstTrain.direction === "inbound" ? 100 - approxPosition : approxPosition;
      } else {
        // Calculate position as percentage
        const totalStations = stations.length;
        if (totalStations <= 1) {
          topPercent = 50;
        } else {
          // Base position at the station
          topPercent = (stationIndex / (totalStations - 1)) * 100;
          
          // Small offset based on first train's arrival time
          const firstTrain = groupTrains[0];
          if (firstTrain.minutesAway > 0) {
            const maxOffset = 100 / (totalStations - 1) * 0.5;
            const offset = Math.min(firstTrain.minutesAway * 0.3, maxOffset);
            
            if (firstTrain.direction === "inbound") {
              topPercent += offset;
            } else {
              topPercent -= offset;
            }
          }
          
          topPercent = Math.max(0, Math.min(100, topPercent));
        }
      }
      
      groups.push({ trains: groupTrains, topPercent, stationName });
    }
    
    return { 
      trainGroups: groups, 
      totalTrains: total, 
      stationsWithTrains: groups.length 
    };
  }, [trains, stations, stationIndexMap, selectedBranch, mode]);

  const handleTrainClick = useCallback((train: RailArrival) => {
    setSelectedTrain(prev => (prev?.tripId === train.tripId ? null : train));
  }, []);

  const closeTrainDetail = useCallback(() => {
    setSelectedTrain(null);
  }, []);

  // Empty/loading/error all route through the shared state primitives so
  // every surface on the page reports conditions the same way.
  if (!selectedBranch) {
    return (
      <DiagramState>
        <EmptyState
          icon={<TrainFront className="h-6 w-6" aria-hidden="true" />}
          title={`Choose a ${modeLabel} ${branchLabel}`}
          description={`Pick a ${branchLabel} above to see live train positions along it.`}
        />
      </DiagramState>
    );
  }

  if (error) {
    return (
      <DiagramState>
        <ErrorState title="Train data unavailable" description={error} />
      </DiagramState>
    );
  }

  if (isLoading && trains.length === 0) {
    return (
      <DiagramState>
        <LoadingSkeleton variant="list" count={6} className="w-full max-w-md" />
      </DiagramState>
    );
  }

  if (totalTrains === 0) {
    return (
      <DiagramState>
        <EmptyState
          icon={<TrainFront className="h-6 w-6" aria-hidden="true" />}
          title="No trains reporting"
          description={`Nothing is running on this ${branchLabel} right now. Arrivals refresh automatically.`}
        />
      </DiagramState>
    );
  }

  const diagramHeight = Math.max(stations.length * STATION_SPACING, 500);

  return (
    <Card className="h-full overflow-hidden">
      <CardBody className="p-0 h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-divider bg-default-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RailBadge 
                branchId={selectedBranch}
                branchName={selectedBranchName ?? branch?.name ?? selectedBranch}
                mode={mode}
                size="lg"
              />
              <div>
                <h3 className="font-semibold">{selectedBranchName ?? branch?.name}</h3>
                <p className="text-xs text-foreground/60">
                  {totalTrains} train{totalTrains !== 1 ? "s" : ""} in service
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

        {/* Scrollable diagram container */}
        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-20 relative">
          {/* Main diagram area */}
          <div className="relative" style={{ height: `${diagramHeight}px` }}>
            
            {/* Track Line */}
            <div
              className="absolute left-1/2 transform -translate-x-1/2 w-1.5 rounded-full"
              style={{
                backgroundColor: branchColor,
                top: 0,
                bottom: 0,
              }}
            />

            {/* Stations */}
            {stations.map((station, index) => {
              const topPercent = stations.length > 1
                ? (index / (stations.length - 1)) * 100
                : 50;
              
              const isTerminal = station.type === "terminal" || index === 0 || index === stations.length - 1;
              const isHub = station.type === "hub";
              const showOnLeft = index % 2 === 0;
              
              return (
                <div
                  key={station.id}
                  className="absolute left-0 right-0"
                  style={{ top: `${topPercent}%`, transform: "translateY(-50%)" }}
                >
                  {/* Station Dot */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 z-10">
                    <div
                      className={`
                        rounded-full border-2 bg-background transition-all
                        ${isTerminal
                          ? "w-5 h-5 border-4"
                          : isHub
                            ? "w-4 h-4 border-[3px]"
                            : "w-3 h-3"
                        }
                      `}
                      style={{ borderColor: branchColor }}
                    />
                  </div>

                  {/* Station Name */}
                  {showOnLeft ? (
                    <div className="absolute right-1/2 pr-4 mr-2 text-right max-w-[45%]">
                      <p className={`
                        text-sm leading-tight
                        ${isTerminal ? "font-bold" : isHub ? "font-semibold" : "font-medium"}
                        ${isTerminal || isHub ? "text-foreground" : "text-foreground/80"}
                      `}>
                        {station.name}
                      </p>
                    </div>
                  ) : (
                    <div className="absolute left-1/2 pl-4 ml-2 max-w-[45%]">
                      <p className={`
                        text-sm leading-tight
                        ${isTerminal ? "font-bold" : isHub ? "font-semibold" : "font-medium"}
                        ${isTerminal || isHub ? "text-foreground" : "text-foreground/80"}
                      `}>
                        {station.name}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Train Markers (grouped by station) */}
            {trainGroups.map(({ trains: groupTrains, topPercent, stationName }, groupIndex) => {
              const firstTrain = groupTrains[0];
              const trainCount = groupTrains.length;
              const isDelayed = groupTrains.some(t => t.delay > 120);
              const isSelected = groupTrains.some(t => selectedTrain?.tripId === t.tripId);
              
              return (
                <div
                  key={`group-${firstTrain.stopId}-${groupIndex}`}
                  className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
                  style={{ top: `${topPercent}%` }}
                >
                  <button
                    onClick={() => handleTrainClick(firstTrain)}
                    className={`
                      relative flex items-center justify-center
                      ${trainCount > 1 ? "w-12 h-7" : "w-10 h-6"} 
                      rounded-md transition-all cursor-pointer
                      ${isSelected
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" 
                        : "hover:scale-105"
                      }
                      ${isDelayed ? "bg-warning" : "bg-success"}
                      text-white shadow-md
                    `}
                    title={trainCount > 1 
                      ? `${trainCount} trains at ${stationName}` 
                      : `${firstTrain.trainId ? `Train ${firstTrain.trainId}` : firstTrain.branchName} - ${firstTrain.minutesAway} min`
                    }
                  >
                    <TrainFront className="h-4 w-4" />
                    {trainCount > 1 && (
                      <span className="ml-0.5 text-xs font-bold">{trainCount}</span>
                    )}
                    {firstTrain.direction === "inbound" ? (
                      <span className="absolute -top-0.5 -right-0.5 text-[8px] bg-background text-foreground rounded-full px-1 shadow">↑</span>
                    ) : (
                      <span className="absolute -top-0.5 -right-0.5 text-[8px] bg-background text-foreground rounded-full px-1 shadow">↓</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Train detail, on the shared sheet surface. */}
        <TransitBottomSheet
          isOpen={selectedTrain !== null}
          onClose={closeTrainDetail}
          title={
            selectedTrain?.trainId
              ? `Train ${selectedTrain.trainId} details`
              : "Train details"
          }
        >
          {selectedTrain && (
            <TrainDetailContent
              train={selectedTrain}
              mode={mode}
              onClose={closeTrainDetail}
            />
          )}
        </TransitBottomSheet>

        {/* Train Count Summary */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/80 to-transparent pt-12 pb-4 px-4">
          <div className="flex items-center justify-center gap-4 text-sm text-foreground/60">
            <span className="flex items-center gap-1.5">
              <TrainFront className="h-4 w-4" />
              {totalTrains} train{totalTrains !== 1 ? "s" : ""} at {stationsWithTrains} station{stationsWithTrains !== 1 ? "s" : ""}
            </span>
            {isLoading && (
              <span className="flex items-center gap-1.5">
                <Spinner size="sm" />
                Updating...
              </span>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

