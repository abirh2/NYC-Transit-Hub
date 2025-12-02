"use client";

import { Card, CardBody, CardHeader, Chip, Skeleton } from "@heroui/react";
import { Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { SubwayBullet } from "@/components/ui";
import { useEffect, useState } from "react";
import { RouteCrowding } from "@/types/mta";

function getCrowdingChip(level: string) {
  switch (level) {
    case "HIGH":
      return <Chip size="sm" color="danger" variant="flat">Packed</Chip>;
    case "MEDIUM":
      return <Chip size="sm" color="warning" variant="flat">Busy</Chip>;
    case "LOW":
      return <Chip size="sm" color="success" variant="flat">Clear</Chip>;
    default:
      return null;
  }
}

export function CrowdingCard() {
  const [data, setData] = useState<RouteCrowding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/metrics/crowding");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch crowding data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const highCrowding = data.filter((c) => c.crowdingLevel === "HIGH");
  const mediumCrowding = data.filter((c) => c.crowdingLevel === "MEDIUM");
  const lowCrowding = data.filter((c) => c.crowdingLevel === "LOW");

  // Prioritize showing HIGH, then MEDIUM for "Most crowded"
  const mostCrowded = [...highCrowding, ...mediumCrowding].slice(0, 5);

  // Show LOW for "Least crowded"
  const leastCrowded = lowCrowding.slice(0, 5);

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
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-24 rounded-lg" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {mostCrowded.length > 0 ? (
                <div>
                  <p className="text-xs text-foreground/50 mb-1">Most crowded</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {mostCrowded.map((item) => (
                      <SubwayBullet key={item.routeId} line={item.routeId} size="sm" />
                    ))}
                    {highCrowding.length > 0 ? getCrowdingChip("HIGH") : getCrowdingChip("MEDIUM")}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-success">
                  System looks good! No major crowding detected.
                </div>
              )}

              {leastCrowded.length > 0 && (
                <div>
                  <p className="text-xs text-foreground/50 mb-1">Least crowded</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {leastCrowded.map((item) => (
                      <SubwayBullet key={item.routeId} line={item.routeId} size="sm" />
                    ))}
                    {getCrowdingChip("LOW")}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </Link>
  );
}
