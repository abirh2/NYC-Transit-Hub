import { describe, it, expect } from 'vitest';
import {
  getRouteGroupId,
  getBusRouteColor,
  isSelectBusService,
  isExpressRoute,
  getRouteGroupName,
  sortRoutes,
  groupRoutesByPrefix,
  searchBusRoutes,
  getAllKnownRoutes,
  getKnownRouteCount,
} from '@/lib/gtfs/bus-routes';

describe('bus-routes utilities', () => {
  describe('getRouteGroupId', () => {
    it('identifies Manhattan routes', () => {
      expect(getRouteGroupId('M15')).toBe('M');
      expect(getRouteGroupId('M1')).toBe('M');
      expect(getRouteGroupId('M100')).toBe('M');
    });

    it('identifies Brooklyn routes', () => {
      expect(getRouteGroupId('B44')).toBe('B');
      expect(getRouteGroupId('B1')).toBe('B');
    });

    it('identifies Queens routes', () => {
      expect(getRouteGroupId('Q32')).toBe('Q');
      expect(getRouteGroupId('Q70+')).toBe('Q');
    });

    it('identifies Bronx routes', () => {
      expect(getRouteGroupId('BX12')).toBe('BX');
      expect(getRouteGroupId('BX41+')).toBe('BX');
    });

    it('identifies Staten Island routes', () => {
      expect(getRouteGroupId('S79+')).toBe('S');
      expect(getRouteGroupId('S40')).toBe('S');
    });

    it('identifies express routes', () => {
      expect(getRouteGroupId('BXM1')).toBe('BXM');
      expect(getRouteGroupId('QM2')).toBe('QM');
      expect(getRouteGroupId('SIM1C')).toBe('SIM');
      expect(getRouteGroupId('BM3')).toBe('BM');
      expect(getRouteGroupId('X27')).toBe('X');
    });

    it('returns null for unknown routes', () => {
      expect(getRouteGroupId('UNKNOWN')).toBeNull();
      expect(getRouteGroupId('123')).toBeNull();
    });
  });

  describe('isSelectBusService', () => {
    it('identifies SBS routes by + suffix', () => {
      expect(isSelectBusService('M15+')).toBe(true);
      expect(isSelectBusService('B44+')).toBe(true);
      expect(isSelectBusService('S79+')).toBe(true);
    });

    it('returns false for regular routes', () => {
      expect(isSelectBusService('M15')).toBe(false);
      expect(isSelectBusService('B44')).toBe(false);
    });
  });

  describe('isExpressRoute', () => {
    it('identifies express routes', () => {
      expect(isExpressRoute('BXM1')).toBe(true);
      expect(isExpressRoute('QM2')).toBe(true);
      expect(isExpressRoute('SIM1C')).toBe(true);
      expect(isExpressRoute('BM3')).toBe(true);
      expect(isExpressRoute('X27')).toBe(true);
    });

    it('returns false for local routes', () => {
      expect(isExpressRoute('M15')).toBe(false);
      expect(isExpressRoute('B44')).toBe(false);
      expect(isExpressRoute('BX12')).toBe(false);
    });
  });

  describe('getBusRouteColor', () => {
    it('returns correct colors for different boroughs', () => {
      // Manhattan - blue
      expect(getBusRouteColor('M15')).toBe('#0039A6');
      // Brooklyn - green
      expect(getBusRouteColor('B44')).toBe('#00933C');
      // Queens - yellow
      expect(getBusRouteColor('Q32')).toBe('#FCCC0A');
      // Bronx - orange
      expect(getBusRouteColor('BX12')).toBe('#FF6319');
      // Staten Island - gray
      expect(getBusRouteColor('S40')).toBe('#808183');
    });

    it('returns SBS color for Select Bus Service routes', () => {
      expect(getBusRouteColor('M15+')).toBe('#B933AD');
      expect(getBusRouteColor('B44+')).toBe('#B933AD');
    });

    it('returns express color for express routes', () => {
      expect(getBusRouteColor('BXM1')).toBe('#6E3219');
      expect(getBusRouteColor('X27')).toBe('#6E3219');
    });
  });

  describe('getRouteGroupName', () => {
    it('returns correct group names', () => {
      expect(getRouteGroupName('M15')).toBe('Manhattan Local');
      expect(getRouteGroupName('B44')).toBe('Brooklyn Local');
      expect(getRouteGroupName('BXM1')).toBe('Bronx Express');
    });
  });

  describe('sortRoutes', () => {
    it('sorts routes naturally', () => {
      const routes = ['M10', 'M1', 'M2', 'M100', 'M15'];
      const sorted = sortRoutes(routes);
      expect(sorted).toEqual(['M1', 'M2', 'M10', 'M15', 'M100']);
    });

    it('groups by prefix first', () => {
      const routes = ['B1', 'M1', 'Q1'];
      const sorted = sortRoutes(routes);
      expect(sorted).toEqual(['B1', 'M1', 'Q1']);
    });

    it('puts SBS routes after regular routes of same number', () => {
      const routes = ['M15+', 'M15', 'M14A+'];
      const sorted = sortRoutes(routes);
      expect(sorted).toEqual(['M14A+', 'M15', 'M15+']);
    });
  });

  describe('groupRoutesByPrefix', () => {
    it('groups routes by their prefix', () => {
      const routes = ['M1', 'M15', 'B44', 'Q32'];
      const grouped = groupRoutesByPrefix(routes);
      
      expect(grouped.M).toContain('M1');
      expect(grouped.M).toContain('M15');
      expect(grouped.B).toContain('B44');
      expect(grouped.Q).toContain('Q32');
    });
  });

  describe('searchBusRoutes', () => {
    it('finds routes matching query', () => {
      const routes = ['M1', 'M15', 'M15+', 'B15', 'Q15'];
      const results = searchBusRoutes('15', routes);
      
      expect(results).toContain('M15');
      expect(results).toContain('M15+');
      expect(results).toContain('B15');
      expect(results).toContain('Q15');
    });

    it('is case insensitive', () => {
      const routes = ['M15', 'B44'];
      const results = searchBusRoutes('m15', routes);
      expect(results).toContain('M15');
    });

    it('respects limit parameter', () => {
      const routes = ['M1', 'M2', 'M3', 'M4', 'M5'];
      const results = searchBusRoutes('M', routes, 3);
      expect(results.length).toBe(3);
    });
  });

  describe('getAllKnownRoutes', () => {
    it('returns all known routes', () => {
      const routes = getAllKnownRoutes();
      expect(routes.length).toBeGreaterThan(0);
      expect(routes).toContain('M15');
      expect(routes).toContain('B44');
    });
  });

  describe('getKnownRouteCount', () => {
    it('returns total count of known routes', () => {
      const count = getKnownRouteCount();
      expect(count).toBeGreaterThan(200); // We have ~288 routes in the data
    });
  });
});

