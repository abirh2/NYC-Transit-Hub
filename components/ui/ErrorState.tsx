"use client";

import { Button } from "@heroui/react";
import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border-subtle bg-surface-panel px-6 py-12 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-state-severe/10 text-state-severe">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="max-w-md text-sm text-foreground/60">{description}</p>
      )}
      {onRetry && (
        <Button className="mt-2" color="primary" variant="flat" onPress={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
