"use client";

/**
 * Live Transit Tracker Page
 * 
 * Multi-mode transit tracker supporting:
 * - Subway: Visual line diagram showing real-time train positions
 * - Bus: List view showing bus arrivals for a selected route
 * - LIRR: Rail arrivals by branch
 * - Metro-North: Rail arrivals by line
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Card, 
  CardBody, 
  Button, 
  Chip, 
  Switch, 
  Popover, 
  PopoverTrigger, 
  PopoverContent,
  Divider,
  ButtonGroup
} from "@heroui/react";
import { RefreshCw, Clock, Wifi, WifiOff, Info, ArrowUp, ArrowDown, Map, ListTree } from "lucide-react";
import { 
  ModeSelector, 
  LineSelector, 
  LineDiagram,
  BusSelector,
  BusList,
  RailSelector,
  RailDiagram,
  TransitMap,
} from "@/components/realtime";
import { SubwayBullet } from "@/components/ui";
import { type LineId, getLineStations, getLineColor } from "@/lib/gtfs/line-stations";
import { getRailBranchStations, getRailBranchColor } from "@/lib/gtfs/rail-stations";
import { getBusRouteData } from "@/lib/gtfs/bus-stops";
import type { TrainArrival, BusArrival, RailArrival, TransitMode } from "@/types/mta";
import { formatDistanceToNow } from "date-fns";

const REFRESH_INTERVAL = 30; // seconds

interface TrainData {
  arrivals: TrainArrival[];
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
}

interface BusData {
  arrivals: BusArrival[];
  availableRoutes: string[];
  lastUpdated: Date | null;
  isLoading: boolean;
  isRoutesLoading: boolean;
  error: string | null;
}

interface RailBranch {
  id: string;
  name: string;
}

interface RailData {
  arrivals: RailArrival[];
  availableBranches: RailBranch[];
  lastUpdated: Date | null;
  isLoading: boolean;
  isBranchesLoading: boolean;
  error: string | null;
}

type ViewMode = "diagram" | "map";

export default function RealtimePage() {
  // Mode state
  const [selectedMode, setSelectedMode] = useState<TransitMode>("subway");
  
  // View mode state (diagram vs map)
  const [viewMode, setViewMode] = useState<ViewMode>("diagram");
  
  // Subway state
  const [selectedLine, setSelectedLine] = useState<LineId | null>(null);
  const [trainData, setTrainData] = useState<TrainData>({
    arrivals: [],
    lastUpdated: null,
    isLoading: false,
    error: null,
  });

  // Bus state
  const [selectedBusRoute, setSelectedBusRoute] = useState<string | null>(null);
  const [busData, setBusData] = useState<BusData>({
    arrivals: [],
    availableRoutes: [],
    lastUpdated: null,
    isLoading: false,
    isRoutesLoading: false,
    error: null,
  });

  // Rail state (shared for LIRR and Metro-North)
  const [selectedRailBranch, setSelectedRailBranch] = useState<string | null>(null);
  const [railData, setRailData] = useState<RailData>({
    arrivals: [],
    availableBranches: [],
    lastUpdated: null,
    isLoading: false,
    isBranchesLoading: false,
    error: null,
  });

  // Shared state
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Clear rail selection when mode changes
  useEffect(() => {
    if (selectedMode === "lirr" || selectedMode === "metro-north") {
      setSelectedRailBranch(null);
      setRailData(prev => ({ ...prev, arrivals: [], error: null }));
    }
  }, [selectedMode]);

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
        const rawArrivals: TrainArrival[] = data.data.arrivals.map((arrival: TrainArrival) => ({
          ...arrival,
          arrivalTime: new Date(arrival.arrivalTime),
          departureTime: arrival.departureTime ? new Date(arrival.departureTime) : null,
        }));

        rawArrivals.sort((a, b) => a.arrivalTime.getTime() - b.arrivalTime.getTime());

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

  // Fetch bus routes on mount
  const fetchBusRoutes = useCallback(async () => {
    setBusData(prev => ({ ...prev, isRoutesLoading: true }));

    try {
      const routesResponse = await fetch("/api/buses/routes");
      const routesData = await routesResponse.json();

      if (routesData.success) {
        setBusData(prev => ({
          ...prev,
          availableRoutes: routesData.data.routes,
          isRoutesLoading: false,
        }));
      } else {
        const { getAllKnownRoutes } = await import("@/lib/gtfs/bus-routes");
        setBusData(prev => ({
          ...prev,
          availableRoutes: getAllKnownRoutes(),
          isRoutesLoading: false,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch bus routes:", error);
      const { getAllKnownRoutes } = await import("@/lib/gtfs/bus-routes");
      setBusData(prev => ({
        ...prev,
        availableRoutes: getAllKnownRoutes(),
        isRoutesLoading: false,
      }));
    }
  }, []);

  // Fetch bus arrivals for selected route
  const fetchBuses = useCallback(async () => {
    if (!selectedBusRoute) {
      setBusData(prev => ({
        ...prev,
        arrivals: [],
        error: null,
      }));
      return;
    }

    setBusData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // URL-encode route ID to handle special characters like + in SBS routes
      const response = await fetch(`/api/buses/realtime?routeId=${encodeURIComponent(selectedBusRoute)}&limit=50`);
      const data = await response.json();

      if (data.success && data.data?.arrivals) {
        const arrivals: BusArrival[] = data.data.arrivals.map((arrival: BusArrival) => ({
          ...arrival,
          arrivalTime: arrival.arrivalTime ? new Date(arrival.arrivalTime) : null,
        }));

        setBusData(prev => ({
          ...prev,
          arrivals,
          lastUpdated: new Date(),
          isLoading: false,
          error: null,
        }));
      } else {
        throw new Error(data.error || "Failed to fetch bus data");
      }
    } catch (error) {
      console.error("Failed to fetch buses:", error);
      setBusData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch bus data",
      }));
    }
  }, [selectedBusRoute]);

  // Fetch rail branches
  const fetchRailBranches = useCallback(async (mode: "lirr" | "metro-north") => {
    setRailData(prev => ({ ...prev, isBranchesLoading: true }));

    try {
      const endpoint = mode === "lirr" ? "/api/lirr/realtime" : "/api/metro-north/realtime";
      const response = await fetch(`${endpoint}?limit=1`);
      const data = await response.json();

      if (data.success && data.data?.branches) {
        setRailData(prev => ({
          ...prev,
          availableBranches: data.data.branches,
          isBranchesLoading: false,
        }));
      } else {
        // Use static fallback
        const { getAllLirrBranches, getAllMnrLines } = await import("@/lib/gtfs/rail-stations");
        const branches = mode === "lirr" 
          ? getAllLirrBranches().map(b => ({ id: b.id, name: b.name }))
          : getAllMnrLines().map(l => ({ id: l.id, name: l.name }));
        setRailData(prev => ({
          ...prev,
          availableBranches: branches,
          isBranchesLoading: false,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch rail branches:", error);
      const { getAllLirrBranches, getAllMnrLines } = await import("@/lib/gtfs/rail-stations");
      const branches = mode === "lirr" 
        ? getAllLirrBranches().map(b => ({ id: b.id, name: b.name }))
        : getAllMnrLines().map(l => ({ id: l.id, name: l.name }));
      setRailData(prev => ({
        ...prev,
        availableBranches: branches,
        isBranchesLoading: false,
      }));
    }
  }, []);

  // Fetch rail arrivals
  const fetchRailArrivals = useCallback(async () => {
    if (!selectedRailBranch || (selectedMode !== "lirr" && selectedMode !== "metro-north")) {
      setRailData(prev => ({
        ...prev,
        arrivals: [],
        error: null,
      }));
      return;
    }

    setRailData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const endpoint = selectedMode === "lirr" ? "/api/lirr/realtime" : "/api/metro-north/realtime";
      const response = await fetch(`${endpoint}?routeId=${selectedRailBranch}&limit=100`);
      const data = await response.json();

      if (data.success && data.data?.arrivals) {
        const arrivals: RailArrival[] = data.data.arrivals.map((arrival: RailArrival) => ({
          ...arrival,
          arrivalTime: new Date(arrival.arrivalTime),
          departureTime: arrival.departureTime ? new Date(arrival.departureTime) : null,
        }));

        setRailData(prev => ({
          ...prev,
          arrivals,
          lastUpdated: new Date(),
          isLoading: false,
          error: null,
        }));
      } else {
        throw new Error(data.error || "Failed to fetch rail data");
      }
    } catch (error) {
      console.error("Failed to fetch rail arrivals:", error);
      setRailData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch rail data",
      }));
    }
  }, [selectedRailBranch, selectedMode]);

  // Fetch bus routes on mount
  useEffect(() => {
    fetchBusRoutes();
  }, [fetchBusRoutes]);

  // Fetch rail branches when mode changes
  useEffect(() => {
    if (selectedMode === "lirr" || selectedMode === "metro-north") {
      fetchRailBranches(selectedMode);
    }
  }, [selectedMode, fetchRailBranches]);

  // Fetch on selection change (subway)
  useEffect(() => {
    if (selectedMode === "subway") {
      fetchTrains();
    }
  }, [selectedMode, fetchTrains]);

  // Fetch on selection change (bus)
  useEffect(() => {
    if (selectedMode === "bus") {
      fetchBuses();
    }
  }, [selectedMode, fetchBuses]);

  // Fetch on selection change (rail)
  useEffect(() => {
    if (selectedMode === "lirr" || selectedMode === "metro-north") {
      fetchRailArrivals();
    }
  }, [selectedMode, selectedRailBranch, fetchRailArrivals]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (selectedMode === "subway" && selectedLine) {
        fetchTrains();
      } else if (selectedMode === "bus" && selectedBusRoute) {
        fetchBuses();
      } else if ((selectedMode === "lirr" || selectedMode === "metro-north") && selectedRailBranch) {
        fetchRailArrivals();
      }
    }, REFRESH_INTERVAL * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, selectedMode, selectedLine, selectedBusRoute, selectedRailBranch, fetchTrains, fetchBuses, fetchRailArrivals]);

  // Manual refresh handler
  const handleRefresh = () => {
    if (selectedMode === "subway") {
      fetchTrains();
    } else if (selectedMode === "bus") {
      fetchBuses();
    } else if (selectedMode === "lirr" || selectedMode === "metro-north") {
      fetchRailArrivals();
    }
  };

  // Count trains by direction
  const northboundCount = trainData.arrivals.filter(t => t.direction === "N").length;
  const southboundCount = trainData.arrivals.filter(t => t.direction === "S").length;

  // Get current loading state
  const isLoading = 
    selectedMode === "subway" ? trainData.isLoading : 
    selectedMode === "bus" ? busData.isLoading : 
    railData.isLoading;
  
  const hasSelection = 
    selectedMode === "subway" ? selectedLine : 
    selectedMode === "bus" ? selectedBusRoute : 
    selectedRailBranch;

  const selectedBranchInfo = railData.availableBranches.find(b => b.id === selectedRailBranch);

  // Get stations with coordinates for map view
  const mapStations = useMemo(() => {
    if (selectedMode === "subway" && selectedLine) {
      const stations = getLineStations(selectedLine);
      return stations.filter(s => s.lat && s.lon).map(s => ({
        id: s.id,
        name: s.name,
        lat: s.lat!,
        lon: s.lon!,
        type: s.type,
      }));
    }
    if ((selectedMode === "lirr" || selectedMode === "metro-north") && selectedRailBranch) {
      const stations = getRailBranchStations(selectedRailBranch, selectedMode);
      return stations.filter(s => s.lat && s.lon).map(s => ({
        id: s.id,
        name: s.name,
        lat: s.lat!,
        lon: s.lon!,
        type: s.type,
      }));
    }
    if (selectedMode === "bus" && selectedBusRoute) {
      const busData = getBusRouteData(selectedBusRoute);
      return busData.stops.map(s => ({
        id: s.id,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        type: undefined,
      }));
    }
    return [];
  }, [selectedMode, selectedLine, selectedRailBranch, selectedBusRoute]);

  // Get bus route shape for map
  const busRouteShape = useMemo(() => {
    if (selectedMode === "bus" && selectedBusRoute) {
      const busData = getBusRouteData(selectedBusRoute);
      return busData.shape;
    }
    return [];
  }, [selectedMode, selectedBusRoute]);

  // Get line color for map
  const mapLineColor = useMemo(() => {
    if (selectedMode === "subway" && selectedLine) {
      return getLineColor(selectedLine);
    }
    if ((selectedMode === "lirr" || selectedMode === "metro-north") && selectedRailBranch) {
      return getRailBranchColor(selectedRailBranch, selectedMode);
    }
    if (selectedMode === "bus") {
      return "#3b82f6"; // Blue for buses
    }
    return "#808080";
  }, [selectedMode, selectedLine, selectedRailBranch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Live Transit Tracker
          </h1>
          <p className="mt-1 text-foreground/70">
            {selectedMode === "subway" && "Watch trains move in real-time along the line"}
            {selectedMode === "bus" && "Track buses and see live arrival times"}
            {selectedMode === "lirr" && "Track LIRR trains by branch"}
            {selectedMode === "metro-north" && "Track Metro-North trains by line"}
          </p>
        </div>

        {/* Legend Button */}
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
              
              {/* Subway Legend */}
              {selectedMode === "subway" && (
                <>
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
                </>
              )}

              {/* Bus Legend */}
              {selectedMode === "bus" && (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                      Bus Markers
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500 text-white text-xs font-bold">
                          M15
                        </div>
                        <span className="text-foreground/80">Active bus with route number</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500 text-white text-xs font-bold">
                          M15+
                        </div>
                        <span className="text-foreground/80">Select Bus Service (SBS)</span>
                      </div>
                    </div>
                  </div>

                  <Divider />

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                      Map View
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-1 bg-blue-500 rounded" />
                        <span className="text-foreground/80">Bus route path</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full border-2 border-blue-500 bg-background" />
                        <span className="text-foreground/80">Bus stop</span>
                      </div>
                    </div>
                  </div>

                  <Divider />

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                      Route Types
                    </p>
                    <div className="space-y-1 text-sm text-foreground/80">
                      <p><strong>M, B, Q, Bx, S</strong> — Local routes</p>
                      <p><strong>BM, BxM, QM, SIM, X</strong> — Express routes</p>
                      <p><strong>+ suffix</strong> — Select Bus Service</p>
                    </div>
                  </div>
                </>
              )}

              {/* LIRR Legend */}
              {selectedMode === "lirr" && (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                      Train Markers
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-success text-white text-xs font-bold">
                          🚆 ↑
                        </div>
                        <span className="text-foreground/80">Outbound (from Penn Station)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-success text-white text-xs font-bold">
                          🚆 ↓
                        </div>
                        <span className="text-foreground/80">Inbound (to Penn Station)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-warning text-white text-xs font-bold">
                          🚆
                        </div>
                        <span className="text-foreground/80">Delayed train (2+ min late)</span>
                      </div>
                    </div>
                  </div>

                  <Divider />

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                      Station Markers
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border-[3px] border-[#0039A6] bg-background" />
                        <span className="text-foreground/80">Station on the branch</span>
                      </div>
                    </div>
                  </div>

                  <Divider />

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                      Terminals
                    </p>
                    <div className="text-sm text-foreground/80">
                      <p>All LIRR branches connect to <strong>Penn Station</strong> in Manhattan (some via Jamaica).</p>
                    </div>
                  </div>
                </>
              )}

              {/* Metro-North Legend */}
              {selectedMode === "metro-north" && (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                      Train Markers
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-success text-white text-xs font-bold">
                          🚆 ↑
                        </div>
                        <span className="text-foreground/80">Outbound (from Grand Central)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-success text-white text-xs font-bold">
                          🚆 ↓
                        </div>
                        <span className="text-foreground/80">Inbound (to Grand Central)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-warning text-white text-xs font-bold">
                          🚆
                        </div>
                        <span className="text-foreground/80">Delayed train (2+ min late)</span>
                      </div>
                    </div>
                  </div>

                  <Divider />

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                      Station Markers
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border-[3px] border-[#D93A30] bg-background" />
                        <span className="text-foreground/80">Station on the line</span>
                      </div>
                    </div>
                  </div>

                  <Divider />

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                      Lines
                    </p>
                    <div className="text-sm text-foreground/80 space-y-1">
                      <p><strong>Hudson</strong> — North along Hudson River</p>
                      <p><strong>Harlem</strong> — North through Bronx</p>
                      <p><strong>New Haven</strong> — East to Connecticut</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Mode Selector */}
      <ModeSelector
        selectedMode={selectedMode}
        onModeChange={setSelectedMode}
        availableModes={["subway", "bus", "lirr", "metro-north"]}
      />

      {/* Controls Bar */}
      <Card>
        <CardBody className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Route/Line Selector based on mode */}
          <div className="flex-1">
            {selectedMode === "subway" && (
              <LineSelector
                selectedLine={selectedLine}
                onSelectionChange={setSelectedLine}
              />
            )}
            {selectedMode === "bus" && (
              <BusSelector
                selectedRoute={selectedBusRoute}
                onSelectionChange={setSelectedBusRoute}
                availableRoutes={busData.availableRoutes}
                isLoading={busData.isRoutesLoading}
              />
            )}
            {(selectedMode === "lirr" || selectedMode === "metro-north") && (
              <RailSelector
                mode={selectedMode}
                selectedBranch={selectedRailBranch}
                onSelectionChange={setSelectedRailBranch}
                availableBranches={railData.availableBranches}
                isLoading={railData.isBranchesLoading}
              />
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* View Toggle (Diagram/Map) */}
            <ButtonGroup size="sm" variant="flat">
              <Button
                startContent={<ListTree className="h-4 w-4" />}
                className={viewMode === "diagram" ? "bg-primary/20" : ""}
                onPress={() => setViewMode("diagram")}
              >
                Diagram
              </Button>
              <Button
                startContent={<Map className="h-4 w-4" />}
                className={viewMode === "map" ? "bg-primary/20" : ""}
                onPress={() => setViewMode("map")}
              >
                Map
              </Button>
            </ButtonGroup>

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
              isLoading={isLoading}
              onPress={handleRefresh}
              startContent={!isLoading && <RefreshCw className="h-4 w-4" />}
              isDisabled={!hasSelection}
            >
              Refresh
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Status Bar (subway only) */}
      {selectedMode === "subway" && selectedLine && (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {trainData.lastUpdated && (
            <div className="flex items-center gap-1.5 text-foreground/60">
              <Clock className="h-4 w-4" />
              <span>
                Updated {formatDistanceToNow(trainData.lastUpdated, { addSuffix: true })}
              </span>
            </div>
          )}

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

      {/* Main Content Area */}
      <div style={{ height: "calc(100vh - 340px)", minHeight: "400px" }}>
        {/* Map View (all modes) */}
        {viewMode === "map" && (
          <TransitMap
            mode={selectedMode}
            selectedLine={
              selectedMode === "subway" ? selectedLine :
              selectedMode === "bus" ? selectedBusRoute :
              selectedRailBranch
            }
            stations={mapStations}
            lineColor={mapLineColor}
            trains={selectedMode === "subway" ? trainData.arrivals : undefined}
            railTrains={(selectedMode === "lirr" || selectedMode === "metro-north") ? railData.arrivals : undefined}
            buses={selectedMode === "bus" ? busData.arrivals : undefined}
            busRouteShape={busRouteShape}
            isLoading={isLoading}
          />
        )}

        {/* Diagram Views */}
        {viewMode === "diagram" && (
          <>
            {/* Subway View */}
            {selectedMode === "subway" && (
              <LineDiagram
                selectedLine={selectedLine}
                trains={trainData.arrivals}
                isLoading={trainData.isLoading}
                error={trainData.error}
              />
            )}

            {/* Bus View */}
            {selectedMode === "bus" && (
              <BusList
                selectedRoute={selectedBusRoute}
                buses={busData.arrivals}
                isLoading={busData.isLoading}
                error={busData.error}
                lastUpdated={busData.lastUpdated}
              />
            )}

            {/* LIRR View */}
            {selectedMode === "lirr" && (
              <RailDiagram
                mode="lirr"
                selectedBranch={selectedRailBranch}
                selectedBranchName={selectedBranchInfo?.name}
                trains={railData.arrivals}
                isLoading={railData.isLoading}
                error={railData.error}
                lastUpdated={railData.lastUpdated}
              />
            )}

            {/* Metro-North View */}
            {selectedMode === "metro-north" && (
              <RailDiagram
                mode="metro-north"
                selectedBranch={selectedRailBranch}
                selectedBranchName={selectedBranchInfo?.name}
                trains={railData.arrivals}
                isLoading={railData.isLoading}
                error={railData.error}
                lastUpdated={railData.lastUpdated}
              />
            )}
          </>
        )}
      </div>

      {/* Instructions */}
      {selectedMode === "subway" && !selectedLine && (
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

      {selectedMode === "bus" && !selectedBusRoute && (
        <Card className="bg-primary/5 border-primary/20">
          <CardBody className="text-center py-8">
            <h3 className="text-lg font-medium text-foreground mb-2">
              How to use the Bus Tracker
            </h3>
            <ol className="text-foreground/70 text-sm space-y-2 max-w-md mx-auto text-left list-decimal list-inside">
              <li>Click &quot;Select Route&quot; above to choose a bus route</li>
              <li>See all active buses on that route grouped by destination</li>
              <li>View next stop, ETA, and distance for each bus</li>
              <li>Data refreshes automatically every 30 seconds</li>
            </ol>
          </CardBody>
        </Card>
      )}

      {(selectedMode === "lirr" || selectedMode === "metro-north") && !selectedRailBranch && (
        <Card className="bg-primary/5 border-primary/20">
          <CardBody className="text-center py-8">
            <h3 className="text-lg font-medium text-foreground mb-2">
              How to use the {selectedMode === "lirr" ? "LIRR" : "Metro-North"} Tracker
            </h3>
            <ol className="text-foreground/70 text-sm space-y-2 max-w-md mx-auto text-left list-decimal list-inside">
              <li>Click &quot;Select {selectedMode === "lirr" ? "Branch" : "Line"}&quot; above to choose a route</li>
              <li>See all scheduled trains grouped by direction</li>
              <li>View arrival times and any delays</li>
              <li>Data refreshes automatically every 30 seconds</li>
            </ol>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
