"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardBody, CardHeader, Chip, Skeleton } from "@heroui/react";
import { Clock, ArrowRight, Home, Briefcase, AlertTriangle, LogIn } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth";

interface CommuteSummaryData {
  isAuthenticated: boolean;
  isConfigured: boolean;
  leaveIn: string | null;
  arriveBy: string | null;
  duration: number | null;
  route: string | null;
  status: "on_time" | "delayed" | "early" | null;
  delayMinutes: number | null;
  targetArrival?: string | null;
  isPastWindow?: boolean;
  error?: string;
}

export function CommuteCard() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<CommuteSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch("/api/commute/summary");
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch commute summary:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchSummary();
    }
  }, [authLoading, fetchSummary]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchSummary, 60000);
    return () => clearInterval(interval);
  }, [user, fetchSummary]);

  const statusConfig = {
    on_time: { color: "success" as const, label: "On time" },
    delayed: { color: "danger" as const, label: "Running late" },
    early: { color: "primary" as const, label: "Early" },
  };

  return (
    <Link href="/commute" className="block h-full w-full">
      <Card isPressable className="h-full w-full flex flex-col hover:scale-[1.02] transition-transform">
        <CardHeader className="flex justify-between items-start pb-2">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold">Commute Assistant</p>
              <p className="text-sm text-foreground/50">Your daily route</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-foreground/30" />
        </CardHeader>
        <CardBody className="pt-0 flex-1">
          {/* Loading State */}
          {(authLoading || isLoading) && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-4 w-32 rounded" />
            </div>
          )}

          {/* Not Authenticated */}
          {!authLoading && !isLoading && !user && (
            <div className="text-center py-4">
              <LogIn className="h-8 w-8 mx-auto text-foreground/30 mb-2" />
              <p className="text-sm text-foreground/50">Sign in to set up your commute</p>
            </div>
          )}

          {/* Authenticated but not configured */}
          {!authLoading && !isLoading && user && data && !data.isConfigured && (
            <div className="text-center py-4">
              <div className="flex justify-center gap-2 mb-2">
                <Home className="h-5 w-5 text-foreground/30" />
                <ArrowRight className="h-5 w-5 text-foreground/20" />
                <Briefcase className="h-5 w-5 text-foreground/30" />
              </div>
              <p className="text-sm text-foreground/50">Set up your commute</p>
            </div>
          )}

          {/* Configured with data */}
          {!authLoading && !isLoading && user && data && data.isConfigured && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-foreground/70">
                  <Home className="h-4 w-4" />
                  <span className="text-sm">→</span>
                  <Briefcase className="h-4 w-4" />
                </div>
                {data.status && !data.isPastWindow && (
                  <Chip size="sm" color={statusConfig[data.status].color} variant="flat">
                    {statusConfig[data.status].label}
                  </Chip>
                )}
                {data.isPastWindow && (
                  <Chip size="sm" color="warning" variant="flat">
                    Window passed
                  </Chip>
                )}
              </div>
              
              {data.error ? (
                <div className="text-center py-2">
                  <AlertTriangle className="h-6 w-6 mx-auto text-warning mb-1" />
                  <p className="text-sm text-foreground/50">Unable to fetch route</p>
                </div>
              ) : (
                <>
                  <div className="text-center py-2">
                    <p className="text-3xl font-bold text-foreground">
                      {data.leaveIn || "--"}
                    </p>
                    <p className="text-sm text-foreground/50">
                      {data.isPastWindow 
                        ? `Next trip arrives ${data.arriveBy}` 
                        : data.arriveBy 
                          ? `Leave to arrive by ${data.arriveBy}` 
                          : "to leave"}
                    </p>
                  </div>
                  <div className="flex justify-between text-sm text-foreground/60">
                    <span>via {data.route || "--"}</span>
                    <span>{data.duration ? `${data.duration} min` : "--"}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </Link>
  );
}

