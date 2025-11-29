"use client";

import { useEffect, useState, ReactNode } from "react";
import { Card, CardBody, CardHeader, Chip, Spinner } from "@heroui/react";
import { AlertCircle, ArrowRight, AlertTriangle, Info } from "lucide-react";
import Link from "next/link";
import { SubwayBullet } from "@/components/ui";
import type { ServiceAlert, AlertSeverity } from "@/types/mta";

// Valid train line identifiers for parsing [X] references
const TRAIN_LINES = new Set([
  "1", "2", "3", "4", "5", "6", "7",
  "A", "C", "E", "B", "D", "F", "M",
  "G", "J", "Z", "L", "N", "Q", "R", "W", "S", "SI", "SIR"
]);

/**
 * Parse text and replace [X] train references with SubwayBullet icons
 */
function parseTrainReferences(text: string): ReactNode[] {
  const regex = /\[([A-Z0-9]+)\]/gi;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const line = match[1].toUpperCase();
    if (TRAIN_LINES.has(line)) {
      parts.push(
        <span key={`${match.index}-${line}`} className="inline-flex align-middle mx-0.5">
          <SubwayBullet line={line} size="sm" />
        </span>
      );
    } else {
      parts.push(match[0]);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

interface AlertsApiResponse {
  success: boolean;
  data: {
    alerts: ServiceAlert[];
    totalCount: number;
    lastUpdated: string;
  };
  error?: string;
}

export function AlertsCard() {
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const response = await fetch("/api/alerts?limit=3");
        const data: AlertsApiResponse = await response.json();
        
        if (data.success) {
          setAlerts(data.data.alerts);
          setError(null);
        } else {
          setError(data.error ?? "Failed to fetch alerts");
        }
      } catch (err) {
        setError("Failed to connect to alerts service");
        console.error("Error fetching alerts:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAlerts();
    
    // Refresh alerts every 60 seconds
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case "SEVERE":
        return "danger";
      case "WARNING":
        return "warning";
      default:
        return "default";
    }
  };

  const getSeverityLabel = (severity: AlertSeverity) => {
    switch (severity) {
      case "SEVERE":
        return "Major";
      case "WARNING":
        return "Delays";
      default:
        return "Info";
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case "SEVERE":
        return <AlertTriangle className="h-3 w-3" />;
      case "WARNING":
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  // Count severe alerts
  const severeCount = alerts.filter(a => a.severity === "SEVERE").length;

  return (
    <Card className="h-full">
      <CardHeader className="flex justify-between items-start pb-2">
        <div className="flex gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            severeCount > 0 ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
          }`}>
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold">Service Alerts</p>
            <p className="text-sm text-foreground/50">
              {loading ? "Loading..." : 
               error ? "Error loading" :
               alerts.length === 0 ? "No active alerts" :
               `${alerts.length} active alert${alerts.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <Link
          href="/incidents"
          className="text-sm text-primary flex items-center gap-1 hover:underline"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardBody className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="p-4 rounded-lg bg-danger/10 text-danger text-sm">
            {error}
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-4 rounded-lg bg-success/10 text-success text-center">
            <p className="font-medium">Good Service</p>
            <p className="text-sm opacity-80">No alerts at this time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg ${
                  alert.severity === "SEVERE" 
                    ? "bg-danger/10 border border-danger/20" 
                    : "bg-default-100"
                }`}
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {alert.affectedRoutes.slice(0, 5).map((line) => (
                    <SubwayBullet key={line} line={line} size="sm" />
                  ))}
                  {alert.affectedRoutes.length > 5 && (
                    <span className="text-xs text-foreground/50">
                      +{alert.affectedRoutes.length - 5} more
                    </span>
                  )}
                  <Chip
                    size="sm"
                    color={getSeverityColor(alert.severity)}
                    variant="flat"
                    startContent={getSeverityIcon(alert.severity)}
                  >
                    {getSeverityLabel(alert.severity)}
                  </Chip>
                </div>
                <div className="text-sm text-foreground/80 line-clamp-2">
                  {parseTrainReferences(alert.headerText)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
