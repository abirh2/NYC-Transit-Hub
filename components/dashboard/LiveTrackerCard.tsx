"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { Radio, ArrowRight } from "lucide-react";
import Link from "next/link";

// Mock line diagram
const mockStations = [
  { name: "14 St", hasTrain: false },
  { name: "W 4 St", hasTrain: true },
  { name: "Spring St", hasTrain: false },
  { name: "Canal St", hasTrain: false },
  { name: "Brooklyn", hasTrain: true },
];

export function LiveTrackerCard() {
  return (
    <Link href="/realtime" className="block h-full w-full">
      <Card isPressable className="h-full w-full flex flex-col hover:scale-[1.02] transition-transform">
        <CardHeader className="flex justify-between items-start pb-2">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold">Live Tracker</p>
              <p className="text-sm text-foreground/50">F Train</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-foreground/30" />
        </CardHeader>
        <CardBody className="pt-0 flex-1 flex flex-col justify-between">
          {/* Mini line diagram */}
          <div className="flex items-center justify-between px-2">
            {mockStations.map((station) => (
              <div key={station.name} className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full border-2 ${
                    station.hasTrain
                      ? "bg-secondary border-secondary"
                      : "bg-transparent border-foreground/30"
                  }`}
                />
                <span className="text-[10px] text-foreground/50 mt-1 text-center w-10 truncate">
                  {station.name}
                </span>
              </div>
            ))}
          </div>
          {/* Connecting line */}
          <div className="relative -mt-6 mx-4">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-foreground/20" style={{ marginTop: '6px' }} />
          </div>
          <p className="text-xs text-foreground/50 mt-4 text-center">
            2 trains in service
          </p>
        </CardBody>
      </Card>
    </Link>
  );
}

