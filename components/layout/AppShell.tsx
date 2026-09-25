"use client";

import { useState } from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { MoreDrawer } from "./MoreDrawer";

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * AppShell — responsive application frame (Requirements 2.3, 3.1, 13.1, 14.1).
 *
 * Composes the two nav modes that swap purely via CSS at the `lg` breakpoint,
 * so both are always mounted and each hides itself:
 *
 *   - `lg+` (desktop): persistent, collapsible `Sidebar` on the left; no
 *     `BottomNav`. `Sidebar` is styled `hidden lg:flex`.
 *   - below `lg` (mobile): `Sidebar` is hidden; `BottomNav` (fixed, `lg:hidden`)
 *     plus the `MoreDrawer` sheet take over. The `Navbar` sits on top in both.
 *
 * A single `<main>` landmark wraps the page content (Requirement 14.1). This
 * component is a client component because it owns the `MoreDrawer` open state:
 * `BottomNav`'s More slot calls `onMoreClick` to open it, and the drawer closes
 * itself through `onClose`.
 *
 * Safe-area and BottomNav clearance (Requirements 11.1, 11.2, 11.4):
 *   - The root uses `min-h-dvh` (dynamic viewport height) rather than
 *     `min-h-screen` so the mobile URL bar and software keyboard cannot trap
 *     content in an oversized `100vh` frame.
 *   - The main column pads the left/right safe-area insets so landscape notch
 *     regions never clip content (`Navbar` top and `BottomNav` bottom insets
 *     are applied in those components).
 *   - `<main>` reserves bottom clearance equal to the `BottomNav` height plus
 *     the bottom safe inset below `lg`, removed at `lg+` where the Sidebar
 *     replaces the BottomNav. This keeps focused inputs above the fixed
 *     BottomNav and keeps the last page content visible.
 */
export function AppShell({ children }: AppShellProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-surface-app">
      {/* Persistent, collapsible desktop sidebar (hides itself below lg). */}
      <Sidebar />

      {/* Main column: Navbar on top, page content below. Landscape safe-area
          insets keep content clear of the notch on the left/right edges. */}
      <div className="flex min-w-0 flex-1 flex-col pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <Navbar />

        {/* Bottom clearance = BottomNav height (4rem) + bottom safe inset on
            mobile; dropped to the desktop gutter at lg+ (no BottomNav there). */}
        <main className="flex-1 p-4 pb-[var(--mobile-nav-clearance)] md:p-6 md:pb-[var(--mobile-nav-clearance)] lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile navigation (hides itself at lg+). AppShell owns drawer state. */}
      <BottomNav onMoreClick={() => setIsMoreOpen(true)} />
      <MoreDrawer isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} />
    </div>
  );
}
