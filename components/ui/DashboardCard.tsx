"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";
import Link from "next/link";
import type { ReactNode } from "react";

interface DashboardCardProps {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  status?: string;
}

export function DashboardCard({
  href,
  title,
  description,
  icon,
  status,
}: DashboardCardProps) {
  return (
    <Link href={href} className="block h-full">
      <Card
        isPressable
        className="h-full transition-transform hover:scale-[1.02]"
      >
        <CardHeader className="flex gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="flex flex-col">
            <p className="text-lg font-semibold">{title}</p>
            {status && (
              <p className="text-sm text-foreground/50">{status}</p>
            )}
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <p className="text-foreground/70">{description}</p>
        </CardBody>
      </Card>
    </Link>
  );
}

