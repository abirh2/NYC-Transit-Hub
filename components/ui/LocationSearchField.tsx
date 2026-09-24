"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { LoaderCircle, MapPin, Search, TrainFront } from "lucide-react";

import type { LocationSearchResponse, LocationSearchResult } from "@/types/location";
import { apiFetch } from "@/lib/api/client";

export interface LocationSearchFieldProps {
  label: string;
  value: LocationSearchResult | null;
  onSelect: (result: LocationSearchResult | null) => void;
  placeholder?: string;
  placement?: "above" | "below";
  autoFocus?: boolean;
}

type SearchState = "idle" | "loading" | "ready" | "error";

export function LocationSearchField({
  label,
  value,
  onSelect,
  placeholder = "Search a station, address, or landmark",
  placement = "below",
  autoFocus = false,
}: LocationSearchFieldProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => setQuery(value?.name ?? ""), [value?.id, value?.name]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || trimmed === value?.name) {
      setResults([]);
      setState("idle");
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setState("loading");
      setIsOpen(true);
      try {
        const response = await apiFetch(
          `/api/locations?query=${encodeURIComponent(trimmed)}&limit=8`,
          { signal: controller.signal },
        );
        const payload = await response.json() as { success: boolean; data?: LocationSearchResponse };
        if (!response.ok || !payload.success || !payload.data) throw new Error("Location search failed");
        setResults(payload.data.locations);
        setState("ready");
        setActiveIndex(payload.data.locations.length > 0 ? 0 : -1);
      } catch {
        if (controller.signal.aborted) return;
        setResults([]);
        setState("error");
        setActiveIndex(-1);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, value?.name]);

  useEffect(() => {
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, []);

  const selectResult = (result: LocationSearchResult) => {
    setQuery(result.name);
    setIsOpen(false);
    setActiveIndex(-1);
    onSelect(result);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!isOpen || results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectResult(results[activeIndex]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={`${listboxId}-input`} className="mb-2 block text-sm font-semibold text-foreground">
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-state-selected" aria-hidden="true" />
        <input
          id={`${listboxId}-input`}
          type="search"
          role="combobox"
          aria-label={label}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (value) onSelect(null);
          }}
          onFocus={() => {
            if (query.trim().length >= 2 && query.trim() !== value?.name) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
          className="min-h-12 w-full rounded-lg border border-border-strong bg-surface-panel py-3 pl-12 pr-4 text-base text-foreground outline-none placeholder:text-foreground/55 hover:bg-surface-hover focus:border-focus focus:ring-2 focus:ring-focus/30"
        />
      </div>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={`${label} search results`}
          className={`absolute inset-x-0 z-50 max-h-64 overflow-y-auto rounded-lg border border-border-strong bg-surface-floating p-1 shadow-[var(--shadow-lg)] ${placement === "above" ? "bottom-full mb-2" : "top-full mt-2"}`}
        >
          {state === "loading" ? (
            <p role="status" className="flex min-h-14 items-center gap-2 px-3 text-sm text-foreground/70">
              <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Searching New York City…
            </p>
          ) : state === "error" ? (
            <p role="status" className="px-3 py-4 text-sm text-foreground/75">Search unavailable. Try again.</p>
          ) : results.length === 0 ? (
            <p role="status" className="px-3 py-4 text-sm text-foreground/65">No NYC locations found</p>
          ) : results.map((result, index) => (
            <button
              id={`${listboxId}-${index}`}
              key={result.id}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              aria-label={`${result.name}, ${result.kind === "station" ? "Station" : "Place"}, ${result.description}`}
              onPointerMove={() => setActiveIndex(index)}
              onClick={() => selectResult(result)}
              className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-surface-hover aria-selected:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              {result.kind === "station" ? (
                <TrainFront className="h-4 w-4 shrink-0 text-state-selected" aria-hidden="true" />
              ) : (
                <MapPin className="h-4 w-4 shrink-0 text-state-selected" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{result.name}</span>
                <span className="block truncate text-xs text-foreground/60">
                  {result.kind === "station" ? "Station" : "Place"} · {result.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
