"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader, Spinner } from "@heroui/react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { IncidentStats } from "@/types/api";

interface IncidentsApiResponse {
  success: boolean;
  data: {
    stats: IncidentStats;
    lastUpdated: string;
  };
  error?: string;
}

// Format alert type for display
function formatAlertType(type: string): string {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Get color class for alert type
function getTypeColorClass(type: string): string {
  switch (type) {
    case "DELAY":
      return "text-warning";
    case "STATION_CLOSURE":
    case "SHUTTLE_BUS":
      return "text-danger";
    case "PLANNED_WORK":
      return "text-primary";
    case "SERVICE_CHANGE":
    case "DETOUR":
      return "text-secondary";
    case "REDUCED_SERVICE":
      return "text-warning";
    default:
      return "text-foreground/70";
  }
}

export function IncidentsCard() {
  const [stats, setStats] = useState<IncidentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIncidents() {
      try {
        // Use status=active to get only currently active incidents (not upcoming planned work)
        const response = await fetch("/api/incidents?status=active");
        const data: IncidentsApiResponse = await response.json();

        if (data.success && data.data) {
          setStats(data.data.stats);
          setError(null);
        } else {
          setError(data.error ?? "Failed to fetch incidents");
        }
      } catch (err) {
        setError("Failed to connect to incidents service");
        console.error("Error fetching incidents:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchIncidents();

    // Refresh every 60 seconds
    const interval = setInterval(fetchIncidents, 60000);
    return () => clearInterval(interval);
  }, []);

  // Get top 3 incident types for display
  const topTypes = stats?.byType.slice(0, 3) ?? [];

  return (
    <Link href="/incidents" className="block h-full w-full">
      <Card isPressable className="h-full w-full flex flex-col hover:scale-[1.02] transition-transform">
        <CardHeader className="flex justify-between items-start pb-2">
          <div className="flex gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              stats && stats.bySeverity.severe > 0 
                ? "bg-danger/10 text-danger" 
                : "bg-warning/10 text-warning"
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold">Incidents</p>
              <p className="text-sm text-foreground/50">
                {loading ? "Loading..." : error ? "Error" : "Active now"}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-foreground/30" />
        </CardHeader>
        <CardBody className="pt-0 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Spinner size="md" />
            </div>
          ) : error ? (
            <div className="py-4 text-center">
              <p className="text-sm text-danger">{error}</p>
            </div>
          ) : stats ? (
            <>
              <div className="text-center py-2">
                <p className={`text-4xl font-bold ${
                  stats.total > 0 ? "text-foreground" : "text-success"
                }`}>
                  {stats.total}
                </p>
                <p className="text-sm text-foreground/50">
                  {stats.total === 0 ? "no incidents" : "active incidents"}
                </p>
              </div>
              {topTypes.length > 0 && (
                <div className="space-y-2 mt-2">
                  {topTypes.map((item) => (
                    <div key={item.type} className="flex justify-between text-sm">
                      <span className="text-foreground/70">
                        {formatAlertType(item.type)}
                      </span>
                      <span className={`font-medium ${getTypeColorClass(item.type)}`}>
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {stats.total === 0 && (
                <div className="text-center">
                  <p className="text-sm text-success">Good Service</p>
                </div>
              )}
            </>
          ) : null}
        </CardBody>
      </Card>
    </Link>
  );
}
