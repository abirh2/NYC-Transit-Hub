"use client";

import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  headingLevel?: "h2" | "h3";
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  headingLevel = "h3",
}: EmptyStateProps) {
  const Heading = headingLevel;

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border-subtle bg-surface-panel px-6 py-12 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-hover text-foreground/50">
          {icon}
        </div>
      )}
      <Heading className="text-lg font-semibold text-foreground">{title}</Heading>
      {description && (
        <p className="max-w-md text-sm text-foreground/60">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
