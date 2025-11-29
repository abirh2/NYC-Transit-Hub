"use client";

import { Card, CardBody, CardHeader, Select, SelectItem } from "@heroui/react";
import { LineChart as LineChartIcon } from "lucide-react";
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
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <LineChartIcon className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Incident Trend</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div className="h-64 animate-pulse rounded bg-default-100" />
        </CardBody>
      </Card>
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
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between w-full flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <LineChartIcon className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Incident Trend</h3>
          </div>
          <Select
            size="sm"
            selectedKeys={[selectedMetric]}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as typeof selectedMetric;
              if (selected) onMetricChange(selected);
            }}
            className="w-40"
            aria-label="Select metric"
          >
            {METRIC_OPTIONS.map((option) => (
              <SelectItem key={option.key}>{option.label}</SelectItem>
            ))}
          </Select>
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        {!hasData ? (
          <div className="h-64 flex items-center justify-center text-foreground/50">
            <p className="text-center">
              No trend data available yet.
              <br />
              <span className="text-sm">Check back after data accumulates over a few days.</span>
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#525252" strokeOpacity={0.3} />
              <XAxis
                dataKey="dateShort"
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
                formatter={(value: number) => [value, METRIC_OPTIONS.find(o => o.key === selectedMetric)?.label]}
                labelFormatter={(label, payload) => {
                  if (payload?.[0]?.payload?.dateLabel) {
                    return payload[0].payload.dateLabel;
                  }
                  return label;
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
        )}
      </CardBody>
    </Card>
  );
}

