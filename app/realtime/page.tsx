"use client";

/**
 * Live Train Tracker Page
 * 
 * Displays a visual line diagram showing real-time train positions for a single line.
 * Shows transfers available at each station.
 * 
 * TODO: Implement multi-line view with branching/merging tracks visualization
 */

import { useState, useEffect, useCallback } from "react";
import { 
  Card, 
  CardBody, 
  Button, 
  Chip, 
  Switch, 
  Popover, 
  PopoverTrigger, 
  PopoverContent,
  Divider
} from "@heroui/react";
import { RefreshCw, Clock, Wifi, WifiOff, Info, ArrowUp, ArrowDown } from "lucide-react";
import { LineSelector, LineDiagram } from "@/components/realtime";
import { SubwayBullet } from "@/components/ui";
import { type LineId } from "@/lib/gtfs/line-stations";
import type { TrainArrival } from "@/types/mta";
import { formatDistanceToNow } from "date-fns";

const REFRESH_INTERVAL = 30; // seconds

interface TrainData {
  arrivals: TrainArrival[];
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
}

export default function RealtimePage() {
  const [selectedLine, setSelectedLine] = useState<LineId | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [trainData, setTrainData] = useState<TrainData>({
    arrivals: [],
    lastUpdated: null,
    isLoading: false,
    error: null,
  });

  // Fetch train data for selected line
  const fetchTrains = useCallback(async () => {
    if (!selectedLine) {
      setTrainData(prev => ({
        ...prev,
        arrivals: [],
        error: null,
      }));
      return;
    }

    setTrainData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/trains/realtime?routeId=${selectedLine}&limit=500`);
      const data = await response.json();

      if (data.success && data.data?.arrivals) {
        // Parse dates
        const rawArrivals: TrainArrival[] = data.data.arrivals.map((arrival: TrainArrival) => ({
          ...arrival,
          arrivalTime: new Date(arrival.arrivalTime),
          departureTime: arrival.departureTime ? new Date(arrival.departureTime) : null,
        }));

        // Sort by arrival time (earliest first)
        rawArrivals.sort((a, b) => a.arrivalTime.getTime() - b.arrivalTime.getTime());

        // Deduplicate by tripId - keep only the earliest arrival for each train
        // This ensures each physical train appears only once on the diagram
        const seenTrips = new Set<string>();
        const arrivals: TrainArrival[] = [];
        
        for (const arrival of rawArrivals) {
          if (!seenTrips.has(arrival.tripId)) {
            seenTrips.add(arrival.tripId);
            arrivals.push(arrival);
          }
        }

        setTrainData({
          arrivals,
          lastUpdated: new Date(),
          isLoading: false,
          error: null,
        });
      } else {
        throw new Error(data.error || "Failed to fetch train data");
      }
    } catch (error) {
      console.error("Failed to fetch trains:", error);
      setTrainData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch train data",
      }));
    }
  }, [selectedLine]);

  // Fetch on line selection change
  useEffect(() => {
    fetchTrains();
  }, [fetchTrains]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !selectedLine) return;

    const interval = setInterval(fetchTrains, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchTrains, selectedLine]);

  // Count trains by direction
  const northboundCount = trainData.arrivals.filter(t => t.direction === "N").length;
  const southboundCount = trainData.arrivals.filter(t => t.direction === "S").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Live Train Tracker
          </h1>
          <p className="mt-1 text-foreground/70">
            Watch trains move in real-time along the line
          </p>
        </div>

        {/* Info/Legend Button */}
        <Popover placement="bottom-end">
          <PopoverTrigger>
            <Button
              size="sm"
              variant="flat"
              startContent={<Info className="h-4 w-4" />}
            >
              Legend
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0">
            <div className="p-4 space-y-4">
              <h3 className="font-semibold text-foreground">How to Read the Tracker</h3>
              
              {/* Train Markers */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                  Train Markers
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 px-1 py-0.5 rounded-full bg-background shadow-sm border border-divider">
                      <SubwayBullet line="A" size="sm" />
                      <ArrowUp className="h-3 w-3 text-success" />
                    </div>
                    <span className="text-foreground/80">Northbound/Uptown train</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 px-1 py-0.5 rounded-full bg-background shadow-sm border border-divider">
                      <SubwayBullet line="A" size="sm" />
                      <ArrowDown className="h-3 w-3 text-danger" />
                    </div>
                    <span className="text-foreground/80">Southbound/Downtown train</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-background shadow-sm border border-divider">
                      <SubwayBullet line="A" size="sm" />
                      <ArrowUp className="h-3 w-3 text-success" />
                      <span className="text-[10px] font-bold text-success">NOW</span>
                    </div>
                    <span className="text-foreground/80">Arriving now (under 1 min)</span>
                  </div>
                </div>
              </div>

              <Divider />

              {/* Station Markers */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                  Station Markers
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-4 border-primary bg-background" />
                    <span className="text-foreground/80">Terminal station (end of line)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-[3px] border-primary bg-background" />
                    <span className="text-foreground/80">Express stop</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full border-2 border-primary bg-background" />
                    <span className="text-foreground/80">Local stop</span>
                  </div>
                </div>
              </div>

              <Divider />

              {/* Transfers */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                  Transfers
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex gap-0.5">
                    <SubwayBullet line="1" size="sm" />
                    <SubwayBullet line="2" size="sm" />
                    <SubwayBullet line="3" size="sm" />
                  </div>
                  <span className="text-foreground/80">Available transfers at station</span>
                </div>
              </div>

              <Divider />

              {/* Position Info */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                  Train Position
                </p>
                <p className="text-sm text-foreground/80">
                  Trains are positioned based on their next stop. The closer a train is 
                  to a station dot, the sooner it will arrive. Click any train to see 
                  its exact ETA and destination.
                </p>
              </div>

              <Divider />

              {/* Auto-refresh */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                  Auto-Refresh
                </p>
                <p className="text-sm text-foreground/80">
                  Data updates every 30 seconds when enabled. Toggle auto-refresh 
                  off if you want to pause updates.
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Controls Bar */}
      <Card>
        <CardBody className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Line Selector */}
          <div className="flex-1">
            <LineSelector
              selectedLine={selectedLine}
              onSelectionChange={setSelectedLine}
            />
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Auto-refresh Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                size="sm"
                isSelected={autoRefresh}
                onValueChange={setAutoRefresh}
              />
              <span className="text-sm text-foreground/70">Auto-refresh</span>
              {autoRefresh && (
                <Wifi className="h-4 w-4 text-success" />
              )}
              {!autoRefresh && (
                <WifiOff className="h-4 w-4 text-foreground/30" />
              )}
            </div>

            {/* Manual Refresh */}
            <Button
              size="sm"
              variant="flat"
              isLoading={trainData.isLoading}
              onPress={fetchTrains}
              startContent={!trainData.isLoading && <RefreshCw className="h-4 w-4" />}
              isDisabled={!selectedLine}
            >
              Refresh
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Status Bar */}
      {selectedLine && (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {/* Last Updated */}
          {trainData.lastUpdated && (
            <div className="flex items-center gap-1.5 text-foreground/60">
              <Clock className="h-4 w-4" />
              <span>
                Updated {formatDistanceToNow(trainData.lastUpdated, { addSuffix: true })}
              </span>
            </div>
          )}

          {/* Train Counts */}
          {trainData.arrivals.length > 0 && (
            <>
              <Chip size="sm" variant="flat" color="success">
                ↑ {northboundCount} Northbound
              </Chip>
              <Chip size="sm" variant="flat" color="danger">
                ↓ {southboundCount} Southbound
              </Chip>
            </>
          )}
        </div>
      )}

      {/* Main Diagram */}
      <div style={{ height: "calc(100vh - 340px)", minHeight: "400px" }}>
        <LineDiagram
          selectedLine={selectedLine}
          trains={trainData.arrivals}
          isLoading={trainData.isLoading}
          error={trainData.error}
        />
      </div>

      {/* Instructions (shown when no line selected) */}
      {!selectedLine && (
        <Card className="bg-primary/5 border-primary/20">
          <CardBody className="text-center py-8">
            <h3 className="text-lg font-medium text-foreground mb-2">
              How to use the Live Tracker
            </h3>
            <ol className="text-foreground/70 text-sm space-y-2 max-w-md mx-auto text-left list-decimal list-inside">
              <li>Click &quot;Select Line&quot; above to choose a subway line</li>
              <li>Watch trains appear on the line diagram in real-time</li>
              <li>Stations show available transfers to other lines</li>
              <li>Click any train marker to see details like destination and ETA</li>
            </ol>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
