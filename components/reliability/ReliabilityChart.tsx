"use client";

import { Select, SelectItem } from "@heroui/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ChartSurface, ChartTooltip, EmptyChartState } from "@/components/analytics";

interface DailyDataPoint {
  date: string;
  totalIncidents: number;
  delayCount: number;
  severeCount: number;
}

interface ReliabilityChartProps {
  data: DailyDataPoint[];
  isLoading?: boolean;
  selectedMetric: "totalIncidents" | "delayCount" | "severeCount";
  onMetricChange: (metric: "totalIncidents" | "delayCount" | "severeCount") => void;
}

const METRIC_OPTIONS = [
  { key: "totalIncidents", label: "All Incidents" },
  { key: "delayCount", label: "Delays Only" },
  { key: "severeCount", label: "Severe Only" },
];

const METRIC_COLORS = {
  totalIncidents: "#f59e0b", // amber
  delayCount: "#3b82f6",    // blue
  severeCount: "#ef4444",   // red
};

export function ReliabilityChart({
  data,
  isLoading,
  selectedMetric,
  onMetricChange,
}: ReliabilityChartProps) {
  if (isLoading) {
    return (
      <ChartSurface
        title="How incidents changed"
        description="Daily recorded incidents in the selected period."
      >
        <div className="h-64 animate-pulse rounded-md bg-surface-hover" />
      </ChartSurface>
    );
  }

  // Format data for chart
  const chartData = data.map((d) => ({
    ...d,
    dateLabel: format(parseISO(d.date), "MMM d"),
    dateShort: format(parseISO(d.date), "M/d"),
  }));

  const hasData = chartData.length > 0;

  return (
    <ChartSurface
      title="How incidents changed"
      description="Daily recorded incidents in the selected period."
      action={
        <Select
            size="sm"
            selectedKeys={[selectedMetric]}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as typeof selectedMetric;
              if (selected) onMetricChange(selected);
            }}
            className="w-44"
            aria-label="Select metric"
          >
            {METRIC_OPTIONS.map((option) => (
              <SelectItem key={option.key}>{option.label}</SelectItem>
            ))}
          </Select>
      }
    >
      {!hasData ? (
        <EmptyChartState
          title="No trend data yet"
          description="Daily patterns will appear after historical records accumulate."
        />
      ) : (
        <div className="min-w-0 text-foreground/50">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.18} />
              <XAxis
                dataKey="dateShort"
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
                      label={point.dateLabel}
                      items={[{
                        label: METRIC_OPTIONS.find((option) => option.key === selectedMetric)?.label ?? "Incidents",
                        value: point[selectedMetric],
                        color: METRIC_COLORS[selectedMetric],
                      }]}
                    />
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey={selectedMetric}
                stroke={METRIC_COLORS[selectedMetric]}
                strokeWidth={2}
                dot={{ r: 3, fill: METRIC_COLORS[selectedMetric] }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartSurface>
  );
}
