"use client";

import { TrainFront } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { AuthButton } from "@/components/auth";
import { isNativeApp } from "@/lib/api/client";

interface NavbarProps {
  /** Optional additional classes for the top-level header landmark. */
  className?: string;
}

/**
 * Top application bar: brand + theme and auth controls.
 *
 * Renders a semantic `header` landmark. The mobile navigation drawer toggle
 * was removed — mobile navigation is handled by `BottomNav` + `MoreDrawer`.
 * The brand is shown on mobile where the `Sidebar` is hidden; on `lg+` the
 * Sidebar carries the brand, so it is hidden here to avoid duplication.
 *
 * The sticky header pads `env(safe-area-inset-top)` so its content clears the
 * device notch in standalone mode (Requirement 11.1); the inner row keeps a
 * fixed `h-16` while the header grows by the inset above it.
 */
export function Navbar({ className = "" }: NavbarProps) {
  return (
    <header
      className={`sticky top-0 z-30 min-h-16 w-full border-b border-divider bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-md ${className}`}
    >
      <div className="flex h-16 items-center justify-between px-4">
        {/* Brand — visible on mobile where the Sidebar is hidden */}
        <Link href="/" className="flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <TrainFront className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-foreground">
            NYC Transit
          </span>
        </Link>

        {/* Controls — kept right-aligned even when the brand is hidden (lg+) */}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {!isNativeApp && <AuthButton />}
        </div>
      </div>
    </header>
  );
}
