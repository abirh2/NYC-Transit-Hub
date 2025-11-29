"use client";

import { Card, CardBody, Chip, Tooltip } from "@heroui/react";
import { AlertTriangle, TrendingUp, TrendingDown, Activity, HelpCircle, Info } from "lucide-react";
import { SubwayBullet } from "@/components/ui";
import type { LineReliabilitySummary } from "@/types/api";

interface ReliabilitySummaryCardsProps {
  totalIncidents: number;
  periodDays: number;
  byLine: LineReliabilitySummary[];
  hasHistoricalData: boolean;
  isLoading?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-danger";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 70) return "Fair";
  if (score >= 60) return "Poor";
  return "Very Poor";
}

export function ReliabilitySummaryCards({
  totalIncidents,
  periodDays,
  byLine,
  hasHistoricalData,
  isLoading,
}: ReliabilitySummaryCardsProps) {
  if (isLoading) {
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

  // Find best and worst lines
  const sortedByScore = [...byLine].sort((a, b) => b.reliabilityScore - a.reliabilityScore);
  const bestLine = sortedByScore[0];
  const worstLine = sortedByScore[sortedByScore.length - 1];

  // Calculate system-wide average reliability score
  const avgReliabilityScore = byLine.length > 0
    ? Math.round(byLine.reduce((sum, l) => sum + l.reliabilityScore, 0) / byLine.length)
    : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Incidents */}
      <Card>
        <CardBody className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{totalIncidents}</p>
              <div className="flex items-center gap-1">
                <p className="text-sm text-foreground/60">
                  {hasHistoricalData ? `Past ${periodDays} days` : "Current incidents"}
                </p>
                {!hasHistoricalData && (
                  <Tooltip content="Historical data is building. Showing current live incidents.">
                    <Info className="h-3.5 w-3.5 text-foreground/40" />
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* System Reliability Score */}
      <Card>
        <CardBody className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <p className={`text-3xl font-bold ${getScoreColor(avgReliabilityScore)}`}>
                  {avgReliabilityScore}
                </p>
                <span className="text-sm text-foreground/60">/100</span>
              </div>
              <div className="flex items-center gap-1">
                <p className="text-sm text-foreground/60">
                  System Score
                </p>
                <Tooltip 
                  content={
                    <div className="px-1 py-2 max-w-xs">
                      <p className="text-sm font-semibold mb-2">Reliability Score</p>
                      <p className="text-xs text-foreground/70">
                        Based on average incidents per line per day. 
                        Lower incidents = higher score. 
                        100 = no incidents, 0 = 5+ incidents/day.
                      </p>
                    </div>
                  }
                >
                  <HelpCircle className="h-3.5 w-3.5 text-foreground/40" />
                </Tooltip>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Best Performing Line */}
      <Card>
        <CardBody className="py-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <p className="text-sm font-medium text-foreground/60">Most Reliable</p>
          </div>
          {bestLine ? (
            <div className="flex items-center gap-3">
              <SubwayBullet line={bestLine.routeId} size="lg" />
              <div>
                <Chip size="sm" variant="flat" color="success">
                  {getScoreLabel(bestLine.reliabilityScore)}
                </Chip>
                <p className="text-xs text-foreground/50 mt-1">
                  {bestLine.totalIncidents} incident{bestLine.totalIncidents !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground/50">No data yet</p>
          )}
        </CardBody>
      </Card>

      {/* Worst Performing Line */}
      <Card>
        <CardBody className="py-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="h-4 w-4 text-danger" />
            <p className="text-sm font-medium text-foreground/60">Most Affected</p>
          </div>
          {worstLine && byLine.length > 1 ? (
            <div className="flex items-center gap-3">
              <SubwayBullet line={worstLine.routeId} size="lg" />
              <div>
                <Chip 
                  size="sm" 
                  variant="flat" 
                  color={worstLine.reliabilityScore < 60 ? "danger" : "warning"}
                >
                  {getScoreLabel(worstLine.reliabilityScore)}
                </Chip>
                <p className="text-xs text-foreground/50 mt-1">
                  {worstLine.totalIncidents} incident{worstLine.totalIncidents !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground/50">No data yet</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

