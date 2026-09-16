"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";
import type { ReactNode } from "react";

interface PlaceholderCardProps {
  icon: ReactNode;
  title: string;
  phase: string;
  description: string;
  children?: ReactNode;
}

export function PlaceholderCard({
  icon,
  title,
  phase,
  description,
  children,
}: PlaceholderCardProps) {
  return (
    <Card className="border border-border-subtle bg-surface-panel">
      <CardHeader className="flex gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-hover text-primary">
          {icon}
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">{title}</p>
          <p className="text-sm text-foreground/50">{phase}</p>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-foreground/70">{description}</p>
        {children}
      </CardBody>
    </Card>
  );
}

