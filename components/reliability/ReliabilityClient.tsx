"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardBody, Switch, Chip, Alert, Tabs, Tab } from "@heroui/react";
import { TrendingUp, Clock, Wifi, WifiOff, AlertTriangle, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SubwayBullet } from "@/components/ui";
import { ReliabilitySummaryCards } from "./ReliabilitySummaryCards";
import { LinePerformanceCard } from "./LinePerformanceCard";
import { ReliabilityChart } from "./ReliabilityChart";
import { TimeOfDayChart } from "./TimeOfDayChart";
import type { ReliabilityResponse } from "@/types/api";

const REFRESH_INTERVAL = 60; // seconds

type TimePeriod = "1" | "7" | "30";

interface ReliabilityApiResponse {
  success: boolean;
  data: ReliabilityResponse;
  error?: string;
}

export function ReliabilityClient() {
  const [data, setData] = useState<ReliabilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedLine, setSelectedLine] = useState<string | undefined>(undefined);
  const [chartMetric, setChartMetric] = useState<"totalIncidents" | "delayCount" | "severeCount">("totalIncidents");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("30");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ days: timePeriod });
      if (selectedLine) params.set("routeId", selectedLine);
      
      const response = await fetch(`/api/reliability?${params}`);
      const result: ReliabilityApiResponse = await response.json();

      if (result.success && result.data) {
        setData(result.data);
        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error(result.error || "Failed to fetch reliability data");
      }
    } catch (err) {
      console.error("Failed to fetch reliability data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  }, [selectedLine, timePeriod]);

  // Initial fetch and refetch when filter changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Filter daily trend data when a line is selected
  const filteredDailyTrend = useMemo(() => {
    if (!data) return [];
    return data.dailyTrend;
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-primary" />
            Line Reliability
          </h1>
          <p className="mt-1 text-foreground/70">
            Track service performance and incident patterns
          </p>
        </div>

        {/* Auto-refresh Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              size="sm"
              isSelected={autoRefresh}
              onValueChange={setAutoRefresh}
            />
            <span className="text-sm text-foreground/70">Auto-refresh</span>
            {autoRefresh ? (
              <Wifi className="h-4 w-4 text-success" />
            ) : (
              <WifiOff className="h-4 w-4 text-foreground/30" />
            )}
          </div>
        </div>
      </div>

      {/* Time Period Selector */}
      <Tabs
        aria-label="Time period"
        selectedKey={timePeriod}
        onSelectionChange={(key) => setTimePeriod(key as TimePeriod)}
        color="primary"
        variant="solid"
        size="sm"
      >
        <Tab key="1" title="Today" />
        <Tab key="7" title="7 Days" />
        <Tab key="30" title="30 Days" />
      </Tabs>

      {/* Historical data building alert */}
      {data && !data.hasHistoricalData && (
        <Alert
          color="primary"
          variant="flat"
          startContent={<Info className="h-5 w-5" />}
        >
          <div className="flex flex-col">
            <span className="font-medium">Historical data is building</span>
            <span className="text-sm opacity-80">
              Showing current live alerts. Full analytics will appear as data accumulates over the next few days.
            </span>
          </div>
        </Alert>
      )}

      {/* Live alerts fallback display */}
      {data?.liveAlerts && (
        <Card>
          <CardBody className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <h3 className="font-semibold">Current Live Alerts</h3>
              <Chip size="sm" variant="flat" color="warning">
                {data.liveAlerts.total} active
              </Chip>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.liveAlerts.byLine.slice(0, 10).map(({ line, count }) => (
                <div key={line} className="flex items-center gap-1.5 bg-default-100 rounded-lg px-2 py-1">
                  <SubwayBullet line={line} size="sm" />
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
              {data.liveAlerts.byLine.length === 0 && (
                <span className="text-sm text-success">No active alerts - good service!</span>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Summary Cards */}
      <ReliabilitySummaryCards
        totalIncidents={data?.totalIncidents ?? 0}
        periodDays={data?.periodDays ?? 30}
        byLine={data?.byLine ?? []}
        hasHistoricalData={data?.hasHistoricalData ?? false}
        isLoading={isLoading && !data}
      />

      {/* Selected line filter indicator */}
      {selectedLine && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground/60">Filtered by:</span>
          <SubwayBullet line={selectedLine} size="sm" />
          <button
            onClick={() => setSelectedLine(undefined)}
            className="text-sm text-primary hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Status Bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {lastUpdated && (
          <div className="flex items-center gap-1.5 text-foreground/60">
            <Clock className="h-4 w-4" />
            <span>
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </span>
          </div>
        )}
        {data?.dataStartDate && (
          <Chip size="sm" variant="flat">
            Data since {new Date(data.dataStartDate).toLocaleDateString()}
          </Chip>
        )}
        {error && (
          <Chip size="sm" variant="flat" color="danger">
            {error}
          </Chip>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Line Performance */}
        <LinePerformanceCard
          lines={data?.byLine ?? []}
          isLoading={isLoading && !data}
          selectedLine={selectedLine}
          onSelectLine={setSelectedLine}
        />

        {/* Time of Day Chart */}
        <TimeOfDayChart
          data={data?.byTimeOfDay ?? []}
          isLoading={isLoading && !data}
        />
      </div>

      {/* Trend Chart - Full Width */}
      <ReliabilityChart
        data={filteredDailyTrend}
        isLoading={isLoading && !data}
        selectedMetric={chartMetric}
        onMetricChange={setChartMetric}
      />

      {/* Detailed Line Stats Table */}
      {data?.byLine && data.byLine.length > 0 && (
        <Card>
          <CardBody>
            <h3 className="font-semibold mb-4">Detailed Line Statistics</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-divider">
                    <th className="text-left py-2 px-2">Line</th>
                    <th className="text-right py-2 px-2">Score</th>
                    <th className="text-right py-2 px-2">Total</th>
                    <th className="text-right py-2 px-2">Delays</th>
                    <th className="text-right py-2 px-2">Severe</th>
                    <th className="text-right py-2 px-2">Avg/Day</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byLine.map((line) => (
                    <tr 
                      key={line.routeId} 
                      className="border-b border-divider/50 hover:bg-default-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedLine(selectedLine === line.routeId ? undefined : line.routeId)}
                    >
                      <td className="py-2 px-2">
                        <SubwayBullet line={line.routeId} size="sm" />
                      </td>
                      <td className={`text-right py-2 px-2 font-semibold ${
                        line.reliabilityScore >= 80 ? "text-success" :
                        line.reliabilityScore >= 60 ? "text-warning" : "text-danger"
                      }`}>
                        {line.reliabilityScore}
                      </td>
                      <td className="text-right py-2 px-2">{line.totalIncidents}</td>
                      <td className="text-right py-2 px-2">{line.delayCount}</td>
                      <td className="text-right py-2 px-2 text-danger">{line.severeCount}</td>
                      <td className="text-right py-2 px-2">{line.avgIncidentsPerDay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

