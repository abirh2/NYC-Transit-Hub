import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStationPreferences } from "@/lib/hooks/useStationPreferences";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("useStationPreferences", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("should initialize with empty favorites when localStorage is empty", () => {
    const { result } = renderHook(() => useStationPreferences());
    
    expect(result.current.favorites).toEqual([]);
    expect(result.current.primaryStation).toBeNull();
    expect(result.current.isLoaded).toBe(true);
  });

  it("should load favorites from localStorage on mount", () => {
    const storedFavorites = [
      { stationId: "A15", stationName: "West 4 St", addedAt: "2024-01-01T00:00:00Z" },
    ];
    localStorageMock.store["nyc-transit-favorites"] = JSON.stringify(storedFavorites);

    const { result } = renderHook(() => useStationPreferences());

    expect(result.current.favorites).toEqual(storedFavorites);
    expect(result.current.primaryStation).toEqual(storedFavorites[0]);
  });

  it("should add a station to favorites", () => {
    const { result } = renderHook(() => useStationPreferences());

    act(() => {
      result.current.addFavorite("A15", "West 4 St");
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].stationId).toBe("A15");
    expect(result.current.favorites[0].stationName).toBe("West 4 St");
    expect(result.current.primaryStation?.stationId).toBe("A15");
  });

  it("should not add duplicate stations", () => {
    const { result } = renderHook(() => useStationPreferences());

    act(() => {
      result.current.addFavorite("A15", "West 4 St");
      result.current.addFavorite("A15", "West 4 St");
    });

    expect(result.current.favorites).toHaveLength(1);
  });

  it("should remove a station from favorites", () => {
    const { result } = renderHook(() => useStationPreferences());

    act(() => {
      result.current.addFavorite("A15", "West 4 St");
      result.current.addFavorite("R20", "14 St-Union Sq");
    });

    expect(result.current.favorites).toHaveLength(2);

    act(() => {
      result.current.removeFavorite("A15");
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].stationId).toBe("R20");
  });

  it("should check if a station is a favorite", () => {
    const { result } = renderHook(() => useStationPreferences());

    act(() => {
      result.current.addFavorite("A15", "West 4 St");
    });

    expect(result.current.isFavorite("A15")).toBe(true);
    expect(result.current.isFavorite("R20")).toBe(false);
  });

  it("should set a station as primary", () => {
    const { result } = renderHook(() => useStationPreferences());

    act(() => {
      result.current.addFavorite("A15", "West 4 St");
      result.current.addFavorite("R20", "14 St-Union Sq");
      result.current.addFavorite("127", "Times Sq-42 St");
    });

    expect(result.current.primaryStation?.stationId).toBe("A15");

    act(() => {
      result.current.setPrimary("R20");
    });

    expect(result.current.primaryStation?.stationId).toBe("R20");
    expect(result.current.favorites[0].stationId).toBe("R20");
  });

  it("should clear all favorites", () => {
    const { result } = renderHook(() => useStationPreferences());

    act(() => {
      result.current.addFavorite("A15", "West 4 St");
      result.current.addFavorite("R20", "14 St-Union Sq");
    });

    expect(result.current.favorites).toHaveLength(2);

    act(() => {
      result.current.clearFavorites();
    });

    expect(result.current.favorites).toEqual([]);
    expect(result.current.primaryStation).toBeNull();
  });

  it("should persist changes to localStorage", () => {
    const { result } = renderHook(() => useStationPreferences());

    act(() => {
      result.current.addFavorite("A15", "West 4 St");
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "nyc-transit-favorites",
      expect.any(String)
    );

    const stored = JSON.parse(localStorageMock.store["nyc-transit-favorites"]);
    expect(stored).toHaveLength(1);
    expect(stored[0].stationId).toBe("A15");
  });

  it("should handle invalid localStorage data gracefully", () => {
    localStorageMock.store["nyc-transit-favorites"] = "invalid json";

    const { result } = renderHook(() => useStationPreferences());

    expect(result.current.favorites).toEqual([]);
    expect(result.current.isLoaded).toBe(true);
  });

  it("should filter out malformed favorites from localStorage", () => {
    const mixedData = [
      { stationId: "A15", stationName: "West 4 St", addedAt: "2024-01-01T00:00:00Z" },
      { stationId: "B20" }, // Missing stationName and addedAt
      "invalid", // Not an object
      null,
    ];
    localStorageMock.store["nyc-transit-favorites"] = JSON.stringify(mixedData);

    const { result } = renderHook(() => useStationPreferences());

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].stationId).toBe("A15");
  });
});

