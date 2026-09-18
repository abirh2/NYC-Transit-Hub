import type { ReactNode } from "react";

import { Surface } from "@/components/ui";

export function NearbyLocationCard({
  children,
  selected = false,
  onSelect,
  label,
}: {
  children: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  label?: string;
}) {
  const className = `w-full rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
    selected
      ? "border-state-selected bg-surface-selected"
      : "border-border-subtle bg-surface-panel hover:bg-surface-hover"
  }`;

  if (onSelect) {
    return (
      <button type="button" aria-label={label} aria-pressed={selected} onClick={onSelect} className={className}>
        {children}
      </button>
    );
  }

  return <Surface elevation="panel" className={className}>{children}</Surface>;
}
