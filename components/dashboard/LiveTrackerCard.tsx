"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardBody, CardHeader, Spinner, Tabs, Tab } from "@heroui/react";
import { Radio, ArrowRight, Train, Bus, TrainFront } from "lucide-react";
import Link from "next/link";
import { SubwayBullet, BusBadge, RailBadge } from "@/components/ui";
import type { TrainArrival, SubwayLine } from "@/types/mta";

interface SubwaySummary {
  totalTrains: number;
  activeLines: SubwayLine[];
  isLoading: boolean;
  error: string | null;
}

interface BusSummary {
  totalBuses: number;
  activeRoutes: string[];
  isLoading: boolean;
  error: string | null;
}

interface RailSummary {
  totalTrains: number;
  activeBranches: Array<{ id: string; name: string }>;
  isLoading: boolean;
  error: string | null;
}

// Line order for display (grouped by color family)
const LINE_ORDER: SubwayLine[] = [
  "1", "2", "3",           // Red
  "4", "5", "6",           // Green  
  "7",                     // Purple
  "A", "C", "E",           // Blue
  "B", "D", "F", "M",      // Orange
  "G",                     // Lime
  "J", "Z",                // Brown
  "L",                     // Gray
  "N", "Q", "R", "W",      // Yellow
  "S",                     // Shuttle
];

type TabMode = "subway" | "bus" | "rail";

