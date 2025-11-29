"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader, Skeleton } from "@heroui/react";
import { TrendingUp, ArrowRight, AlertCircle } from "lucide-react";
import Link from "next/link";
import { SubwayBullet } from "@/components/ui";
import type { ReliabilityResponse, LineReliabilitySummary } from "@/types/api";

function getScoreColor(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-danger";
}

function getProgressColor(score: number): string {
  if (score >= 80) return "bg-success";
  if (score >= 60) return "bg-warning";
  return "bg-danger";
}

interface ReliabilityApiResponse {
  success: boolean;
  data: ReliabilityResponse;
  error?: string;
}

export function ReliabilityCard() {
  const [data, setData] = useState<LineReliabilitySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasHistoricalData, setHasHistoricalData] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/reliability?days=7");
        const result: ReliabilityApiResponse = await response.json();

        if (result.success && result.data) {
          // Get top 4 lines sorted by incidents (most to least)
          const topLines = [...result.data.byLine]
            .sort((a, b) => b.reliabilityScore - a.reliabilityScore)
            .slice(0, 4);
          setData(topLines);
          setHasHistoricalData(result.data.hasHistoricalData);
          setError(null);
        } else {
          setError(result.error || "Failed to load");
        }
      } catch (err) {
        console.error("Error fetching reliability data:", err);
        setError("Failed to load");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link href="/reliability" className="block h-full w-full">
      <Card isPressable className="h-full w-full flex flex-col hover:scale-[1.02] transition-transform">
        <CardHeader className="flex justify-between items-start pb-2">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold">Reliability</p>
              <p className="text-sm text-foreground/50">
                {hasHistoricalData ? "Past 7 days" : "Building data..."}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-foreground/30" />
        </CardHeader>
        <CardBody className="pt-0 flex-1">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <Skeleton className="flex-1 h-2 rounded-full" />
                  <Skeleton className="w-10 h-4 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-foreground/50 gap-2">
              <AlertCircle className="h-6 w-6" />
              <p className="text-sm">{error}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-foreground/50 gap-2">
              <TrendingUp className="h-6 w-6" />
              <p className="text-sm text-center">
                No reliability data yet.
                <br />
                <span className="text-xs">Data building in progress.</span>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.map((item) => (
                <div key={item.routeId} className="flex items-center gap-3">
                  <SubwayBullet line={item.routeId} size="sm" />
                  <div className="flex-1 h-2 bg-default-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getProgressColor(item.reliabilityScore)}`}
                      style={{ width: `${item.reliabilityScore}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium w-10 text-right ${getScoreColor(item.reliabilityScore)}`}>
                    {item.reliabilityScore}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </Link>
  );
}
