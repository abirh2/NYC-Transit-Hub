"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardBody, Switch, Chip, Tabs, Tab } from "@heroui/react";
import { Wifi, WifiOff, Calendar, Zap, History } from "lucide-react";
import { 
  IncidentStats, 
  IncidentFilters, 
  IncidentTimeline,
  type IncidentFiltersState,
  type IncidentTab,
  type SortOption,
} from "@/components/incidents";
import type { ServiceAlert, AlertSeverity } from "@/types/mta";
import type { IncidentStats as IncidentStatsType } from "@/types/api";
import { DataFreshness } from "@/components/ui";
import { useVisiblePolling } from "@/lib/hooks";
import { partitionIncidentsByStatus } from "@/lib/incidents/status";

const REFRESH_INTERVAL = 30; // seconds

interface IncidentsApiResponse {
  success: boolean;
  data: {
    incidents: ServiceAlert[];
    stats: IncidentStatsType;
    lastUpdated: string;
  };
  error?: string;
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
      sortBy: tab === "upcoming" ? "soonest" : tab === "recent" ? "recent" : "severity",
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

  const { isOnline } = useVisiblePolling(
    fetchIncidents,
    REFRESH_INTERVAL * 1000,
    autoRefresh,
  );

  // Split incidents into Active Now and Upcoming
  const incidentsByStatus = useMemo(
    () => partitionIncidentsByStatus(allIncidents),
    [allIncidents],
  );

  // Get incidents for current tab
  const currentTabIncidents = activeTab === "recent"
    ? incidentsByStatus.resolved
    : incidentsByStatus[activeTab];
  
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
      {/* Auto-refresh Toggle */}
      <div className="flex items-center justify-end gap-4">
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
              {incidentsByStatus.active.length > 0 && (
                <Chip size="sm" variant="flat" color="warning">
                  {incidentsByStatus.active.length}
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
              {incidentsByStatus.upcoming.length > 0 && (
                <Chip 
                  size="sm" 
                  variant="flat" 
                  classNames={{
                    base: "bg-sky-100 dark:bg-sky-900/40",
                    content: "text-sky-700 dark:text-sky-400"
                  }}
                >
                  {incidentsByStatus.upcoming.length}
                </Chip>
              )}
            </div>
          }
        />
        <Tab
          key="recent"
          title={
            <div className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span>Recent</span>
              {incidentsByStatus.resolved.length > 0 && (
                <Chip size="sm" variant="flat">
                  {incidentsByStatus.resolved.length}
                </Chip>
              )}
            </div>
          }
        />
      </Tabs>

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
        <DataFreshness updatedAt={lastUpdated} isOffline={!isOnline} />
        
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
        {!isLoading && activeTab === "recent" && (
          <Chip size="sm" variant="flat">
            {filteredIncidents.length} recent incident{filteredIncidents.length !== 1 ? "s" : ""}
          </Chip>
        )}
      </div>

      {/* Incidents Timeline */}
      <IncidentTimeline
        incidents={filteredIncidents}
        isLoading={isLoading && allIncidents.length === 0}
        error={allIncidents.length === 0 ? error : null}
        emptyMessage={
          activeTab === "active"
            ? "No active service changes match these filters."
            : activeTab === "upcoming"
              ? "No upcoming service changes match these filters."
              : "No recently resolved service changes match these filters."
        }
      />

      {/* Secondary trend context follows the rider-impact list. */}
      <IncidentStats stats={stats} isLoading={isLoading && allIncidents.length === 0} activeTab={activeTab} />
    </div>
  );
}
