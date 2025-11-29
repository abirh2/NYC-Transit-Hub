"use client";

import { Card, CardBody, Tooltip } from "@heroui/react";
import { 
  MoveVertical, 
  Scaling, 
  Accessibility, 
  MapPin,
  HelpCircle 
} from "lucide-react";
import { SubwayBullet } from "@/components/ui";
import type { OutageStats as OutageStatsType } from "@/types/api";

interface OutageStatsProps {
  stats: OutageStatsType | null;
  isLoading?: boolean;
  isUpcoming?: boolean;
}

export function OutageStats({ stats, isLoading, isUpcoming = false }: OutageStatsProps) {
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

  const label = isUpcoming ? "Planned Outages" : "Current Outages";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Outages */}
      <Card>
        <CardBody className="py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
              stats.adaImpactingOutages > 0 ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
            }`}>
              <MoveVertical className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{stats.totalOutages}</p>
              <p className="text-sm text-foreground/60">{label}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Equipment Type Breakdown */}
      <Card>
        <CardBody className="py-4">
          <div className="flex items-center gap-1.5 mb-2">
            <p className="text-sm font-medium text-foreground/60">By Type</p>
            <Tooltip 
              content={
                <div className="px-1 py-2 max-w-xs">
                  <p className="text-sm font-semibold mb-2">Equipment Types</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start gap-2">
                      <MoveVertical className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-primary">Elevators</span>
                        <span className="text-foreground/70"> - Required for wheelchair accessibility</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Scaling className="h-3.5 w-3.5 text-secondary mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-secondary">Escalators</span>
                        <span className="text-foreground/70"> - Moving stairs for easier access</span>
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <MoveVertical className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">{stats.elevatorOutages}</span>
              <span className="text-xs text-foreground/60">elevators</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Scaling className="h-4 w-4 text-secondary" />
              <span className="font-semibold text-foreground">{stats.escalatorOutages}</span>
              <span className="text-xs text-foreground/60">escalators</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ADA Impact */}
      <Card>
        <CardBody className="py-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Accessibility className="h-4 w-4 text-foreground/60" />
            <p className="text-sm font-medium text-foreground/60">ADA Impact</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${
              stats.adaImpactingOutages > 0 ? "text-danger" : "text-success"
            }`}>
              {stats.adaImpactingOutages}
            </span>
            <span className="text-sm text-foreground/60">
              {stats.adaImpactingOutages === 1 ? "station" : "stations"} affected
            </span>
          </div>
          {stats.adaImpactingOutages > 0 && (
            <p className="text-xs text-foreground/50 mt-1">
              Stations may not be wheelchair accessible
            </p>
          )}
        </CardBody>
      </Card>

      {/* By Borough / Lines */}
      <Card>
        <CardBody className="py-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-foreground/60" />
            <p className="text-sm font-medium text-foreground/60">Most Affected Lines</p>
          </div>
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
    </div>
  );
}

