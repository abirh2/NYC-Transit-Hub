"use client";

import { Card, CardBody } from "@heroui/react";
import { Wifi } from "lucide-react";

export function SystemStatusCard() {
  // Mock status - will be real later
  const status = {
    connected: true,
    lastUpdate: "30 seconds ago",
    feedStatus: "All feeds operational",
  };

  return (
    <Card>
      <CardBody className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wifi className="h-4 w-4 text-foreground/50" />
            <div>
              <p className="text-sm text-foreground/50">System Status</p>
              <p className="text-sm font-medium text-foreground">
                {status.feedStatus}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground/50">
              Updated {status.lastUpdate}
            </span>
            <div
              className={`h-2 w-2 rounded-full ${
                status.connected ? "bg-success animate-pulse" : "bg-danger"
              }`}
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

