"use client";

/**
 * LineDiagram Component
 * 
 * Single-track vertical line diagram showing all stations for a selected line.
 * Shows train positions and transfer information at each station.
 * 
 * TODO: Implement multi-line view with branching/merging tracks
 * - Each selected line should get its own vertical column
 * - Lines should converge at shared stations (junctions)
 * - Visual should resemble a tree/graph structure
 */

import { useState, useMemo, useCallback } from "react";
import { Card, CardBody, Spinner } from "@heroui/react";
import { Train } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  SubwayBullet,
} from "@/components/ui";
import { TrainMarker } from "./TrainMarker";
import { TrainDetailPopover } from "./TrainDetailPopover";
import { TransitBottomSheet } from "./TransitBottomSheet";
import {
  getLineStations,
  getLineColor,
  type LineId,
} from "@/lib/gtfs/line-stations";
import type { TrainArrival } from "@/types/mta";

interface LineDiagramProps {
  /** The single selected line ID to display */
  selectedLine: LineId | null;
  /** Train arrivals from API */
  trains: TrainArrival[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Error message if any */
  error?: string | null;
}

// Pixel spacing per station
const STATION_SPACING = 65;

/** Centers a shared state primitive in the panel the diagram would have filled. */
function DiagramState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center p-4">{children}</div>
  );
}

