"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, Progress, Button } from "@heroui/react";
import { BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { SubwayBullet } from "@/components/ui";
import type { LineReliabilitySummary } from "@/types/api";

const COLLAPSED_COUNT = 5;

interface LinePerformanceCardProps {
  lines: LineReliabilitySummary[];
  isLoading?: boolean;
  selectedLine?: string;
  onSelectLine?: (routeId: string | undefined) => void;
}

function getScoreColor(score: number): "success" | "warning" | "danger" {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

export function LinePerformanceCard({
  lines,
  isLoading,
  selectedLine,
  onSelectLine,
}: LinePerformanceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Line Performance</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-default-100" />
            ))}
          </div>
        </CardBody>
      </Card>
    );
  }

  if (lines.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Line Performance</h3>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-foreground/50 text-center py-8">
            No performance data available yet.
            <br />
            <span className="text-sm">Data will accumulate as alerts are tracked.</span>
          </p>
        </CardBody>
      </Card>
    );
  }

  // Sort by reliability score (highest first for display)
  const sortedLines = [...lines].sort((a, b) => b.reliabilityScore - a.reliabilityScore);
  const displayedLines = isExpanded ? sortedLines : sortedLines.slice(0, COLLAPSED_COUNT);
  const hiddenCount = sortedLines.length - COLLAPSED_COUNT;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Line Performance</h3>
          </div>
          {selectedLine && onSelectLine && (
            <button
              onClick={() => onSelectLine(undefined)}
              className="text-sm text-primary hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="space-y-3">
          {displayedLines.map((line) => {
            const isSelected = selectedLine === line.routeId;
            return (
              <button
                key={line.routeId}
                onClick={() => onSelectLine?.(isSelected ? undefined : line.routeId)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  isSelected 
                    ? "bg-primary/10 ring-1 ring-primary" 
                    : "hover:bg-default-100"
                }`}
              >
                <SubwayBullet line={line.routeId} size="md" />
                <div className="flex-1 min-w-0">
                  <Progress
                    value={line.reliabilityScore}
                    color={getScoreColor(line.reliabilityScore)}
                    size="sm"
                    classNames={{
                      track: "bg-default-200",
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-sm font-semibold ${
                    line.reliabilityScore >= 80 ? "text-success" :
                    line.reliabilityScore >= 60 ? "text-warning" : "text-danger"
                  }`}>
                    {line.reliabilityScore}
                  </span>
                  <span className="text-xs text-foreground/50 w-16 text-right">
                    {line.totalIncidents} inc.
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Expand/Collapse Button */}
        {hiddenCount > 0 && (
          <Button
            variant="light"
            size="sm"
            onPress={() => setIsExpanded(!isExpanded)}
            className="w-full mt-3"
            startContent={isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          >
            {isExpanded ? "Show less" : `Show ${hiddenCount} more lines`}
          </Button>
        )}
        
        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-divider flex items-center justify-center gap-4 text-xs text-foreground/50">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-success" /> 80+
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-warning" /> 60-79
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-danger" /> &lt;60
          </span>
        </div>
      </CardBody>
    </Card>
  );
}

