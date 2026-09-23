"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { LoaderCircle, Search, Star } from "lucide-react";

import { SubwayBullet } from "@/components/ui";

export interface StationSearchResult {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance?: number;
  allIds?: string[];
  allPlatforms?: { north: string[]; south: string[] };
  routeIds?: string[];
}

export interface SavedStationOption {
  id: string;
  name: string;
}

interface StationSearchProps {
  onSelect: (
    stationId: string,
    stationName: string,
    allPlatforms?: { north: string[]; south: string[] },
    location?: { latitude: number; longitude: number },
  ) => void;
  selectedId?: string | null;
  placeholder?: string;
  compact?: boolean;
  favoriteIds?: string[];
  savedStations?: SavedStationOption[];
}

type SearchState = "idle" | "loading" | "ready" | "error";

export function StationSearch({
  onSelect,
  selectedId,
  placeholder = "Search by station name",
  compact = false,
  favoriteIds = [],
  savedStations = [],
}: StationSearchProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [stations, setStations] = useState<StationSearchResult[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedName, setSelectedName] = useState("");

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setStations([]);
      setState("idle");
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setState("loading");
      setIsOpen(true);
      try {
        const response = await fetch(
          `/api/stations?search=${encodeURIComponent(trimmed)}&limit=10`,
          { signal: controller.signal },
        );
        const payload = await response.json() as {
          success: boolean;
          data?: { stations: StationSearchResult[] };
        };
        if (!response.ok || !payload.success || !payload.data) throw new Error("Station search failed");
        setStations(payload.data.stations);
        setState("ready");
        setActiveIndex(-1);
      } catch {
        if (controller.signal.aborted) return;
        setStations([]);
        setState("error");
        setActiveIndex(-1);
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedName("");
      return;
    }
    const saved = savedStations.find((station) => station.id === selectedId);
    if (saved) {
      setSelectedName(saved.name);
      return;
    }

    const controller = new AbortController();
    fetch(`/api/stations?id=${encodeURIComponent(selectedId)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload: { success: boolean; data?: { stations: StationSearchResult[] } }) => {
        if (payload.success && payload.data?.stations[0]) setSelectedName(payload.data.stations[0].name);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [savedStations, selectedId]);

  const visibleResults: Array<StationSearchResult | SavedStationOption> = query.trim().length >= 2
    ? stations
    : savedStations;

  const selectStation = (station: StationSearchResult | SavedStationOption) => {
    setQuery(station.name);
    setSelectedName(station.name);
    setIsOpen(false);
    setActiveIndex(-1);
    onSelect(
      station.id,
      station.name,
      "allPlatforms" in station ? station.allPlatforms : undefined,
      "latitude" in station
        ? { latitude: station.latitude, longitude: station.longitude }
        : undefined,
    );
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!isOpen || visibleResults.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, visibleResults.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectStation(visibleResults[activeIndex]);
    }
  };

  const showSavedHeading = query.trim().length < 2 && savedStations.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-state-selected" aria-hidden="true" />
      <input
        type="search"
        role="combobox"
        aria-label="Search stations"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (savedStations.length > 0 || query.trim().length >= 2) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={selectedName || placeholder}
        autoComplete="off"
        className={`${compact ? "min-h-11 text-sm" : "min-h-12 text-base"} w-full rounded-lg border border-border-strong bg-surface-panel py-3 pl-12 pr-12 text-foreground outline-none placeholder:text-foreground/60 hover:bg-surface-hover focus:border-focus focus:ring-2 focus:ring-focus/30`}
      />
      {state === "loading" && query.trim().length >= 2 && (
        <LoaderCircle className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-foreground/60 motion-reduce:animate-none" aria-label="Searching stations" />
      )}

      {isOpen && (showSavedHeading || query.trim().length >= 2) && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Station search results"
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-lg border border-border-strong bg-surface-floating p-1 shadow-[var(--shadow-lg)]"
        >
          {showSavedHeading && (
            <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-foreground/55">
              Saved stations
            </p>
          )}
          {state === "error" ? (
            <p role="status" className="px-3 py-4 text-sm text-foreground/75">
              Station search is unavailable. Try again.
            </p>
          ) : state === "ready" && stations.length === 0 && query.trim().length >= 2 ? (
            <p role="status" className="px-3 py-4 text-sm text-foreground/65">
              No matching stations
            </p>
          ) : visibleResults.map((station, index) => {
            const routeIds = "routeIds" in station ? station.routeIds ?? [] : [];
            const isSaved = savedStations.some((saved) => saved.id === station.id)
              || favoriteIds.includes(station.id);
            const optionLabel = [
              station.name,
              ...routeIds,
              isSaved ? "saved station" : null,
            ].filter(Boolean).join(", ");
            return (
              <button
                id={`${listboxId}-${index}`}
                key={station.id}
                type="button"
                role="option"
                aria-selected={activeIndex === index || selectedId === station.id}
                aria-label={optionLabel}
                onPointerMove={() => setActiveIndex(index)}
                onClick={() => selectStation(station)}
                className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-surface-hover aria-selected:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                {isSaved && <Star className="h-4 w-4 shrink-0 fill-current text-state-advisory" aria-hidden="true" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{station.name}</span>
                  {"distance" in station && station.distance !== undefined && (
                    <span className="block text-xs text-foreground/60">{station.distance.toFixed(2)} mi away</span>
                  )}
                </span>
                {routeIds.length > 0 && (
                  <span className="flex shrink-0 flex-wrap justify-end gap-1" aria-hidden="true">
                    {routeIds.slice(0, 6).map((routeId) => (
                      <SubwayBullet key={routeId} line={routeId} size="xs" />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
