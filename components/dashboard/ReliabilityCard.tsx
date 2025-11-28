"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { SubwayBullet } from "@/components/ui";

// Mock data
const mockReliability = [
  { line: "L", percentage: 94 },
  { line: "7", percentage: 89 },
  { line: "F", percentage: 78 },
  { line: "A", percentage: 72 },
];

function getGradeColor(percentage: number) {
  if (percentage >= 90) return "text-success";
  if (percentage >= 75) return "text-warning";
  return "text-danger";
}

export function ReliabilityCard() {
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
              <p className="text-sm text-foreground/50">Past 7 days</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-foreground/30" />
        </CardHeader>
        <CardBody className="pt-0 flex-1">
          <div className="space-y-2">
            {mockReliability.map((item) => (
              <div key={item.line} className="flex items-center gap-3">
                <SubwayBullet line={item.line} size="sm" />
                <div className="flex-1 h-2 bg-default-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span className={`text-sm font-medium w-10 text-right ${getGradeColor(item.percentage)}`}>
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
