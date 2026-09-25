import { Suspense } from "react";
import type { Metadata } from "next";
import { LoadingSkeleton } from "@/components/ui";
import { RealtimeClient } from "./RealtimeClient";

export const metadata: Metadata = {
  title: "Live Map",
  description:
    "Explore live subway, bus, LIRR, and Metro-North positions on an interactive NYC transit map",
};

/**
 * Realtime page shell.
 *
 * Thin by design: `RealtimeClient` reads its entire state from URL search
 * params, and `useSearchParams` requires a Suspense boundary in the App
 * Router, so the client is isolated behind one here.
 *
 * This page deliberately skips `PageContainer`. It is map-first, so it wants
 * the full width rather than a centered reading column, and it needs to fill
 * the viewport: `AppShell` renders `<main>` as a `flex-1` item of a `min-h-dvh`
 * column, which gives `<main>` a definite height, so `h-full` here lets the
 * map claim whatever the chrome above it does not use — no hardcoded pixel
 * offset that goes stale when the toolbar wraps.
 *
 * The header carries no description for the same reason: on a map-first page
 * every row of permanent chrome comes out of the map.
 */
export default function RealtimePage() {
  return (
    <div data-realtime-page className="flex h-full flex-col">
      <header className="shrink-0 lg:mb-5">
        <h1 className="sr-only lg:not-sr-only lg:text-3xl lg:font-bold lg:text-foreground">
          Live Map
        </h1>
      </header>
      <Suspense
        fallback={
          <div className="min-h-0 flex-1">
            <LoadingSkeleton variant="card" />
          </div>
        }
      >
        <RealtimeClient />
      </Suspense>
    </div>
  );
}
