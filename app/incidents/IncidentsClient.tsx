"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardBody, Switch, Chip, Tabs, Tab } from "@heroui/react";
import { AlertTriangle, Clock, Wifi, WifiOff, Calendar, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { 
  IncidentStats, 
  IncidentFilters, 
  IncidentTimeline,
  type IncidentFiltersState,
  type IncidentTab,
  type SortOption,
} from "@/components/incidents";
import type { ServiceAlert, AlertSeverity, AlertType } from "@/types/mta";
import type { IncidentStats as IncidentStatsType } from "@/types/api";

const REFRESH_INTERVAL = 30; // seconds

// Types that can appear in "Upcoming" tab
const UPCOMING_ALERT_TYPES: AlertType[] = ["PLANNED_WORK", "REDUCED_SERVICE", "SERVICE_CHANGE"];

interface IncidentsApiResponse {
  success: boolean;
  data: {
    incidents: ServiceAlert[];
    stats: IncidentStatsType;
    lastUpdated: string;
  };
  error?: string;
}

// Determine if incident is currently active (has started and not ended)
function isActiveNow(incident: ServiceAlert): boolean {
  const now = new Date();
  const hasStarted = !incident.activePeriodStart || incident.activePeriodStart <= now;
  const hasEnded = incident.activePeriodEnd && incident.activePeriodEnd <= now;
  return hasStarted && !hasEnded;
}

// Determine if incident is upcoming (not yet started)
function isUpcoming(incident: ServiceAlert): boolean {
  const now = new Date();
  return incident.activePeriodStart !== null && incident.activePeriodStart > now;
}

// Filter incidents by user selections
function applyFilters(
  incidents: ServiceAlert[],
  filters: IncidentFiltersState
): ServiceAlert[] {
  let filtered = incidents;
  
  // Filter by routes (multi-select)
  if (filters.routeIds.length > 0) {
    filtered = filtered.filter(i => 
      i.affectedRoutes.some(route => filters.routeIds.includes(route))
    );
  }
  
  // Filter by alert types (multi-select)
  if (filters.alertTypes.length > 0) {
    filtered = filtered.filter(i => 
      filters.alertTypes.includes(i.alertType)
    );
  }
  
  // Filter by severities (multi-select)
  if (filters.severities.length > 0) {
    filtered = filtered.filter(i => 
      filters.severities.includes(i.severity)
    );
  }
  
  return filtered;
}

// Sort incidents based on selected option
function sortIncidents(incidents: ServiceAlert[], sortBy: SortOption): ServiceAlert[] {
  const sorted = [...incidents];
  
  const severityOrder: Record<AlertSeverity, number> = {
    SEVERE: 0,
    WARNING: 1,
    INFO: 2,
  };
  
  if (sortBy === "severity") {
    sorted.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      // Secondary sort by most recent
      const aTime = a.activePeriodStart?.getTime() ?? 0;
      const bTime = b.activePeriodStart?.getTime() ?? 0;
      return bTime - aTime;
    });
  } else if (sortBy === "recent") {
    // Most recently started first
    sorted.sort((a, b) => {
      const aTime = a.activePeriodStart?.getTime() ?? 0;
      const bTime = b.activePeriodStart?.getTime() ?? 0;
      return bTime - aTime;
    });
  } else if (sortBy === "soonest") {
    // Starting soonest first (for upcoming)
    sorted.sort((a, b) => {
      const aTime = a.activePeriodStart?.getTime() ?? Infinity;
      const bTime = b.activePeriodStart?.getTime() ?? Infinity;
      return aTime - bTime;
    });
  }
  
  return sorted;
}

// Compute stats for a given set of incidents
function computeLocalStats(incidents: ServiceAlert[]): IncidentStatsType {
  const lineCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();
  let severe = 0, warning = 0, info = 0;
  
  for (const incident of incidents) {
    // Count lines
    for (const line of incident.affectedRoutes) {
      lineCounts.set(line, (lineCounts.get(line) || 0) + 1);
    }
    // Count types
    typeCounts.set(incident.alertType, (typeCounts.get(incident.alertType) || 0) + 1);
    // Count severities
    if (incident.severity === "SEVERE") severe++;
    else if (incident.severity === "WARNING") warning++;
    else info++;
  }
  
  return {
    total: incidents.length,
    byLine: Array.from(lineCounts.entries())
      .map(([line, count]) => ({ line, count }))
      .sort((a, b) => b.count - a.count),
    byType: Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    bySeverity: { severe, warning, info },
  };
}

