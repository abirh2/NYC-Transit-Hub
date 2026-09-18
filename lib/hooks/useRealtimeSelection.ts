"use client";

/**
 * useRealtimeSelection
 *
 * Makes the Realtime page state-driven: every selection the user makes (mode,
 * route, station/stop, direction, trip, view) lives in the URL, so any state
 * is deep-linkable and survives a reload.
 *
 * Writes use `router.replace` rather than `push` so that exploring a line does
 * not bury the user's previous page under dozens of history entries.
 */

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createRealtimeSearchParams,
  parseRealtimeSearchParams,
  type RealtimeSelection,
  type RealtimeView,
} from "@/lib/transit/deep-link";
import type { TransitDirection, TransitMode } from "@/types/transit";

export interface UseRealtimeSelectionReturn {
  selection: RealtimeSelection;
  /** Switches mode, dropping selections that are meaningless in the new mode. */
  setMode: (mode: TransitMode) => void;
  /** Selects a route, or clears it when passed the already-selected route. */
  setRoute: (routeId: string | null) => void;
  setStation: (stationId: string | null) => void;
  setStop: (stopId: string | null) => void;
  setDirection: (direction: TransitDirection | null) => void;
  setTrip: (
    tripId: string | null,
    context?: Pick<RealtimeSelection, "routeId" | "direction">,
  ) => void;
  setView: (view: RealtimeView) => void;
  /** Clears everything that drives the detail surface. */
  clearDetail: () => void;
}

export function useRealtimeSelection(): UseRealtimeSelectionReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selection = useMemo(
    () => parseRealtimeSearchParams(searchParams),
    [searchParams],
  );

  const commit = useCallback(
    (next: RealtimeSelection) => {
      const params = createRealtimeSearchParams(next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router],
  );

  const patch = useCallback(
    (changes: Partial<RealtimeSelection>) => {
      commit({ ...selection, ...changes });
    },
    [commit, selection],
  );

  const setMode = useCallback(
    (mode: TransitMode) => {
      if (mode === selection.mode) return;
      // Route/station/stop/trip IDs are mode-specific namespaces, so carrying
      // them across a mode switch would produce a selection that resolves to
      // nothing. View is intentionally preserved.
      commit({ mode, view: selection.view });
    },
    [commit, selection.mode, selection.view],
  );

  const setRoute = useCallback(
    (routeId: string | null) => {
      const isDeselect = routeId === null || routeId === selection.routeId;
      patch({
        routeId: isDeselect ? undefined : routeId,
        // A station/stop/trip belongs to the previous route's context.
        stationId: undefined,
        stopId: undefined,
        tripId: undefined,
      });
    },
    [patch, selection.routeId],
  );

  const setStation = useCallback(
    (stationId: string | null) => {
      const isDeselect = stationId === null || stationId === selection.stationId;
      patch({
        stationId: isDeselect ? undefined : stationId,
        stopId: undefined,
        tripId: undefined,
      });
    },
    [patch, selection.stationId],
  );

  const setStop = useCallback(
    (stopId: string | null) => {
      const isDeselect = stopId === null || stopId === selection.stopId;
      patch({
        stopId: isDeselect ? undefined : stopId,
        stationId: undefined,
        tripId: undefined,
      });
    },
    [patch, selection.stopId],
  );

  const setDirection = useCallback(
    (direction: TransitDirection | null) => {
      const isDeselect = direction === null || direction === selection.direction;
      patch({ direction: isDeselect ? undefined : direction });
    },
    [patch, selection.direction],
  );

  const setTrip = useCallback(
    (
      tripId: string | null,
      context?: Pick<RealtimeSelection, "routeId" | "direction">,
    ) => {
      const isDeselect = tripId === null || tripId === selection.tripId;
      patch({
        ...context,
        tripId: isDeselect ? undefined : tripId,
      });
    },
    [patch, selection.tripId],
  );

  const setView = useCallback(
    (view: RealtimeView) => {
      if (view === selection.view) return;
      patch({ view });
    },
    [patch, selection.view],
  );

  const clearDetail = useCallback(() => {
    patch({ stationId: undefined, stopId: undefined, tripId: undefined });
  }, [patch]);

  return {
    selection,
    setMode,
    setRoute,
    setStation,
    setStop,
    setDirection,
    setTrip,
    setView,
    clearDetail,
  };
}
