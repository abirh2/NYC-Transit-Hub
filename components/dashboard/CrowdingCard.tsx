"use client";

import { Card, CardBody, CardHeader, Chip } from "@heroui/react";
import { Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { SubwayBullet } from "@/components/ui";

// Mock data
const mockCrowding = [
  { line: "L", level: "high" },
  { line: "4", level: "high" },
  { line: "F", level: "medium" },
  { line: "G", level: "low" },
  { line: "R", level: "low" },
];

function getCrowdingChip(level: string) {
  switch (level) {
    case "high":
      return <Chip size="sm" color="danger" variant="flat">Packed</Chip>;
    case "medium":
      return <Chip size="sm" color="warning" variant="flat">Busy</Chip>;
    case "low":
      return <Chip size="sm" color="success" variant="flat">Clear</Chip>;
    default:
      return null;
  }
}

export function CrowdingCard() {
  const highCrowding = mockCrowding.filter((c) => c.level === "high");
  const lowCrowding = mockCrowding.filter((c) => c.level === "low");

  return (
    <Link href="/crowding" className="block h-full w-full">
      <Card isPressable className="h-full w-full flex flex-col hover:scale-[1.02] transition-transform">
        <CardHeader className="flex justify-between items-start pb-2">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold">Crowding</p>
              <p className="text-sm text-foreground/50">Right now</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-foreground/30" />
        </CardHeader>
        <CardBody className="pt-0 flex-1">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-foreground/50 mb-1">Most crowded</p>
              <div className="flex items-center gap-2">
                {highCrowding.map((item) => (
                  <SubwayBullet key={item.line} line={item.line} size="sm" />
                ))}
                {getCrowdingChip("high")}
              </div>
            </div>
            <div>
              <p className="text-xs text-foreground/50 mb-1">Least crowded</p>
              <div className="flex items-center gap-2">
                {lowCrowding.map((item) => (
                  <SubwayBullet key={item.line} line={item.line} size="sm" />
                ))}
                {getCrowdingChip("low")}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
