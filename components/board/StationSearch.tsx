"use client";

/**
 * StationSearch Component
 * 
 * Autocomplete search for subway stations.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Input, Listbox, ListboxItem, Spinner, Card } from "@heroui/react";
import { Search, MapPin, Star } from "lucide-react";

interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance?: number;
  allPlatforms?: {
    north: string[];
    south: string[];
  };
}

interface StationSearchProps {
  /** Callback when a station is selected */
  onSelect: (stationId: string, stationName: string, allPlatforms?: { north: string[]; south: string[] }) => void;
  /** Currently selected station ID */
  selectedId?: string | null;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show the search in compact mode */
  compact?: boolean;
  /** Optional list of favorite station IDs to highlight */
  favoriteIds?: string[];
}

export function StationSearch({
  onSelect,
  selectedId,
  placeholder = "Search for a station...",
  compact = false,
  favoriteIds = [],
}: StationSearchProps) {
  const [query, setQuery] = useState("");
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedName, setSelectedName] = useState<string>("");
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch stations on query change
  const searchStations = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setStations([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/stations?search=${encodeURIComponent(searchQuery)}&limit=10`
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
  }, []);

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
      fetch(`/api/stations?id=${selectedId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data.stations.length > 0) {
            setSelectedName(data.data.stations[0].name);
          }
        })
        .catch(() => {});
    }
  }, [selectedId, selectedName]);

  const handleSelect = (station: Station) => {
    setQuery("");
    setSelectedName(station.name);
    setIsOpen(false);
    onSelect(station.id, station.name, station.allPlatforms);
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
        placeholder={selectedName || placeholder}
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
        <Card className="absolute z-50 w-full mt-1 shadow-lg max-h-64 overflow-auto">
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
                    ) : (
                      <MapPin className="h-4 w-4 text-foreground/50" />
                    )
                  }
                  description={
                    station.distance !== undefined
                      ? `${station.distance.toFixed(2)} mi away`
                      : undefined
                  }
                  className={selectedId === station.id ? "bg-primary/10" : ""}
                >
                  {station.name}
                </ListboxItem>
              ))}
            </Listbox>
          )}
        </Card>
      )}
    </div>
  );
}

