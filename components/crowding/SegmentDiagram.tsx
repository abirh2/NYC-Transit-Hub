"use client";

import { Card, Chip, Tooltip } from "@heroui/react";
import { SubwayBullet } from "@/components/ui/SubwayBullet";
import type { SegmentCrowding, SubwayLine, CrowdingLevel, Direction } from "@/types/mta";

interface SegmentDiagramProps {
  routeId: SubwayLine;
  segments: SegmentCrowding[];
  direction?: Direction | "all";
}

export function SegmentDiagram({ routeId, segments, direction = "all" }: SegmentDiagramProps) {
  // Filter segments by direction
  const filteredSegments = direction === "all" 
    ? segments
    : segments.filter(s => s.direction === direction);

  if (filteredSegments.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-foreground/50">No data available for this direction</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Direction Header */}
      <div className="flex items-center gap-3">
        <SubwayBullet line={routeId} size="lg" />
        <h3 className="text-lg font-semibold">
          {direction === "all" ? "All Directions" : direction === "N" ? "Northbound" : "Southbound"}
        </h3>
      </div>

      {/* Segment Visualizations */}
      <div className="space-y-4">
        {filteredSegments.map((segment) => (
          <SegmentBar key={`${segment.segmentId}-${segment.direction}`} segment={segment} />
        ))}
      </div>
    </div>
  );
}

interface SegmentBarProps {
  segment: SegmentCrowding;
}

function SegmentBar({ segment }: SegmentBarProps) {
  const levelColor = getLevelColor(segment.crowdingLevel);
  const levelText = segment.crowdingLevel;
  const scorePercent = Math.min(segment.crowdingScore, 100);

  return (
    <div className="space-y-2">
      {/* Segment Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{segment.segmentName}</span>
          <span className="text-xs text-foreground/50">
            {segment.direction === "N" ? "→ North" : "→ South"}
          </span>
        </div>
        <Chip size="sm" color={levelColor} variant="flat">
          {levelText}
        </Chip>
      </div>

      {/* Visual Bar */}
      <Tooltip
        content={
          <div className="p-2 space-y-1">
            <p className="text-xs font-medium">Score: {segment.crowdingScore}/100</p>
            <p className="text-xs">Headway: {(segment.factors.headway * 100).toFixed(0)}%</p>
            <p className="text-xs">Demand: {(segment.factors.demand * 100).toFixed(0)}%</p>
            <p className="text-xs">Delays: {(segment.factors.delay * 100).toFixed(0)}%</p>
            <p className="text-xs">Alerts: {(segment.factors.alerts * 100).toFixed(0)}%</p>
          </div>
        }
      >
        <div className="h-8 bg-default-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
          <div
            className={`h-full ${getLevelBgClass(segment.crowdingLevel)} transition-all`}
            style={{ width: `${scorePercent}%` }}
          />
        </div>
      </Tooltip>

      {/* Score */}
      <div className="flex justify-end">
        <span className="text-xs text-foreground/50">{segment.crowdingScore}/100</span>
      </div>
    </div>
  );
}

function getLevelColor(level: CrowdingLevel): "success" | "warning" | "danger" {
  if (level === "LOW") return "success";
  if (level === "MEDIUM") return "warning";
  return "danger";
}

function getLevelBgClass(level: CrowdingLevel): string {
  if (level === "LOW") return "bg-success";
  if (level === "MEDIUM") return "bg-warning";
  return "bg-danger";
}

