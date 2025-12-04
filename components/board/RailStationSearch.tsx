"use client";

/**
 * RailStationSearch Component
 * 
 * Autocomplete search for LIRR and Metro-North stations.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Input, Listbox, ListboxItem, Spinner, Card } from "@heroui/react";
import { Search, MapPin, Star, Train } from "lucide-react";
import { RailBadge } from "@/components/ui/RailBadge";
import { getAllLirrBranches, getAllMnrLines } from "@/lib/gtfs/rail-stations";
import type { TransitMode } from "@/types/mta";

interface RailStation {
  id: string;
  name: string;
  type?: "terminal" | "hub";
  latitude: number;
  longitude: number;
  branches: string[];
  distance?: number;
}

interface RailStationSearchProps {
  /** Transit mode (lirr or metro-north) */
  mode: TransitMode;
  /** Callback when a station is selected */
  onSelect: (stationId: string, stationName: string) => void;
  /** Currently selected station ID */
  selectedId?: string | null;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show the search in compact mode */
  compact?: boolean;
  /** Optional list of favorite station IDs to highlight */
  favoriteIds?: string[];
}

export function RailStationSearch({
  mode,
  onSelect,
  selectedId,
  placeholder,
  compact = false,
  favoriteIds = [],
}: RailStationSearchProps) {
  const [query, setQuery] = useState("");
  const [stations, setStations] = useState<RailStation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedName, setSelectedName] = useState<string>("");
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const defaultPlaceholder = mode === "lirr" 
    ? "Search for an LIRR station..." 
    : "Search for a Metro-North station...";

  // Get branch info for displaying branch badges
  const branchInfo = mode === "lirr" ? getAllLirrBranches() : getAllMnrLines();
  const branchMap = new Map(branchInfo.map(b => [b.id, b]));

  // API endpoint based on mode
  const apiEndpoint = mode === "lirr" ? "/api/lirr/stations" : "/api/metro-north/stations";

  // Fetch stations on query change
  const searchStations = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setStations([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${apiEndpoint}?search=${encodeURIComponent(searchQuery)}&limit=10`
      );
      const data = await response.json();
      
      if (data.success) {
        setStations(data.data.stations);
      }
    } catch (error) {
      console.error("Failed to search stations:", error);
      setStations([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiEndpoint]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchStations(query);
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchStations]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load selected station name
  useEffect(() => {
    if (selectedId && !selectedName) {
      fetch(`${apiEndpoint}?id=${selectedId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data.stations.length > 0) {
            setSelectedName(data.data.stations[0].name);
          }
        })
        .catch(() => {});
    }
  }, [selectedId, selectedName, apiEndpoint]);

  // Clear selected name when mode changes
  useEffect(() => {
    setSelectedName("");
  }, [mode]);

  const handleSelect = (station: RailStation) => {
    setQuery("");
    setSelectedName(station.name);
    setIsOpen(false);
    onSelect(station.id, station.name);
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    setIsOpen(true);
  };

  const handleFocus = () => {
    if (query.trim() || stations.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        value={query}
        onValueChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={selectedName || placeholder || defaultPlaceholder}
        size={compact ? "sm" : "md"}
        startContent={<Search className="h-4 w-4 text-foreground/50" />}
        endContent={isLoading ? <Spinner size="sm" /> : null}
        classNames={{
          input: selectedName && !query ? "text-foreground" : "",
          inputWrapper: "bg-default-100",
        }}
      />

      {/* Dropdown */}
      {isOpen && (query.trim() || stations.length > 0) && (
        <Card className="absolute z-50 w-full mt-1 shadow-lg max-h-80 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Spinner size="sm" />
            </div>
          ) : stations.length === 0 ? (
            <div className="p-4 text-center text-foreground/50 text-sm">
              {query.trim() ? "No stations found" : "Start typing to search"}
            </div>
          ) : (
            <Listbox
              aria-label="Station search results"
              onAction={(key) => {
                const station = stations.find((s) => s.id === key);
                if (station) handleSelect(station);
              }}
            >
              {stations.map((station) => (
                <ListboxItem
                  key={station.id}
                  startContent={
                    favoriteIds.includes(station.id) ? (
                      <Star className="h-4 w-4 text-warning fill-warning" />
                    ) : station.type === "terminal" || station.type === "hub" ? (
                      <Train className="h-4 w-4 text-primary" />
                    ) : (
                      <MapPin className="h-4 w-4 text-foreground/50" />
                    )
                  }
                  description={
                    <div className="flex flex-wrap gap-1 mt-1">
                      {station.branches.slice(0, 3).map((branchId) => {
                        const branch = branchMap.get(branchId);
                        if (!branch) return null;
                        return (
                          <RailBadge
                            key={branchId}
                            branchId={branchId}
                            branchName={branch.name}
                            mode={mode}
                            size="xs"
                            abbreviated
                          />
                        );
                      })}
                      {station.distance !== undefined && (
                        <span className="text-xs text-foreground/50 ml-1">
                          {station.distance.toFixed(2)} mi
                        </span>
                      )}
                    </div>
                  }
                  className={selectedId === station.id ? "bg-primary/10" : ""}
                >
                  <span className="font-medium">{station.name}</span>
                  {station.type && (
                    <span className="ml-1 text-xs text-foreground/50 capitalize">
                      ({station.type})
                    </span>
                  )}
                </ListboxItem>
              ))}
            </Listbox>
          )}
        </Card>
      )}
    </div>
  );
}

