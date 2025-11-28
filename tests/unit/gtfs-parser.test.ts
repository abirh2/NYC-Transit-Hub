/**
 * GTFS Parser Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { 
  loadStops, 
  loadRoutes, 
  getStations, 
  searchStations,
  getStationById,
  getRouteById,
  getRouteColor 
} from '@/lib/gtfs/parser';

describe('GTFS Parser', () => {
  describe('loadStops', () => {
    it('loads stops from GTFS file', () => {
      const stops = loadStops();
      expect(stops.length).toBeGreaterThan(0);
    });

    it('parses stop data correctly', () => {
      const stops = loadStops();
      const stop = stops[0];
      
      expect(stop).toHaveProperty('stopId');
      expect(stop).toHaveProperty('stopName');
      expect(stop).toHaveProperty('stopLat');
      expect(stop).toHaveProperty('stopLon');
      expect(typeof stop.stopLat).toBe('number');
      expect(typeof stop.stopLon).toBe('number');
    });
  });

  describe('loadRoutes', () => {
    it('loads routes from GTFS file', () => {
      const routes = loadRoutes();
      expect(routes.length).toBeGreaterThan(0);
    });

    it('includes all major subway lines', () => {
      const routes = loadRoutes();
      const routeIds = routes.map(r => r.routeId);
      
      // Check for major lines
      expect(routeIds).toContain('A');
      expect(routeIds).toContain('1');
      expect(routeIds).toContain('L');
      expect(routeIds).toContain('G');
      expect(routeIds).toContain('7');
    });

    it('parses route colors correctly', () => {
      const routes = loadRoutes();
      const aLine = routes.find(r => r.routeId === 'A');
      
      expect(aLine).toBeDefined();
      expect(aLine?.routeColor).toMatch(/^[0-9A-Fa-f]{6}$/);
    });
  });

  describe('getStations', () => {
    it('returns only parent stations (not platforms)', () => {
      const stations = getStations();
      
      // Should have stations
      expect(stations.size).toBeGreaterThan(0);
      
      // Check that we have Times Square
      const hasTimesSquare = Array.from(stations.values()).some(
        s => s.name.includes('Times Sq')
      );
      expect(hasTimesSquare).toBe(true);
    });

    it('links platforms to parent stations', () => {
      const stations = getStations();
      const stationArray = Array.from(stations.values());
      
      // At least some stations should have platforms
      const withPlatforms = stationArray.filter(
        s => s.platforms.north || s.platforms.south
      );
      expect(withPlatforms.length).toBeGreaterThan(0);
    });
  });

  describe('searchStations', () => {
    it('finds stations by name', () => {
      const results = searchStations('times');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(s => 
        s.name.toLowerCase().includes('times')
      )).toBe(true);
    });

    it('respects limit parameter', () => {
      const results = searchStations('st', 5);
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('returns empty array for no matches', () => {
      const results = searchStations('xyznonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('getStationById', () => {
    it('returns station by exact ID', () => {
      const stations = getStations();
      const firstStation = Array.from(stations.values())[0];
      
      const found = getStationById(firstStation.id);
      expect(found).toEqual(firstStation);
    });

    it('returns station from platform ID', () => {
      const stations = getStations();
      const stationWithPlatform = Array.from(stations.values()).find(
        s => s.platforms.north
      );
      
      if (stationWithPlatform?.platforms.north) {
        const found = getStationById(stationWithPlatform.platforms.north);
        expect(found?.id).toBe(stationWithPlatform.id);
      }
    });

    it('returns null for invalid ID', () => {
      const found = getStationById('INVALID_ID_123');
      expect(found).toBeNull();
    });
  });

  describe('getRouteById', () => {
    it('returns route by ID', () => {
      const route = getRouteById('A');
      
      expect(route).toBeDefined();
      expect(route?.routeId).toBe('A');
      expect(route?.routeShortName).toBe('A');
    });

    it('returns null for invalid route', () => {
      const route = getRouteById('INVALID');
      expect(route).toBeNull();
    });
  });

  describe('getRouteColor', () => {
    it('returns color with hash prefix', () => {
      const color = getRouteColor('A');
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('returns default gray for invalid route', () => {
      const color = getRouteColor('INVALID');
      expect(color).toBe('#808183');
    });
  });
});

