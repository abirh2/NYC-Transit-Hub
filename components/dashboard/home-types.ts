import type { NearbyService } from "@/lib/transit/nearby";
import type { RealtimeSourceState } from "@/types/transit";

export interface HomeCommuteSummary {
  isAuthenticated: boolean;
  isConfigured: boolean;
  leaveIn: string | null;
  arriveBy: string | null;
  duration: number | null;
  route: string | null;
  status: "on_time" | "delayed" | "early" | null;
  delayMinutes: number | null;
  isPastWindow?: boolean;
  error?: string | null;
}

export interface SavedStationSnapshot {
  stationId: string;
  stationName: string;
  services: NearbyService[];
  routeIds: string[];
  stopIds: string[];
  sourceState: RealtimeSourceState;
  error: string | null;
}
