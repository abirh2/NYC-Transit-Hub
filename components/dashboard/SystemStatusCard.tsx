"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/react";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SystemStatusResponse } from "@/types/api";

interface StatusApiResponse {
  success: boolean;
  data: SystemStatusResponse;
}

export function SystemStatusCard() {
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [lastFetch, setLastFetch] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch("/api/status");
        const data: StatusApiResponse = await response.json();
        
        if (data.success) {
          setStatus(data.data);
          setLastFetch(new Date());
          setError(null);
        } else {
          setError("Failed to fetch status");
        }
      } catch (err) {
        setError("Connection error");
        console.error("Error fetching status:", err);
      }
    }

    fetchStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusText = () => {
    if (error) return "Connection error";
    if (!status) return "Checking feeds...";
    
    switch (status.overallHealth) {
      case "healthy":
        return "All feeds operational";
      case "degraded":
        const unhealthy = status.feeds.filter(f => !f.isHealthy);
        return `${unhealthy.length} feed${unhealthy.length !== 1 ? "s" : ""} degraded`;
      case "down":
        return "Feeds unavailable";
      default:
        return "Unknown status";
    }
  };

  const getStatusIcon = () => {
    if (error || status?.overallHealth === "down") {
      return <WifiOff className="h-4 w-4 text-danger" />;
    }
    if (status?.overallHealth === "degraded") {
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    }
    return <Wifi className="h-4 w-4 text-foreground/50" />;
  };

  const getStatusColor = () => {
    if (error || status?.overallHealth === "down") return "bg-danger";
    if (status?.overallHealth === "degraded") return "bg-warning";
    return "bg-success animate-pulse";
  };

  const getUpdateText = () => {
    try {
      return `Updated ${formatDistanceToNow(lastFetch, { addSuffix: true })}`;
    } catch {
      return "Just now";
    }
  };

  return (
    <Card>
      <CardBody className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <p className="text-sm text-foreground/50">System Status</p>
              <p className="text-sm font-medium text-foreground">
                {getStatusText()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground/50">
              {getUpdateText()}
            </span>
            <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
