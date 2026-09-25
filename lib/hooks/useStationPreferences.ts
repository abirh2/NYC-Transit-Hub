"use client";

/**
 * Station Preferences Hook
 * 
 * Manages user's favorite stations with platform-aware persistence.
 * Designed for future Supabase sync when authentication is added.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getPreferenceStorage } from "@/lib/platform/storage";

const STORAGE_KEY = "nyc-transit-favorites";

export interface StationPreference {
  stationId: string;
  stationName: string;
  addedAt: string;
}

export interface UseStationPreferencesReturn {
  /** The primary favorite station (first in list) */
  primaryStation: StationPreference | null;
  /** All favorite stations */
  favorites: StationPreference[];
  /** Whether favorites have been loaded from storage */
  isLoaded: boolean;
  /** Add a station to favorites */
  addFavorite: (stationId: string, stationName: string) => void;
  /** Remove a station from favorites */
  removeFavorite: (stationId: string) => void;
  /** Check if a station is in favorites */
  isFavorite: (stationId: string) => boolean;
  /** Set a station as the primary favorite (moves to first position) */
  setPrimary: (stationId: string) => void;
  /** Clear all favorites */
  clearFavorites: () => void;
}

/**
 * Load favorites from localStorage
 */
function parseStoredFavorites(stored: string | null): StationPreference[] {
  try {
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    
    // Validate each item has required fields
    return parsed.filter(
      (item): item is StationPreference =>
        item !== null &&
        typeof item === "object" &&
        typeof item.stationId === "string" &&
        typeof item.stationName === "string" &&
        typeof item.addedAt === "string"
    );
  } catch (e) {
    console.error("Failed to load station preferences:", e);
    return [];
  }
}

/**
 * Hook for managing station preferences
 */
export function useStationPreferences(): UseStationPreferencesReturn {
  const storage = getPreferenceStorage();
  const [initialValue] = useState(() => storage.getSync?.(STORAGE_KEY));
  const [favorites, setFavorites] = useState<StationPreference[]>(() =>
    parseStoredFavorites(initialValue ?? null));
  const [isLoaded, setIsLoaded] = useState(initialValue !== undefined);
  const isInitialMount = useRef(initialValue === undefined);

  useEffect(() => {
    if (storage.getSync) return;
    let active = true;
    void storage.get(STORAGE_KEY).then((stored) => {
      if (!active) return;
      setFavorites(parseStoredFavorites(stored));
      setIsLoaded(true);
      isInitialMount.current = false;
    });
    return () => { active = false; };
  }, [storage]);

  // Save to localStorage whenever favorites change (after initial load)
  useEffect(() => {
    // Skip the initial mount and the load effect
    if (isInitialMount.current || !isLoaded) return;
    void storage.set(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites, isLoaded, storage]);

  const addFavorite = useCallback((stationId: string, stationName: string) => {
    setFavorites((prev) => {
      // Don't add duplicates
      if (prev.some((f) => f.stationId === stationId)) {
        return prev;
      }
      
      return [
        ...prev,
        {
          stationId,
          stationName,
          addedAt: new Date().toISOString(),
        },
      ];
    });
  }, []);

  const removeFavorite = useCallback((stationId: string) => {
    setFavorites((prev) => prev.filter((f) => f.stationId !== stationId));
  }, []);

  const isFavorite = useCallback(
    (stationId: string) => favorites.some((f) => f.stationId === stationId),
    [favorites]
  );

  const setPrimary = useCallback((stationId: string) => {
    setFavorites((prev) => {
      const index = prev.findIndex((f) => f.stationId === stationId);
      if (index <= 0) return prev; // Already primary or not found
      
      // Move to front
      const item = prev[index];
      const newList = [...prev];
      newList.splice(index, 1);
      newList.unshift(item);
      return newList;
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  return {
    primaryStation: favorites[0] ?? null,
    favorites,
    isLoaded,
    addFavorite,
    removeFavorite,
    isFavorite,
    setPrimary,
    clearFavorites,
  };
}
