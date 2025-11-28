"use client";

import { Card, CardBody, CardHeader, Chip } from "@heroui/react";
import { Clock, ArrowRight, Home, Briefcase } from "lucide-react";
import Link from "next/link";

export function CommuteCard() {
  // Mock commute data
  const mockCommute = {
    isConfigured: true,
    leaveIn: "6 min",
    arriveBy: "9:00 AM",
    route: "F → A",
    duration: "34 min",
    status: "normal", // normal, delayed, early
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
          {mockCommute.isConfigured ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-foreground/70">
                  <Home className="h-4 w-4" />
                  <span className="text-sm">→</span>
                  <Briefcase className="h-4 w-4" />
                </div>
                <Chip size="sm" color="success" variant="flat">
                  On time
                </Chip>
              </div>
              <div className="text-center py-2">
                <p className="text-3xl font-bold text-foreground">
                  {mockCommute.leaveIn}
                </p>
                <p className="text-sm text-foreground/50">
                  Leave to arrive by {mockCommute.arriveBy}
                </p>
              </div>
              <div className="flex justify-between text-sm text-foreground/60">
                <span>via {mockCommute.route}</span>
                <span>{mockCommute.duration} total</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-foreground/50">Set up your commute</p>
            </div>
          )}
        </CardBody>
      </Card>
    </Link>
  );
}