export function LiveTrackerCard() {
  const [selectedTab, setSelectedTab] = useState<TabMode>("subway");
  
  const [subwaySummary, setSubwaySummary] = useState<SubwaySummary>({
    totalTrains: 0,
    activeLines: [],
    isLoading: true,
    error: null,
  });

  const [busSummary, setBusSummary] = useState<BusSummary>({
    totalBuses: 0,
    activeRoutes: [],
    isLoading: true,
    error: null,
  });

  const [lirrSummary, setLirrSummary] = useState<RailSummary>({
    totalTrains: 0,
    activeBranches: [],
    isLoading: true,
    error: null,
  });

  const [mnrSummary, setMnrSummary] = useState<RailSummary>({
    totalTrains: 0,
    activeBranches: [],
    isLoading: true,
    error: null,
  });

  // Fetch subway summary
  useEffect(() => {
    async function fetchSubwaySummary() {
      try {
        const response = await fetch("/api/trains/realtime?limit=500");
        if (!response.ok) throw new Error("Failed to fetch trains");
        
        const data = await response.json();
        
        if (data.success && data.data?.arrivals) {
          const arrivals: TrainArrival[] = data.data.arrivals;
          const uniqueTrips = new Set(arrivals.map(a => a.tripId));
          const activeLinesSet = new Set(arrivals.map(a => a.routeId as SubwayLine));
          const activeLines = LINE_ORDER.filter(line => activeLinesSet.has(line));
          
          setSubwaySummary({
            totalTrains: uniqueTrips.size,
            activeLines,
            isLoading: false,
            error: null,
          });
        } else {
          throw new Error(data.error || "No data");
        }
      } catch (err) {
        setSubwaySummary(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load",
        }));
      }
    }

    fetchSubwaySummary();
    const interval = setInterval(fetchSubwaySummary, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch bus summary
  useEffect(() => {
    async function fetchBusSummary() {
      try {
        const response = await fetch("/api/buses/routes");
        if (!response.ok) throw new Error("Failed to fetch buses");
        
        const data = await response.json();
        
        if (data.success && data.data) {
          setBusSummary({
            totalBuses: data.data.totalCount,
            activeRoutes: data.data.routes.slice(0, 20), // Just show first 20
            isLoading: false,
            error: null,
          });
        } else {
          throw new Error(data.error || "No data");
        }
      } catch (err) {
        setBusSummary(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load",
        }));
      }
    }

    fetchBusSummary();
  }, []);

  // Fetch LIRR summary
  useEffect(() => {
    async function fetchLirrSummary() {
      try {
        const response = await fetch("/api/lirr/realtime?limit=100");
        if (!response.ok) throw new Error("Failed to fetch LIRR");
        
        const data = await response.json();
        
        if (data.success && data.data) {
          const uniqueTrips = new Set(data.data.arrivals?.map((a: { tripId: string }) => a.tripId) ?? []);
          
          setLirrSummary({
            totalTrains: uniqueTrips.size,
            activeBranches: data.data.branches ?? [],
            isLoading: false,
            error: null,
          });
        } else {
          throw new Error(data.error || "No data");
        }
      } catch (err) {
        setLirrSummary(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load",
        }));
      }
    }

    fetchLirrSummary();
    const interval = setInterval(fetchLirrSummary, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Metro-North summary
  useEffect(() => {
    async function fetchMnrSummary() {
      try {
        const response = await fetch("/api/metro-north/realtime?limit=100");
        if (!response.ok) throw new Error("Failed to fetch Metro-North");
        
        const data = await response.json();
        
        if (data.success && data.data) {
          const uniqueTrips = new Set(data.data.arrivals?.map((a: { tripId: string }) => a.tripId) ?? []);
          
          setMnrSummary({
            totalTrains: uniqueTrips.size,
            activeBranches: data.data.branches ?? [],
            isLoading: false,
            error: null,
          });
        } else {
          throw new Error(data.error || "No data");
        }
      } catch (err) {
        setMnrSummary(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load",
        }));
      }
    }

    fetchMnrSummary();
    const interval = setInterval(fetchMnrSummary, 60000);
    return () => clearInterval(interval);
  }, []);

  // Combined rail summary
  const railSummary = useMemo(() => ({
    totalTrains: lirrSummary.totalTrains + mnrSummary.totalTrains,
    lirrBranches: lirrSummary.activeBranches,
    mnrLines: mnrSummary.activeBranches,
    isLoading: lirrSummary.isLoading || mnrSummary.isLoading,
    error: lirrSummary.error || mnrSummary.error,
  }), [lirrSummary, mnrSummary]);

  // Link destination based on tab
  const linkHref = useMemo(() => {
    switch (selectedTab) {
      case "bus": return "/realtime?mode=bus";
      case "rail": return "/realtime?mode=lirr";
      default: return "/realtime";
    }
  }, [selectedTab]);

  const pulseAnimation = "animate-pulse";

  return (
    <Card className="h-full w-full flex flex-col overflow-hidden">
      <CardHeader className="flex justify-between items-start pb-2">
        <div className="flex gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
            <Radio className="h-5 w-5" />
            <span className={`absolute top-1 right-1 w-2 h-2 bg-success rounded-full ${pulseAnimation}`} />
          </div>
          <div>
            <p className="text-lg font-semibold">Live Tracker</p>
            <p className="text-sm text-foreground/50">Real-time transit</p>
          </div>
        </div>
        <Link href={linkHref}>
          <ArrowRight className="h-4 w-4 text-foreground/30 hover:text-foreground/60 transition-colors" />
        </Link>
      </CardHeader>
      
      <CardBody className="pt-0 flex-1 flex flex-col gap-2">
        {/* Mode Tabs */}
        <Tabs
          aria-label="Transit modes"
          selectedKey={selectedTab}
          onSelectionChange={(key) => setSelectedTab(key as TabMode)}
          size="sm"
          color="success"
          variant="underlined"
          classNames={{
            tabList: "gap-0 w-full",
            tab: "flex-1 h-8",
            cursor: "bg-success",
          }}
        >
          <Tab
            key="subway"
            title={
              <div className="flex items-center gap-1">
                <Train className="h-3.5 w-3.5" />
                <span className="text-xs">Subway</span>
              </div>
            }
          />
          <Tab
            key="bus"
            title={
              <div className="flex items-center gap-1">
                <Bus className="h-3.5 w-3.5" />
                <span className="text-xs">Bus</span>
              </div>
            }
          />
          <Tab
            key="rail"
            title={
              <div className="flex items-center gap-1">
                <TrainFront className="h-3.5 w-3.5" />
                <span className="text-xs">Rail</span>
              </div>
            }
          />
        </Tabs>

        {/* Tab Content */}
        <Link href={linkHref} className="flex-1 flex flex-col justify-center">
          {/* Subway Tab */}
          {selectedTab === "subway" && (
            <>
              {subwaySummary.isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner size="sm" color="success" />
                </div>
              ) : subwaySummary.error ? (
                <div className="flex items-center justify-center py-4">
                  <p className="text-sm text-foreground/50">Tap to view trains</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2">
                    <Train className="h-5 w-5 text-success" />
                    <span className="text-2xl font-bold text-success">{subwaySummary.totalTrains}</span>
                    <span className="text-sm text-foreground/60">trains</span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-foreground/50 text-center">
                      {subwaySummary.activeLines.length} lines active
                    </p>
                    <div className="flex flex-wrap justify-center gap-0.5">
                      {subwaySummary.activeLines.slice(0, 10).map((line) => (
                        <SubwayBullet key={line} line={line} size="xs" />
                      ))}
                      {subwaySummary.activeLines.length > 10 && (
                        <span className="text-xs text-foreground/50 self-center ml-1">
                          +{subwaySummary.activeLines.length - 10}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Bus Tab */}
          {selectedTab === "bus" && (
            <>
              {busSummary.isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner size="sm" color="success" />
                </div>
              ) : busSummary.error ? (
                <div className="flex items-center justify-center py-4">
                  <p className="text-sm text-foreground/50">Tap to view buses</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2">
                    <Bus className="h-5 w-5 text-success" />
                    <span className="text-2xl font-bold text-success">{busSummary.totalBuses}</span>
                    <span className="text-sm text-foreground/60">routes</span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-foreground/50 text-center">
                      Active routes
                    </p>
                    <div className="flex flex-wrap justify-center gap-0.5">
                      {busSummary.activeRoutes.slice(0, 8).map((route) => (
                        <BusBadge key={route} route={route} size="xs" />
                      ))}
                      {busSummary.activeRoutes.length > 8 && (
                        <span className="text-xs text-foreground/50 self-center ml-1">
                          +{busSummary.activeRoutes.length - 8}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Rail Tab */}
          {selectedTab === "rail" && (
            <>
              {railSummary.isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner size="sm" color="success" />
                </div>
              ) : railSummary.error ? (
                <div className="flex items-center justify-center py-4">
                  <p className="text-sm text-foreground/50">Tap to view trains</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2">
                    <TrainFront className="h-5 w-5 text-success" />
                    <span className="text-2xl font-bold text-success">{railSummary.totalTrains}</span>
                    <span className="text-sm text-foreground/60">trains</span>
                  </div>
                  
                  <div className="space-y-1.5">
                    {/* LIRR */}
                    <div className="space-y-0.5">
                      <p className="text-xs text-foreground/50 text-center">LIRR</p>
                      <div className="flex flex-wrap justify-center gap-0.5">
                        {railSummary.lirrBranches.slice(0, 4).map((branch) => (
                          <RailBadge 
                            key={branch.id} 
                            branchId={branch.id} 
                            branchName={branch.name} 
                            mode="lirr" 
                            size="xs" 
                            abbreviated 
                          />
                        ))}
                        {railSummary.lirrBranches.length > 4 && (
                          <span className="text-xs text-foreground/50 self-center">
                            +{railSummary.lirrBranches.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Metro-North */}
                    <div className="space-y-0.5">
                      <p className="text-xs text-foreground/50 text-center">Metro-North</p>
                      <div className="flex flex-wrap justify-center gap-0.5">
                        {railSummary.mnrLines.slice(0, 4).map((line) => (
                          <RailBadge 
                            key={line.id} 
                            branchId={line.id} 
                            branchName={line.name} 
                            mode="metro-north" 
                            size="xs" 
                            abbreviated 
                          />
                        ))}
                        {railSummary.mnrLines.length > 4 && (
                          <span className="text-xs text-foreground/50 self-center">
                            +{railSummary.mnrLines.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </Link>
      </CardBody>
    </Card>
  );
}
