"use client";

/**
 * Station Preferences Hook
 * 
 * Manages user's favorite stations with localStorage persistence.
 * Designed for future Supabase sync when authentication is added.
 */

import { useState, useEffect, useCallback, useRef } from "react";

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
function loadFromStorage(): StationPreference[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
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
 * Save favorites to localStorage
 */
function saveToStorage(favorites: StationPreference[]): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch (e) {
    console.error("Failed to save station preferences:", e);
  }
}

/**
 * Hook for managing station preferences
 */
export function useStationPreferences(): UseStationPreferencesReturn {
  // Initialize with empty array - will be populated on mount
  const [favorites, setFavorites] = useState<StationPreference[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Track if this is the initial mount
  const isInitialMount = useRef(true);

  // Load from localStorage on mount - this is a valid use case for setState in effect
  // because we need to access browser APIs that aren't available during SSR
  useEffect(() => {
    const stored = loadFromStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: loading from localStorage on mount
    setFavorites(stored);
    setIsLoaded(true);
    isInitialMount.current = false;
  }, []);

  // Save to localStorage whenever favorites change (after initial load)
  useEffect(() => {
    // Skip the initial mount and the load effect
    if (isInitialMount.current || !isLoaded) return;
    saveToStorage(favorites);
  }, [favorites, isLoaded]);

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
