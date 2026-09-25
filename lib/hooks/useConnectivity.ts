"use client";

import { useSyncExternalStore } from "react";

import { getNetworkService } from "@/lib/platform/network";

export function useConnectivity() {
  const service = getNetworkService();
  return useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );
}