export function IncidentsClient() {
  const [allIncidents, setAllIncidents] = useState<ServiceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<IncidentTab>("active");
  
  const [filters, setFilters] = useState<IncidentFiltersState>({
    routeIds: [],
    alertTypes: [],
    severities: [],
    sortBy: "severity",
  });

  // When tab changes, reset sort to appropriate default
  const handleTabChange = (tab: IncidentTab) => {
    setActiveTab(tab);
    setFilters(prev => ({
      ...prev,
      sortBy: tab === "active" ? "severity" : "soonest",
    }));
  };

  // Fetch all incidents (we'll filter client-side for tabs)
  const fetchIncidents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/incidents");
      const data: IncidentsApiResponse = await response.json();

      if (data.success && data.data) {
        // Parse dates from JSON
        const parsedIncidents = data.data.incidents.map(incident => ({
          ...incident,
          activePeriodStart: incident.activePeriodStart 
            ? new Date(incident.activePeriodStart) 
            : null,
          activePeriodEnd: incident.activePeriodEnd 
            ? new Date(incident.activePeriodEnd) 
            : null,
        }));
        
        setAllIncidents(parsedIncidents);
        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error(data.error || "Failed to fetch incidents");
      }
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch incidents");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchIncidents, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchIncidents]);

  // Split incidents into Active Now and Upcoming
  const { activeIncidents, upcomingIncidents } = useMemo(() => {
    const active: ServiceAlert[] = [];
    const upcoming: ServiceAlert[] = [];
    
    for (const incident of allIncidents) {
      if (isActiveNow(incident)) {
        active.push(incident);
      } else if (isUpcoming(incident) && UPCOMING_ALERT_TYPES.includes(incident.alertType)) {
        upcoming.push(incident);
      }
    }
    
    return { activeIncidents: active, upcomingIncidents: upcoming };
  }, [allIncidents]);

  // Get incidents for current tab
  const currentTabIncidents = activeTab === "active" ? activeIncidents : upcomingIncidents;
  
  // Apply user filters and sorting
  const filteredIncidents = useMemo(() => {
    const filtered = applyFilters(currentTabIncidents, filters);
    return sortIncidents(filtered, filters.sortBy);
  }, [currentTabIncidents, filters]);

  // Compute stats for current tab's filtered incidents
  const stats = useMemo(() => {
    return computeLocalStats(filteredIncidents);
  }, [filteredIncidents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-warning" />
            Incident Explorer
          </h1>
          <p className="mt-1 text-foreground/70">
            Browse service alerts and disruption history
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

      {/* Tabs */}
      <Tabs
        aria-label="Incident tabs"
        selectedKey={activeTab}
        onSelectionChange={(key) => handleTabChange(key as IncidentTab)}
        color="primary"
        variant="underlined"
        classNames={{
          tabList: "gap-6",
          cursor: "w-full bg-primary",
          tab: "max-w-fit px-0 h-12",
        }}
      >
        <Tab
          key="active"
          title={
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>Active Now</span>
              {activeIncidents.length > 0 && (
                <Chip size="sm" variant="flat" color="warning">
                  {activeIncidents.length}
                </Chip>
              )}
            </div>
          }
        />
        <Tab
          key="upcoming"
          title={
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Upcoming</span>
              {upcomingIncidents.length > 0 && (
                <Chip 
                  size="sm" 
                  variant="flat" 
                  classNames={{
                    base: "bg-sky-100 dark:bg-sky-900/40",
                    content: "text-sky-700 dark:text-sky-400"
                  }}
                >
                  {upcomingIncidents.length}
                </Chip>
              )}
            </div>
          }
        />
      </Tabs>

      {/* Stats Cards */}
      <IncidentStats stats={stats} isLoading={isLoading && allIncidents.length === 0} activeTab={activeTab} />

      {/* Filters Bar */}
      <Card>
        <CardBody className="py-4">
          <IncidentFilters
            filters={filters}
            onFiltersChange={setFilters}
            onRefresh={fetchIncidents}
            isLoading={isLoading}
            activeTab={activeTab}
          />
        </CardBody>
      </Card>

      {/* Status Bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {lastUpdated && (
          <div className="flex items-center gap-1.5 text-foreground/60">
            <Clock className="h-4 w-4" />
            <span>
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </span>
          </div>
        )}
        
        {!isLoading && activeTab === "active" && (
          <Chip size="sm" variant="flat" color={filteredIncidents.length > 0 ? "warning" : "success"}>
            {filteredIncidents.length} active incident{filteredIncidents.length !== 1 ? "s" : ""}
          </Chip>
        )}
        {!isLoading && activeTab === "upcoming" && (
          <Chip 
            size="sm" 
            variant="flat" 
            classNames={{
              base: filteredIncidents.length > 0 ? "bg-sky-100 dark:bg-sky-900/40" : undefined,
              content: filteredIncidents.length > 0 ? "text-sky-700 dark:text-sky-400" : undefined
            }}
            color={filteredIncidents.length === 0 ? "success" : undefined}
          >
            {filteredIncidents.length} upcoming incident{filteredIncidents.length !== 1 ? "s" : ""}
          </Chip>
        )}
      </div>

      {/* Incidents Timeline */}
      <IncidentTimeline
        incidents={filteredIncidents}
        isLoading={isLoading && allIncidents.length === 0}
        error={error}
        emptyMessage={
          activeTab === "active"
            ? "No active service incidents right now. Good service!"
            : "No upcoming planned work or service changes scheduled."
        }
      />
    </div>
  );
}
