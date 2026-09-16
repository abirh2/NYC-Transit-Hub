"use client";

import type { ReactNode } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { StatusChip, type SemanticState } from "@/components/ui/StatusChip";

interface MetricCardProps {
  label: string;
  value: ReactNode; // rendered with tabular numerals
  unit?: string;
  state?: SemanticState; // optional status accent
  icon?: ReactNode;
  trend?: { direction: "up" | "down" | "flat"; label?: string };
}

const trendIcon: Record<
  NonNullable<MetricCardProps["trend"]>["direction"],
  ReactNode
> = {
  up: <TrendingUp className="h-4 w-4" aria-hidden="true" />,
  down: <TrendingDown className="h-4 w-4" aria-hidden="true" />,
  flat: <Minus className="h-4 w-4" aria-hidden="true" />,
};

export function MetricCard({
  label,
  value,
  unit,
  state,
  icon,
  trend,
}: MetricCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-foreground/60">
          {icon && (
            <span className="flex items-center text-foreground/50">{icon}</span>
          )}
          <p className="text-sm">{label}</p>
        </div>
        {state && <StatusChip state={state} label={state} size="sm" />}
      </div>

      <div className="flex items-baseline gap-1">
        <span className="tabular text-2xl font-semibold text-foreground">
          {value}
        </span>
        {unit && (
          <span className="text-sm text-foreground/60">{unit}</span>
        )}
      </div>

      {trend && (
        <div className="flex items-center gap-1 text-sm text-foreground/60">
          {trendIcon[trend.direction]}
          {trend.label && <span>{trend.label}</span>}
        </div>
      )}
    </div>
  );
}
