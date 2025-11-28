"use client";

import { Card, CardBody } from "@heroui/react";

interface StatusCardProps {
  label: string;
  status: string;
}

export function StatusCard({ label, status }: StatusCardProps) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground/50">{label}</p>
            <p className="text-lg font-medium text-foreground">{status}</p>
          </div>
          <div className="h-3 w-3 animate-pulse rounded-full bg-warning" />
        </div>
      </CardBody>
    </Card>
  );
}

