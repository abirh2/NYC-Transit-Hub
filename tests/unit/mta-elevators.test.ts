/**
 * MTA Elevators Parser Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { filterOutages, getOutageSummary } from '@/lib/mta/elevators';
import type { EquipmentOutage } from '@/types/mta';

// Mock outages for testing
const mockOutages: EquipmentOutage[] = [
  {
    equipmentId: 'EL001',
    stationName: 'Times Sq-42 St',
    borough: 'Manhattan',
    equipmentType: 'ELEVATOR',
    serving: 'Street to mezzanine',
    adaCompliant: true,
    isActive: false,
    outageReason: 'Repair',
    outageStartTime: new Date('2024-01-01'),
    estimatedReturn: new Date('2024-02-01'),
    trainLines: ['1', '2', '3', '7', 'N', 'Q', 'R', 'W'],
  },
  {
    equipmentId: 'ES002',
    stationName: 'Grand Central-42 St',
    borough: 'Manhattan',
    equipmentType: 'ESCALATOR',
    serving: 'Platform to mezzanine',
    adaCompliant: false,
    isActive: false,
    outageReason: 'Maintenance',
    outageStartTime: new Date('2024-01-15'),
    estimatedReturn: null,
    trainLines: ['4', '5', '6', '7'],
  },
  {
    equipmentId: 'EL003',
    stationName: 'Jay St-MetroTech',
    borough: 'Brooklyn',
    equipmentType: 'ELEVATOR',
    serving: 'Street to platform',
    adaCompliant: true,
    isActive: false,
    outageReason: 'Capital Replacement',
    outageStartTime: new Date('2024-01-10'),
    estimatedReturn: new Date('2024-06-01'),
    trainLines: ['A', 'C', 'F', 'R'],
  },
];

describe('MTA Elevators', () => {
  describe('filterOutages', () => {
    it('returns all outages when no filters applied', () => {
      const result = filterOutages(mockOutages);
      expect(result).toHaveLength(3);
    });

    it('filters by station name (partial match)', () => {
      const result = filterOutages(mockOutages, { stationName: 'times' });
      
      expect(result).toHaveLength(1);
      expect(result[0].equipmentId).toBe('EL001');
    });

    it('filters by subway line', () => {
      const result = filterOutages(mockOutages, { line: 'A' });
      
      expect(result).toHaveLength(1);
      expect(result[0].stationName).toBe('Jay St-MetroTech');
    });

    it('filters by equipment type', () => {
      const result = filterOutages(mockOutages, { equipmentType: 'ESCALATOR' });
      
      expect(result).toHaveLength(1);
      expect(result[0].equipmentType).toBe('ESCALATOR');
    });

    it('filters ADA-compliant only', () => {
      const result = filterOutages(mockOutages, { adaOnly: true });
      
      expect(result).toHaveLength(2);
      expect(result.every(o => o.adaCompliant)).toBe(true);
    });

    it('combines multiple filters', () => {
      const result = filterOutages(mockOutages, {
        equipmentType: 'ELEVATOR',
        adaOnly: true,
      });
      
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no matches', () => {
      const result = filterOutages(mockOutages, { stationName: 'nonexistent' });
      expect(result).toEqual([]);
    });
  });

  describe('getOutageSummary', () => {
    it('calculates total outages', () => {
      const summary = getOutageSummary(mockOutages);
      expect(summary.totalOutages).toBe(3);
    });

    it('counts elevator outages', () => {
      const summary = getOutageSummary(mockOutages);
      expect(summary.elevatorOutages).toBe(2);
    });

    it('counts escalator outages', () => {
      const summary = getOutageSummary(mockOutages);
      expect(summary.escalatorOutages).toBe(1);
    });

    it('counts ADA-compliant outages', () => {
      const summary = getOutageSummary(mockOutages);
      expect(summary.adaOutages).toBe(2);
    });

    it('groups by borough', () => {
      const summary = getOutageSummary(mockOutages);
      
      expect(summary.byBorough['Manhattan']).toBe(2);
      expect(summary.byBorough['Brooklyn']).toBe(1);
    });

    it('handles empty array', () => {
      const summary = getOutageSummary([]);
      
      expect(summary.totalOutages).toBe(0);
      expect(summary.elevatorOutages).toBe(0);
      expect(summary.escalatorOutages).toBe(0);
    });
  });
});

