"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { Calendar, Route, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { OutageFilters, OutageList, type OutageFiltersState, type OutageTab } from "@/components/accessibility";
import { PageContainer, PageHeader } from "@/components/layout";
import { DataFreshness, StatusChip, Surface } from "@/components/ui";
import { filterAndSortOutages, hydrateEquipmentOutage } from "@/lib/transit/accessibility-status";
import type { EquipmentOutage } from "@/types/mta";
import { useStationPreferences } from "@/lib/hooks/useStationPreferences";
import { useVisiblePolling } from "@/lib/hooks";
import { apiFetch } from "@/lib/api/client";

const REFRESH_INTERVAL_MS = 60_000;

interface ElevatorsApiResponse {
  success: boolean;
  data?: { equipment: EquipmentOutage[] };
  error?: string;
}

const DEFAULT_FILTERS: OutageFiltersState = {
  stationSearch: "", lines: [], equipmentTypes: [], adaOnly: false, sortBy: "station",
};

export function AccessibilityClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { favorites } = useStationPreferences();
  const stationQuery = searchParams.get("station")?.trim() ?? "";
  const [outageTab, setOutageTab] = useState<OutageTab>("current");
  const [currentOutages, setCurrentOutages] = useState<EquipmentOutage[]>([]);
  const [upcomingOutages, setUpcomingOutages] = useState<EquipmentOutage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filters, setFilters] = useState<OutageFiltersState>({ ...DEFAULT_FILTERS, stationSearch: stationQuery });

  useEffect(() => {
    if (stationQuery) setFilters((current) => ({ ...current, stationSearch: stationQuery }));
  }, [stationQuery]);

  const fetchOutages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [currentResponse, upcomingResponse] = await Promise.all([
        apiFetch("/api/elevators"), apiFetch("/api/elevators/upcoming"),
      ]);
      const [currentPayload, upcomingPayload] = await Promise.all([
        currentResponse.json() as Promise<ElevatorsApiResponse>,
        upcomingResponse.json() as Promise<ElevatorsApiResponse>,
      ]);
      if (!currentResponse.ok || !currentPayload.success || !currentPayload.data) {
        throw new Error(currentPayload.error ?? "Current accessibility status is unavailable.");
      }
      if (!upcomingResponse.ok || !upcomingPayload.success || !upcomingPayload.data) {
        throw new Error(upcomingPayload.error ?? "Upcoming accessibility work is unavailable.");
      }
      setCurrentOutages(currentPayload.data.equipment.map(hydrateEquipmentOutage));
      setUpcomingOutages(upcomingPayload.data.equipment.map(hydrateEquipmentOutage));
      setLastUpdated(new Date());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Accessibility status is unavailable.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOutages();
  }, [fetchOutages]);

  const { isOnline } = useVisiblePolling(fetchOutages, REFRESH_INTERVAL_MS);

  const activeOutages = outageTab === "current" ? currentOutages : upcomingOutages;
  const filteredOutages = useMemo(
    () => filterAndSortOutages(activeOutages, filters),
    [activeOutages, filters],
  );

  const updateFilters = (next: OutageFiltersState) => {
    setFilters(next);
    if (next.stationSearch === filters.stationSearch) return;
    const params = new URLSearchParams(searchParams.toString());
    if (next.stationSearch.trim()) params.set("station", next.stationSearch.trim());
    else params.delete("station");
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Accessibility"
        description="Current elevator and escalator outages, with upcoming work kept separate."
        actions={(
          <Link href="/routes?accessible=true" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
            <Route className="h-4 w-4" aria-hidden="true" /> Plan a step-free trip
          </Link>
        )}
      />

      <div className="space-y-5">
        <Surface as="section" className="p-4">
          <OutageFilters filters={filters} onFiltersChange={updateFilters} onRefresh={() => void fetchOutages()} isLoading={isLoading} activeTab={outageTab} />
          {favorites.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3" aria-label="Saved station filters">
              <span className="text-xs font-semibold text-foreground/60">Saved</span>
              {favorites.map((favorite) => (
                <button
                  key={favorite.stationId}
                  type="button"
                  aria-pressed={filters.stationSearch === favorite.stationName}
                  onClick={() => updateFilters({ ...filters, stationSearch: favorite.stationName })}
                  className="min-h-9 rounded-pill bg-surface-elevated px-3 text-xs font-semibold hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  {favorite.stationName}
                </button>
              ))}
            </div>
          )}
        </Surface>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-lg bg-surface-elevated p-1" role="group" aria-label="Outage period">
            <Button size="sm" variant={outageTab === "current" ? "solid" : "light"} onPress={() => setOutageTab("current")} startContent={<Zap className="h-4 w-4" aria-hidden="true" />}>
              Current ({currentOutages.length})
            </Button>
            <Button size="sm" variant={outageTab === "upcoming" ? "solid" : "light"} onPress={() => setOutageTab("upcoming")} startContent={<Calendar className="h-4 w-4" aria-hidden="true" />}>
              Upcoming ({upcomingOutages.length})
            </Button>
          </div>
          <div className="flex items-center gap-3 text-xs text-foreground/60">
            <StatusChip state={error ? "unavailable" : filteredOutages.length ? "advisory" : "normal"} label={error ? "Unavailable" : `${filteredOutages.length} shown`} size="sm" />
            <DataFreshness updatedAt={lastUpdated} isOffline={!isOnline} className="text-xs" />
          </div>
        </div>

        <OutageList
          outages={filteredOutages}
          isLoading={isLoading && activeOutages.length === 0}
          error={currentOutages.length === 0 && upcomingOutages.length === 0 ? error : null}
          isUpcoming={outageTab === "upcoming"}
          emptyMessage={outageTab === "current" ? "No current outages match these filters." : "No upcoming work matches these filters."}
        />
      </div>
    </PageContainer>
  );
}
