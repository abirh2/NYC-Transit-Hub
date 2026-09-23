import { Clock3, WifiOff } from "lucide-react";

interface DataFreshnessProps {
  updatedAt: Date | string | number | null;
  now?: Date;
  staleAfterMs?: number;
  isOffline?: boolean;
  className?: string;
}

function getFreshnessLabel(updatedAt: Date, now: Date) {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - updatedAt.getTime()) / 1_000),
  );

  if (elapsedSeconds < 45) return "Updated now";

  const elapsedMinutes = Math.max(1, Math.floor(elapsedSeconds / 60));
  return `Updated ${elapsedMinutes} min ago`;
}

export function DataFreshness({
  updatedAt,
  now = new Date(),
  staleAfterMs = 120_000,
  isOffline = false,
  className,
}: DataFreshnessProps) {
  if (isOffline) {
    return (
      <p
        role="status"
        className={`flex items-center gap-1.5 text-sm font-medium text-warning${className ? ` ${className}` : ""}`}
      >
        <WifiOff className="h-4 w-4" aria-hidden="true" />
        Realtime unavailable offline
      </p>
    );
  }

  if (!updatedAt) return null;

  const date = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return null;

  const isStale = now.getTime() - date.getTime() > staleAfterMs;

  return (
    <p
      role={isStale ? "status" : undefined}
      className={`flex items-center gap-1.5 text-sm ${
        isStale ? "font-medium text-warning" : "text-foreground/60"
      }${className ? ` ${className}` : ""}`}
    >
      <Clock3 className="h-4 w-4" aria-hidden="true" />
      {isStale ? "Realtime delayed" : getFreshnessLabel(date, now)}
    </p>
  );
}

export type { DataFreshnessProps };

