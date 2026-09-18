"use client";

import { useEffect, useState } from "react";

import {
  subwayGeometryLoader,
  type SubwayGeometryArtifact,
} from "@/lib/gtfs/subway-route-geometry";

export interface SubwayRouteGeometryState {
  artifact: SubwayGeometryArtifact | null;
  isLoading: boolean;
  error: string | null;
}

/** Loads static route geometry once per route, independently of realtime polling. */
export function useSubwayRouteGeometry(
  routeId: string | null,
): SubwayRouteGeometryState {
  const [state, setState] = useState<SubwayRouteGeometryState>({
    artifact: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    if (!routeId) {
      return () => {
        cancelled = true;
      };
    }

    void subwayGeometryLoader.load(routeId).then((artifact) => {
      if (cancelled) return;
      setState({
        artifact,
        isLoading: false,
        error: artifact ? null : "Static subway geometry unavailable",
      });
    });

    return () => {
      cancelled = true;
    };
  }, [routeId]);

  return state;
}
