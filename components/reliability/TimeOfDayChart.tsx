"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { TimeOfDayBreakdown } from "@/types/api";
import { ChartSurface, ChartTooltip, EmptyChartState } from "@/components/analytics";

interface TimeOfDayChartProps {
  data: TimeOfDayBreakdown[];
  isLoading?: boolean;
}

// Colors for different time periods - warm colors for rush, cool for off-peak
const PERIOD_COLORS: Record<TimeOfDayBreakdown["period"], string> = {
  amRush: "#ef4444",   // red - high stress
  midday: "#22c55e",   // green - calm
  pmRush: "#f59e0b",   // amber - high stress
  evening: "#3b82f6",  // blue - winding down
  night: "#6366f1",    // indigo - quiet
};

export function TimeOfDayChart({ data, isLoading }: TimeOfDayChartProps) {
  if (isLoading) {
    return (
      <ChartSurface
        title="When incidents happen"
        description="Recorded incidents grouped by time of day."
      >
        <div className="h-48 animate-pulse rounded-md bg-surface-hover" />
      </ChartSurface>
    );
  }

  const hasData = data.some((d) => d.totalIncidents > 0);

  // Chart data with colors
  const chartData = data.map((d) => ({
    ...d,
    fill: PERIOD_COLORS[d.period],
  }));

  return (
    <ChartSurface
      title="When incidents happen"
      description="Recorded incidents grouped by time of day."
    >
      {!hasData ? (
        <EmptyChartState
          title="No time-of-day data available yet."
          description="Patterns will emerge as incidents are tracked."
        />
      ) : (
          <>
            <div className="min-w-0 text-foreground/50">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.18} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  tickLine={false}
                  axisLine={{ stroke: "currentColor", strokeOpacity: 0.3 }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  tickLine={false}
                  axisLine={{ stroke: "currentColor", strokeOpacity: 0.3 }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const point = payload[0].payload as (typeof chartData)[number];
                    return (
                      <ChartTooltip
                        label={point.label}
                        items={[{
                          label: point.hours,
                          value: point.totalIncidents,
                          unit: " incidents",
                          color: point.fill,
                        }]}
                      />
                    );
                  }}
                />
                <Bar dataKey="totalIncidents" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
            
            {/* Insight text */}
            <div className="mt-4 text-center">
              {(() => {
                const rushTotal = (data.find(d => d.period === "amRush")?.totalIncidents || 0) +
                                  (data.find(d => d.period === "pmRush")?.totalIncidents || 0);
                const offPeakTotal = (data.find(d => d.period === "midday")?.totalIncidents || 0) +
                                     (data.find(d => d.period === "evening")?.totalIncidents || 0) +
                                     (data.find(d => d.period === "night")?.totalIncidents || 0);
                const total = rushTotal + offPeakTotal;
                if (total === 0) return null;
                
                const rushPercent = Math.round((rushTotal / total) * 100);
                
                if (rushPercent >= 50) {
                  return (
                    <p className="text-sm text-warning">
                      <span className="font-medium">{rushPercent}%</span> of incidents occur during rush hours
                    </p>
                  );
                } else {
                  return (
                    <p className="text-sm text-success">
                      Off-peak hours see more incidents than rush hours
                    </p>
                  );
                }
              })()}
            </div>
          </>
      )}
    </ChartSurface>
  );
}
