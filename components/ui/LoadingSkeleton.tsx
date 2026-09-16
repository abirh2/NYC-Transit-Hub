"use client";

interface LoadingSkeletonProps {
  variant?: "text" | "card" | "list" | "metric";
  count?: number;
  className?: string;
}

const shimmer = "animate-pulse rounded-md bg-surface-hover";

function SkeletonItem({ variant }: { variant: NonNullable<LoadingSkeletonProps["variant"]> }) {
  switch (variant) {
    case "text":
      return <div className={`${shimmer} h-4 w-full`} />;
    case "card":
      return (
        <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-panel p-4">
          <div className={`${shimmer} h-5 w-1/2`} />
          <div className={`${shimmer} h-4 w-full`} />
          <div className={`${shimmer} h-4 w-3/4`} />
        </div>
      );
    case "list":
      return (
        <div className="flex items-center gap-3">
          <div className={`${shimmer} h-10 w-10 rounded-full`} />
          <div className="flex flex-1 flex-col gap-2">
            <div className={`${shimmer} h-4 w-1/3`} />
            <div className={`${shimmer} h-3 w-2/3`} />
          </div>
        </div>
      );
    case "metric":
      return (
        <div className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface-panel p-4">
          <div className={`${shimmer} h-4 w-1/3`} />
          <div className={`${shimmer} h-8 w-1/2`} />
        </div>
      );
  }
}

export function LoadingSkeleton({
  variant = "text",
  count = 1,
  className,
}: LoadingSkeletonProps) {
  const items = Math.max(1, count);

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={`flex flex-col gap-3${className ? ` ${className}` : ""}`}
    >
      <span className="sr-only">Loading…</span>
      {Array.from({ length: items }, (_, i) => (
        <SkeletonItem key={i} variant={variant} />
      ))}
    </div>
  );
}
