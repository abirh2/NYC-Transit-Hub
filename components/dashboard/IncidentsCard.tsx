"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

// Mock data
const mockIncidents = {
  total: 12,
  byType: [
    { type: "Delays", count: 5, color: "text-warning" },
    { type: "Planned Work", count: 4, color: "text-primary" },
    { type: "Service Changes", count: 3, color: "text-secondary" },
  ],
};

export function IncidentsCard() {
  return (
    <Link href="/incidents" className="block h-full w-full">
      <Card isPressable className="h-full w-full flex flex-col hover:scale-[1.02] transition-transform">
        <CardHeader className="flex justify-between items-start pb-2">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger/10 text-danger">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold">Incidents</p>
              <p className="text-sm text-foreground/50">Today</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-foreground/30" />
        </CardHeader>
        <CardBody className="pt-0 flex-1">
          <div className="text-center py-2">
            <p className="text-4xl font-bold text-foreground">
              {mockIncidents.total}
            </p>
            <p className="text-sm text-foreground/50">active incidents</p>
          </div>
          <div className="space-y-2 mt-2">
            {mockIncidents.byType.map((item) => (
              <div key={item.type} className="flex justify-between text-sm">
                <span className="text-foreground/70">{item.type}</span>
                <span className={`font-medium ${item.color}`}>{item.count}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}