export function LineDiagram({
  selectedLine,
  trains,
  isLoading = false,
  error = null,
}: LineDiagramProps) {
  const [selectedTrain, setSelectedTrain] = useState<TrainArrival | null>(null);

  // Get stations for the selected line
  const stations = useMemo(() => {
    if (!selectedLine) return [];
    return getLineStations(selectedLine);
  }, [selectedLine]);

  // Create a map for quick station lookup by ID
  const stationIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    stations.forEach((station, idx) => {
      map.set(station.id, idx);
    });
    return map;
  }, [stations]);

  // Get line color
  const lineColor = useMemo(() => {
    if (!selectedLine) return "#808183";
    return getLineColor(selectedLine);
  }, [selectedLine]);

  // Filter trains for this line and calculate positions
  const trainPositions = useMemo(() => {
    if (!selectedLine) return [];
    
    const positions: Array<{ train: TrainArrival; topPercent: number }> = [];
    
    for (const train of trains) {
      // Only show trains for the selected line
      if (train.routeId !== selectedLine) continue;
      
      // Find station index
      const baseStationId = train.stopId.replace(/[NS]$/, "");
      const stationIndex = stationIndexMap.get(baseStationId);
      
      if (stationIndex === undefined) continue;
      
      // Calculate position as percentage
      const totalStations = stations.length;
      if (totalStations <= 1) {
        positions.push({ train, topPercent: 50 });
        continue;
      }
      
      // Base position at the station
      let topPercent = (stationIndex / (totalStations - 1)) * 100;
      
      // Offset based on arrival time and direction
      // Trains approaching a station are shown slightly before it
      if (train.minutesAway > 0) {
        const maxOffset = 100 / (totalStations - 1) * 0.7; // Max 70% of distance to next station
        const offset = Math.min(train.minutesAway * 0.4, maxOffset);
        
        // Northbound trains come from south (higher index), so offset toward higher percent
        // Southbound trains come from north (lower index), so offset toward lower percent
        if (train.direction === "N") {
          topPercent += offset;
        } else {
          topPercent -= offset;
        }
      }
      
      positions.push({ 
        train, 
        topPercent: Math.max(0, Math.min(100, topPercent))
      });
    }
    
    return positions;
  }, [trains, stations, stationIndexMap, selectedLine]);

  const handleTrainClick = useCallback((train: TrainArrival) => {
    setSelectedTrain(prev => (prev?.tripId === train.tripId ? null : train));
  }, []);

  const closeTrainDetail = useCallback(() => {
    setSelectedTrain(null);
  }, []);

  // Empty/loading/error all route through the shared state primitives so
  // every surface on the page reports conditions the same way.
  if (!selectedLine) {
    return (
      <DiagramState>
        <EmptyState
          icon={<Train className="h-6 w-6" aria-hidden="true" />}
          title="Choose a subway route"
          description="Pick a line above to see live train positions along it."
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

  if (trains.length === 0) {
    return (
      <DiagramState>
        <EmptyState
          icon={<Train className="h-6 w-6" aria-hidden="true" />}
          title={`No ${selectedLine} trains reporting`}
          description="Nothing is running on this line right now. Positions refresh automatically."
        />
      </DiagramState>
    );
  }

  const diagramHeight = Math.max(stations.length * STATION_SPACING, 500);

  return (
    <Card className="h-full overflow-hidden">
      <CardBody className="p-0 relative h-full">
        {/* Scrollable diagram container */}
        <div className="absolute inset-0 overflow-y-auto px-4 pt-6 pb-20">
          {/* Main diagram area */}
          <div className="relative" style={{ height: `${diagramHeight}px` }}>
            
            {/* Track Line */}
            <div
              className="absolute left-1/2 transform -translate-x-1/2 w-1.5 rounded-full"
              style={{
                backgroundColor: lineColor,
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
              const isExpress = station.express;
              const showOnLeft = index % 2 === 0;
              const hasTransfers = station.transfer && station.transfer.length > 0;
              
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
                          : isExpress
                            ? "w-4 h-4 border-[3px]"
                            : "w-3 h-3"
                        }
                      `}
                      style={{ borderColor: lineColor }}
                    />
                  </div>

                  {/* Station Name and Transfers */}
                  {showOnLeft ? (
                    <div className="absolute right-1/2 pr-4 mr-2 text-right max-w-[45%]">
                      <p className={`
                        text-sm leading-tight
                        ${isTerminal ? "font-bold" : "font-medium"}
                        ${isExpress ? "text-foreground" : "text-foreground/80"}
                      `}>
                        {station.name}
                      </p>
                      {/* Transfer lines */}
                      {hasTransfers && (
                        <div className="flex justify-end gap-0.5 mt-0.5 flex-wrap">
                          {station.transfer!.map(transferLine => (
                            <SubwayBullet key={transferLine} line={transferLine} size="sm" />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="absolute left-1/2 pl-4 ml-2 max-w-[45%]">
                      <p className={`
                        text-sm leading-tight
                        ${isTerminal ? "font-bold" : "font-medium"}
                        ${isExpress ? "text-foreground" : "text-foreground/80"}
                      `}>
                        {station.name}
                      </p>
                      {/* Transfer lines */}
                      {hasTransfers && (
                        <div className="flex gap-0.5 mt-0.5 flex-wrap">
                          {station.transfer!.map(transferLine => (
                            <SubwayBullet key={transferLine} line={transferLine} size="sm" />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Train Markers */}
            {trainPositions.map(({ train, topPercent }, index) => (
              <div
                key={`${train.tripId}-${train.stopId}-${index}`}
                className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
                style={{ top: `${topPercent}%` }}
              >
                <TrainMarker
                  train={train}
                  isSelected={selectedTrain?.tripId === train.tripId}
                  onClick={handleTrainClick}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Train detail, on the shared sheet surface. */}
        <TransitBottomSheet
          isOpen={selectedTrain !== null}
          onClose={closeTrainDetail}
          title={
            selectedTrain
              ? `${selectedTrain.routeId} train details`
              : "Train details"
          }
        >
          {selectedTrain && (
            <TrainDetailPopover train={selectedTrain} onClose={closeTrainDetail} />
          )}
        </TransitBottomSheet>

        {/* Train Count Summary */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/80 to-transparent pt-12 pb-4 px-4">
          <div className="flex items-center justify-center gap-4 text-sm text-foreground/60">
            <span className="flex items-center gap-1.5">
              <Train className="h-4 w-4" />
              {trainPositions.length} train{trainPositions.length !== 1 ? "s" : ""} in view
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
