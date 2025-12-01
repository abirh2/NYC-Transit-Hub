"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardBody, Switch, Chip, Tabs, Tab, Button } from "@heroui/react";
import { 
  Accessibility, 
  Clock, 
  Wifi, 
  WifiOff, 
  Zap, 
  Calendar,
  Navigation
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { 
  OutageStats, 
  OutageFilters, 
  OutageList,
  RouteFinder,
  type OutageFiltersState,
  type OutageTab,
  type OutageSortOption,
} from "@/components/accessibility";
import type { EquipmentOutage } from "@/types/mta";
import type { OutageStats as OutageStatsType } from "@/types/api";

const REFRESH_INTERVAL = 60; // seconds

type AccessibilityTab = "outages" | "routes";

interface ElevatorsApiResponse {
  success: boolean;
  data: {
    equipment: EquipmentOutage[];
    totalOutages: number;
    lastUpdated: string;
  };
  error?: string;
}

// Compute stats for outages
function computeOutageStats(outages: EquipmentOutage[]): OutageStatsType {
  const byBorough = new Map<string, number>();
  const byLine = new Map<string, number>();
  let elevatorCount = 0;
  let escalatorCount = 0;
  let adaCount = 0;

  for (const outage of outages) {
    // By type
    if (outage.equipmentType === "ELEVATOR") {
      elevatorCount++;
    } else {
      escalatorCount++;
    }

    // ADA impacting
    if (outage.adaCompliant && outage.equipmentType === "ELEVATOR") {
      adaCount++;
    }

    // By borough
    const borough = outage.borough || "Unknown";
    byBorough.set(borough, (byBorough.get(borough) || 0) + 1);

    // By line
    for (const line of outage.trainLines) {
      byLine.set(line, (byLine.get(line) || 0) + 1);
    }
  }

  return {
    totalOutages: outages.length,
    elevatorOutages: elevatorCount,
    escalatorOutages: escalatorCount,
    adaImpactingOutages: adaCount,
    byBorough: Array.from(byBorough.entries())
      .map(([borough, count]) => ({ borough, count }))
      .sort((a, b) => b.count - a.count),
    byLine: Array.from(byLine.entries())
      .map(([line, count]) => ({ line, count }))
      .sort((a, b) => b.count - a.count),
  };
}

// Filter outages based on user selections
function applyOutageFilters(
  outages: EquipmentOutage[],
  filters: OutageFiltersState
): EquipmentOutage[] {
  let filtered = outages;

  // Filter by station name
  if (filters.stationSearch) {
    const search = filters.stationSearch.toLowerCase();
    filtered = filtered.filter(o => 
      o.stationName.toLowerCase().includes(search)
    );
  }

  // Filter by lines
  if (filters.lines.length > 0) {
    filtered = filtered.filter(o =>
      o.trainLines.some(line => filters.lines.includes(line))
    );
  }

  // Filter by equipment type
  if (filters.equipmentTypes.length > 0) {
    filtered = filtered.filter(o =>
      filters.equipmentTypes.includes(o.equipmentType)
    );
  }

  // Filter by ADA
  if (filters.adaOnly) {
    filtered = filtered.filter(o => o.adaCompliant);
  }

  return filtered;
}

// Sort outages
function sortOutages(
  outages: EquipmentOutage[],
  sortBy: OutageSortOption
): EquipmentOutage[] {
  const sorted = [...outages];

  if (sortBy === "station") {
    sorted.sort((a, b) => a.stationName.localeCompare(b.stationName));
  } else if (sortBy === "recent") {
    sorted.sort((a, b) => {
      const aTime = a.outageStartTime?.getTime() ?? 0;
      const bTime = b.outageStartTime?.getTime() ?? 0;
      return bTime - aTime;
    });
  } else if (sortBy === "return") {
    sorted.sort((a, b) => {
      const aTime = a.estimatedReturn?.getTime() ?? Infinity;
      const bTime = b.estimatedReturn?.getTime() ?? Infinity;
      return aTime - bTime;
    });
  }

  return sorted;
}

export function AccessibilityClient() {
  const [mainTab, setMainTab] = useState<AccessibilityTab>("outages");
  const [outageTab, setOutageTab] = useState<OutageTab>("current");
  
  const [currentOutages, setCurrentOutages] = useState<EquipmentOutage[]>([]);
  const [upcomingOutages, setUpcomingOutages] = useState<EquipmentOutage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const [filters, setFilters] = useState<OutageFiltersState>({
    stationSearch: "",
    lines: [],
    equipmentTypes: [],
    adaOnly: false,
    sortBy: "station",
  });

  // Fetch outages
  const fetchOutages = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch current and upcoming in parallel
      const [currentRes, upcomingRes] = await Promise.all([
        fetch("/api/elevators"),
        fetch("/api/elevators/upcoming"),
      ]);

      const currentData: ElevatorsApiResponse = await currentRes.json();
      const upcomingData: ElevatorsApiResponse = await upcomingRes.json();

      if (currentData.success) {
        // Parse dates
        const parsed = currentData.data.equipment.map(o => ({
          ...o,
          outageStartTime: o.outageStartTime ? new Date(o.outageStartTime) : null,
          estimatedReturn: o.estimatedReturn ? new Date(o.estimatedReturn) : null,
        }));
        setCurrentOutages(parsed);
      }

      if (upcomingData.success) {
        const parsed = upcomingData.data.equipment.map(o => ({
          ...o,
          outageStartTime: o.outageStartTime ? new Date(o.outageStartTime) : null,
          estimatedReturn: o.estimatedReturn ? new Date(o.estimatedReturn) : null,
        }));
        setUpcomingOutages(parsed);
      }

      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Failed to fetch outages:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch outages");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchOutages();
  }, [fetchOutages]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchOutages, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOutages]);

  // Get outages for current tab
  const activeOutages = outageTab === "current" ? currentOutages : upcomingOutages;

  // Apply filters and sorting
  const filteredOutages = useMemo(() => {
    const filtered = applyOutageFilters(activeOutages, filters);
    return sortOutages(filtered, filters.sortBy);
  }, [activeOutages, filters]);

  // Compute stats
  const stats = useMemo(() => {
    return computeOutageStats(filteredOutages);
  }, [filteredOutages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Accessibility className="h-7 w-7 text-primary" />
            Accessibility
          </h1>
          <p className="mt-1 text-foreground/70">
            Find accessible routes and check elevator/escalator status
          </p>
        </div>

        {/* Auto-refresh Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              size="sm"
              isSelected={autoRefresh}
              onValueChange={setAutoRefresh}
            />
            <span className="text-sm text-foreground/70">Auto-refresh</span>
            {autoRefresh ? (
              <Wifi className="h-4 w-4 text-success" />
            ) : (
              <WifiOff className="h-4 w-4 text-foreground/30" />
            )}
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs
        aria-label="Accessibility tabs"
        selectedKey={mainTab}
        onSelectionChange={(key) => setMainTab(key as AccessibilityTab)}
        color="primary"
        variant="underlined"
        classNames={{
          tabList: "gap-6",
          cursor: "w-full bg-primary",
          tab: "max-w-fit px-0 h-12",
        }}
      >
        <Tab
          key="outages"
          title={
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>Outages</span>
              {currentOutages.length > 0 && (
                <Chip size="sm" variant="flat" color="warning">
                  {currentOutages.length}
                </Chip>
              )}
            </div>
          }
        />
        <Tab
          key="routes"
          title={
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              <span>Route Finder</span>
            </div>
          }
        />
      </Tabs>

      {/* Outages Tab Content */}
      {mainTab === "outages" && (
        <>
          {/* Stats Cards */}
          <OutageStats 
            stats={stats} 
            isLoading={isLoading && currentOutages.length === 0}
            isUpcoming={outageTab === "upcoming"}
          />

          {/* Filters Bar */}
          <Card>
            <CardBody className="py-4">
              <OutageFilters
                filters={filters}
                onFiltersChange={setFilters}
                onRefresh={fetchOutages}
                isLoading={isLoading}
                activeTab={outageTab}
              />
            </CardBody>
          </Card>

          {/* Status Bar with Current/Upcoming Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-4">
              {lastUpdated && (
                <div className="flex items-center gap-1.5 text-foreground/60">
                  <Clock className="h-4 w-4" />
                  <span>
                    Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                  </span>
                </div>
              )}
              
              <Chip 
                size="sm" 
                variant="flat" 
                color={filteredOutages.length > 0 ? "warning" : "success"}
              >
                {filteredOutages.length} {outageTab === "current" ? "current" : "upcoming"} outage{filteredOutages.length !== 1 ? "s" : ""}
              </Chip>
            </div>

            {/* Current/Upcoming Toggle */}
            <div className="flex items-center gap-1 p-1 bg-default-100 rounded-lg">
              <Button
                size="sm"
                variant={outageTab === "current" ? "solid" : "light"}
                color={outageTab === "current" ? "warning" : "default"}
                onPress={() => setOutageTab("current")}
                className="gap-1.5"
              >
                <Zap className="h-3.5 w-3.5" />
                Current
                {currentOutages.length > 0 && (
                  <span className={outageTab === "current" ? "text-warning-foreground" : "text-warning"}>
                    {currentOutages.length}
                  </span>
                )}
              </Button>
              <Button
                size="sm"
                variant={outageTab === "upcoming" ? "solid" : "light"}
                color={outageTab === "upcoming" ? "secondary" : "default"}
                onPress={() => setOutageTab("upcoming")}
                className="gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5" />
                Upcoming
                {upcomingOutages.length > 0 && (
                  <span className={outageTab === "upcoming" ? "" : "text-foreground/60"}>
                    {upcomingOutages.length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Outage List */}
          <OutageList
            outages={filteredOutages}
            isLoading={isLoading && activeOutages.length === 0}
            error={error}
            isUpcoming={outageTab === "upcoming"}
            emptyMessage={
              outageTab === "current"
                ? "All elevators and escalators are currently operating normally."
                : "No upcoming planned outages scheduled."
            }
          />
        </>
      )}

      {/* Route Finder Tab Content */}
      {mainTab === "routes" && (
        <RouteFinder />
      )}
    </div>
  );
}

