"use client";

import { Card, CardBody, CardHeader, Chip } from "@heroui/react";
import { AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { SubwayBullet } from "@/components/ui";

// Mock data for preview
const mockAlerts = [
  {
    id: 1,
    lines: ["A", "C", "E"],
    message: "Delays due to signal problems at 34th St-Penn Station",
    severity: "warning",
  },
  {
    id: 2,
    lines: ["F"],
    message: "Service restored. Expect residual delays.",
    severity: "info",
  },
];

export function AlertsCard() {
  return (
    <Card className="h-full">
      <CardHeader className="flex justify-between items-start pb-2">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold">Service Alerts</p>
            <p className="text-sm text-foreground/50">2 active alerts</p>
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
        <div className="space-y-3">
          {mockAlerts.map((alert) => (
            <div
              key={alert.id}
              className="p-3 rounded-lg bg-default-100"
            >
              <div className="flex items-center gap-2 mb-2">
                {alert.lines.map((line) => (
                  <SubwayBullet key={line} line={line} size="sm" />
                ))}
                <Chip
                  size="sm"
                  color={alert.severity === "warning" ? "warning" : "default"}
                  variant="flat"
                >
                  {alert.severity === "warning" ? "Delays" : "Info"}
                </Chip>
              </div>
              <p className="text-sm text-foreground/80">{alert.message}</p>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
