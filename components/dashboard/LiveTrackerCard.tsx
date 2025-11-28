"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardBody, CardHeader, Spinner } from "@heroui/react";
import { Radio, ArrowRight, Train } from "lucide-react";
import Link from "next/link";
import { SubwayBullet } from "@/components/ui";
import type { TrainArrival, SubwayLine } from "@/types/mta";

interface TrainSummary {
  totalTrains: number;
  activeLines: SubwayLine[];
  isLoading: boolean;
  error: string | null;
}

// Line order for display (grouped by color family)
const LINE_ORDER: SubwayLine[] = [
  "1", "2", "3",           // Red
  "4", "5", "6",           // Green  
  "7",                     // Purple
  "A", "C", "E",           // Blue
  "B", "D", "F", "M",      // Orange
  "G",                     // Lime
  "J", "Z",                // Brown
  "L",                     // Gray
  "N", "Q", "R", "W",      // Yellow
  "S",                     // Shuttle
];

export function LiveTrackerCard() {
  const [summary, setSummary] = useState<TrainSummary>({
    totalTrains: 0,
    activeLines: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchTrainSummary() {
      try {
        const response = await fetch("/api/trains/realtime?limit=500");
        if (!response.ok) throw new Error("Failed to fetch trains");
        
        const data = await response.json();
        
        if (data.success && data.data?.arrivals) {
          const arrivals: TrainArrival[] = data.data.arrivals;
          
          // Get unique trips (same train can appear at multiple stations)
          const uniqueTrips = new Set(arrivals.map(a => a.tripId));
          
          // Get unique active lines
          const activeLinesSet = new Set(arrivals.map(a => a.routeId as SubwayLine));
          const activeLines = LINE_ORDER.filter(line => activeLinesSet.has(line));
          
          setSummary({
            totalTrains: uniqueTrips.size,
            activeLines,
            isLoading: false,
            error: null,
          });
        } else {
          throw new Error(data.error || "No data");
        }
      } catch (err) {
        setSummary(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load",
        }));
      }
    }

    fetchTrainSummary();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchTrainSummary, 60000);
    return () => clearInterval(interval);
  }, []);

  // Animated pulse effect for the live indicator
  const pulseAnimation = "animate-pulse";

  return (
    <Link href="/realtime" className="block h-full w-full">
      <Card 
        isPressable 
        className="h-full w-full flex flex-col hover:scale-[1.02] transition-transform overflow-hidden"
      >
        <CardHeader className="flex justify-between items-start pb-2">
          <div className="flex gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <Radio className="h-5 w-5" />
              {/* Live indicator dot */}
              <span className={`absolute top-1 right-1 w-2 h-2 bg-success rounded-full ${pulseAnimation}`} />
            </div>
            <div>
              <p className="text-lg font-semibold">Live Tracker</p>
              <p className="text-sm text-foreground/50">Real-time trains</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-foreground/30" />
        </CardHeader>
        
        <CardBody className="pt-0 flex-1 flex flex-col justify-center gap-2">
          {summary.isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Spinner size="sm" color="success" />
            </div>
          ) : summary.error ? (
            <div className="flex items-center justify-center py-4">
              <p className="text-sm text-foreground/50">Tap to view trains</p>
            </div>
          ) : (
            <>
              {/* Train count - prominent display */}
              <div className="flex items-center justify-center gap-2">
                <Train className="h-6 w-6 text-success" />
                <span className="text-3xl font-bold text-success">{summary.totalTrains}</span>
                <span className="text-base text-foreground/60">trains running</span>
              </div>
              
              {/* Active lines preview */}
              <div className="space-y-1.5">
                <p className="text-xs text-foreground/50 text-center">
                  {summary.activeLines.length} lines active
                </p>
                <div className="flex flex-wrap justify-center gap-1">
                  {summary.activeLines.slice(0, 12).map((line) => (
                    <SubwayBullet key={line} line={line} size="sm" />
                  ))}
                  {summary.activeLines.length > 12 && (
                    <span className="text-xs text-foreground/50 self-center ml-1">
                      +{summary.activeLines.length - 12}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </Link>
  );
}
