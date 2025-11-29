"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { Clock } from "lucide-react";
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
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Time of Day Analysis</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div className="h-48 animate-pulse rounded bg-default-100" />
        </CardBody>
      </Card>
    );
  }

  const hasData = data.some((d) => d.totalIncidents > 0);

  // Chart data with colors
  const chartData = data.map((d) => ({
    ...d,
    fill: PERIOD_COLORS[d.period],
  }));

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Time of Day Analysis</h3>
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        {!hasData ? (
          <div className="h-48 flex items-center justify-center text-foreground/50">
            <p className="text-center">
              No time-of-day data available yet.
              <br />
              <span className="text-sm">Patterns will emerge as incidents are tracked.</span>
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#525252" strokeOpacity={0.3} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  tickLine={false}
                  axisLine={{ stroke: "#525252" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  tickLine={false}
                  axisLine={{ stroke: "#525252" }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#27272a",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                    boxShadow: "0 4px 14px 0 rgba(0,0,0,0.3)",
                    color: "#fafafa",
                  }}
                  labelStyle={{ color: "#fafafa", fontWeight: 600 }}
                  formatter={(value: number, _name: string, props) => {
                    const payload = props.payload as TimeOfDayBreakdown | undefined;
                    return [`${value} incidents`, payload?.hours ?? ""];
                  }}
                />
                <Bar dataKey="totalIncidents" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            
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
      </CardBody>
    </Card>
  );
}

