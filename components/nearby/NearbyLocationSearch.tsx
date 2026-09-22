"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { LoaderCircle, MapPin, Search, TrainFront } from "lucide-react";

import type { LocationSearchResponse, LocationSearchResult } from "@/types/location";

interface NearbyLocationSearchProps {
  onSelect: (result: LocationSearchResult) => void;
}

type SearchState = "idle" | "loading" | "ready" | "error";

export function NearbyLocationSearch({ onSelect }: NearbyLocationSearchProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setState("idle");
      setIsOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setState("loading");
      setIsOpen(true);
      try {
        const response = await fetch(
          `/api/locations?query=${encodeURIComponent(trimmed)}&limit=8`,
          { signal: controller.signal },
        );
        const payload = await response.json() as {
          success: boolean;
          data?: LocationSearchResponse;
        };
        if (!response.ok || !payload.success || !payload.data) {
          throw new Error("Location search failed");
        }
        setResults(payload.data.locations);
        setState("ready");
      } catch {
        if (controller.signal.aborted) return;
        setResults([]);
        setState("error");
      }
    }, 250);

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

  const selectResult = (result: LocationSearchResult) => {
    setQuery(result.name);
    setIsOpen(false);
    onSelect(result);
  };

  const submitFirstResult = (event: FormEvent) => {
    event.preventDefault();
    if (results[0]) selectResult(results[0]);
  };

  return (
    <div ref={containerRef} className="relative">
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Location search results"
          className="absolute inset-x-0 bottom-full mb-2 max-h-64 overflow-y-auto rounded-lg border border-border-strong bg-surface-floating p-1 shadow-[var(--shadow-lg)]"
        >
          {state === "loading" ? (
            <p role="status" className="flex min-h-14 items-center gap-2 px-3 text-sm text-foreground/70">
              <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Searching New York City…
            </p>
          ) : state === "error" ? (
            <p role="status" className="px-3 py-4 text-sm text-foreground/75">
              Search unavailable. Try again.
            </p>
          ) : results.length === 0 ? (
            <p role="status" className="px-3 py-4 text-sm text-foreground/65">
              No NYC locations found
            </p>
          ) : results.map((result) => (
            <button
              key={result.id}
              type="button"
              role="option"
              aria-selected="false"
              aria-label={`${result.name}, ${result.kind === "station" ? "Station" : "Place"}, ${result.description}`}
              onClick={() => selectResult(result)}
              className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
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

      <form role="search" onSubmit={submitFirstResult}>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-state-selected" aria-hidden="true" />
        <input
          type="search"
          role="combobox"
          aria-label="Search location or station"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
          placeholder="Search location or station"
          autoComplete="off"
          className="min-h-12 w-full rounded-lg border border-transparent bg-surface-floating py-3 pl-12 pr-4 text-sm font-semibold text-foreground shadow-[var(--shadow-lg)] outline-none placeholder:font-medium placeholder:text-foreground/65 hover:bg-surface-elevated focus:border-focus focus:bg-surface-floating"
        />
      </form>
    </div>
  );
}
