"use client";

import { Card, CardBody, Chip, Tooltip } from "@heroui/react";
import { AlertTriangle, AlertCircle, Info, TrendingUp, HelpCircle } from "lucide-react";
import { SubwayBullet } from "@/components/ui";
import type { IncidentStats as IncidentStatsType } from "@/types/api";
import type { IncidentTab } from "./IncidentFilters";

interface IncidentStatsProps {
  stats: IncidentStatsType | null;
  isLoading?: boolean;
  activeTab?: IncidentTab;
}

// Format alert type for display
function formatAlertType(type: string): string {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Get color for alert type (using colors with good dark mode contrast)
function getTypeColor(type: string): "default" | "primary" | "secondary" | "success" | "warning" | "danger" {
  switch (type) {
    case "DELAY":
      return "warning";
    case "STATION_CLOSURE":
    case "SHUTTLE_BUS":
      return "danger";
    case "PLANNED_WORK":
      return "success"; // Changed from primary for better dark mode contrast
    case "SERVICE_CHANGE":
    case "DETOUR":
      return "secondary";
    case "REDUCED_SERVICE":
      return "warning";
    default:
      return "default";
  }
}

export function IncidentStats({ stats, isLoading, activeTab = "active" }: IncidentStatsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardBody className="py-4">
              <div className="h-16 animate-pulse rounded bg-default-100" />
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  // Dynamic label based on active tab
  const countLabel = activeTab === "active" ? "Active Incidents" : "Scheduled Changes";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Incidents */}
      <Card>
        <CardBody className="py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
              stats.bySeverity.severe > 0 ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
            }`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-foreground/60">{countLabel}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Severity Breakdown */}
      <Card>
        <CardBody className="py-4">
          <div className="flex items-center gap-1.5 mb-2">
            <p className="text-sm font-medium text-foreground/60">By Severity</p>
            <Tooltip 
              content={
                <div className="px-1 py-2 max-w-xs">
                  <p className="text-sm font-semibold mb-2">Severity Levels</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-danger mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-danger">Major</span>
                        <span className="text-foreground/70"> - Significant service disruptions, closures, or suspensions</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-warning">Delays</span>
                        <span className="text-foreground/70"> - Trains running slower than normal schedule</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Info className="h-3.5 w-3.5 text-default-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">Info</span>
                        <span className="text-foreground/70"> - Service changes, advisories, or general notices</span>
                      </div>
                    </div>
                  </div>
                </div>
              }
              placement="bottom"
              showArrow
            >
              <button className="text-foreground/40 hover:text-foreground/60 transition-colors">
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-danger" />
              <span className="font-semibold text-foreground">{stats.bySeverity.severe}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-warning" />
              <span className="font-semibold text-foreground">{stats.bySeverity.warning}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Info className="h-4 w-4 text-default-400" />
              <span className="font-semibold text-foreground">{stats.bySeverity.info}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Most Affected Lines */}
      <Card>
        <CardBody className="py-4">
          <p className="text-sm font-medium text-foreground/60 mb-2">Most Affected</p>
          <div className="flex items-center gap-2 flex-wrap">
            {stats.byLine.slice(0, 5).map(({ line, count }) => (
              <div key={line} className="flex items-center gap-1">
                <SubwayBullet line={line} size="sm" />
                <span className="text-xs font-medium text-foreground/70">{count}</span>
              </div>
            ))}
            {stats.byLine.length === 0 && (
              <span className="text-sm text-foreground/50">No data</span>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Top Incident Types */}
      <Card>
        <CardBody className="py-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-foreground/60" />
            <p className="text-sm font-medium text-foreground/60">Top Types</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {stats.byType.slice(0, 3).map(({ type, count }) => (
              <Chip
                key={type}
                size="sm"
                variant="flat"
                color={getTypeColor(type)}
              >
                {formatAlertType(type)} ({count})
              </Chip>
            ))}
            {stats.byType.length === 0 && (
              <span className="text-sm text-foreground/50">No data</span>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

