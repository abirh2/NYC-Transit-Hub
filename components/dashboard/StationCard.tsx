"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { TrainFront, ArrowRight, Settings } from "lucide-react";
import Link from "next/link";
import { SubwayBullet } from "@/components/ui";

// Mock data for preview
const mockDepartures = [
  { line: "F", destination: "Coney Island", time: "3 min" },
  { line: "F", destination: "Jamaica-179 St", time: "8 min" },
  { line: "M", destination: "Middle Village", time: "12 min" },
];

export function StationCard() {
  return (
    <Card className="h-full">
      <CardHeader className="flex justify-between items-start pb-2">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrainFront className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold">Your Station</p>
            <p className="text-sm text-foreground/50">West 4th St-Washington Sq</p>
          </div>
        </div>
        <Link
          href="/board"
          className="text-sm text-primary flex items-center gap-1 hover:underline"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="space-y-3">
          {mockDepartures.map((dep, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SubwayBullet line={dep.line} size="md" />
                <span className="text-foreground/80">{dep.destination}</span>
              </div>
              <span className="text-foreground font-medium">{dep.time}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-divider">
          <Link
            href="/board"
            className="text-sm text-foreground/50 flex items-center gap-1 hover:text-foreground"
          >
            <Settings className="h-3 w-3" /> Configure stations
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
