/**
 * MTA Alerts Parser Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { filterAlerts } from '@/lib/mta/alerts';
import type { ServiceAlert } from '@/types/mta';

// Mock alerts for testing
const mockAlerts: ServiceAlert[] = [
  {
    id: 'alert-1',
    affectedRoutes: ['A', 'C', 'E'],
    affectedStops: ['A15'],
    headerText: 'Delays on A/C/E due to signal problems',
    descriptionText: 'Expect delays of up to 15 minutes',
    severity: 'WARNING',
    alertType: 'DELAY',
    activePeriodStart: new Date('2024-01-01T00:00:00Z'),
    activePeriodEnd: new Date('2099-12-31T23:59:59Z'), // Future date
  },
  {
    id: 'alert-2',
    affectedRoutes: ['F'],
    affectedStops: [],
    headerText: 'F train running on local track',
    descriptionText: null,
    severity: 'INFO',
    alertType: 'SERVICE_CHANGE',
    activePeriodStart: new Date('2024-01-01T00:00:00Z'),
    activePeriodEnd: new Date('2020-01-01T00:00:00Z'), // Past date (expired)
  },
  {
    id: 'alert-3',
    affectedRoutes: ['L'],
    affectedStops: ['L01', 'L02'],
    headerText: 'No L train service between stations',
    descriptionText: 'Use shuttle bus',
    severity: 'SEVERE',
    alertType: 'STATION_CLOSURE',
    activePeriodStart: new Date('2024-01-01T00:00:00Z'),
    activePeriodEnd: null, // No end date (ongoing)
  },
];

describe('MTA Alerts', () => {
  describe('filterAlerts', () => {
    it('returns all alerts when no filters applied', () => {
      const result = filterAlerts(mockAlerts);
      expect(result).toHaveLength(3);
    });

    it('filters by route ID', () => {
      const result = filterAlerts(mockAlerts, { routeId: 'A' });
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('alert-1');
    });

    it('filters by severity', () => {
      const result = filterAlerts(mockAlerts, { severity: 'SEVERE' });
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('alert-3');
    });

    it('filters active alerts only', () => {
      const result = filterAlerts(mockAlerts, { activeOnly: true });
      
      // alert-2 is expired, so should be excluded
      expect(result).toHaveLength(2);
      expect(result.map(a => a.id)).not.toContain('alert-2');
    });

    it('includes alerts with no end date as active', () => {
      const result = filterAlerts(mockAlerts, { activeOnly: true });
      
      // alert-3 has no end date, should be included
      expect(result.map(a => a.id)).toContain('alert-3');
    });

    it('combines multiple filters', () => {
      const result = filterAlerts(mockAlerts, { 
        routeId: 'A',
        activeOnly: true 
      });
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('alert-1');
    });

    it('returns empty array when no matches', () => {
      const result = filterAlerts(mockAlerts, { routeId: 'Z' });
      expect(result).toEqual([]);
    });
  });
});

