import { describe, it, expect } from 'vitest';
import {
  getLirrBranchIds,
  getLirrBranch,
  getAllLirrBranches,
  getLirrBranchName,
  getLirrBranchColor,
  getMnrLineIds,
  getMnrLine,
  getAllMnrLines,
  getMnrLineName,
  getMnrLineColor,
  getRailBranch,
  getRailBranchName,
  getRailBranchColor,
  getAllRailBranches,
} from '@/lib/gtfs/rail-stations';

describe('rail-stations utilities', () => {
  describe('LIRR functions', () => {
    it('getLirrBranchIds returns all branch IDs', () => {
      const ids = getLirrBranchIds();
      expect(ids.length).toBeGreaterThan(0);
      expect(ids).toContain('1'); // Babylon
      expect(ids).toContain('9'); // Port Washington
    });

    it('getLirrBranch returns branch info', () => {
      const babylon = getLirrBranch('1');
      expect(babylon).not.toBeNull();
      expect(babylon?.name).toBe('Babylon');
      expect(babylon?.color).toBeDefined();
    });

    it('getLirrBranch returns null for unknown branch', () => {
      const unknown = getLirrBranch('999');
      expect(unknown).toBeNull();
    });

    it('getAllLirrBranches returns all branches', () => {
      const branches = getAllLirrBranches();
      expect(branches.length).toBeGreaterThan(0);
      expect(branches.some(b => b.name === 'Babylon')).toBe(true);
      expect(branches.some(b => b.name === 'Port Washington')).toBe(true);
    });

    it('getLirrBranchName returns correct name', () => {
      expect(getLirrBranchName('1')).toBe('Babylon');
      expect(getLirrBranchName('9')).toBe('Port Washington');
    });

    it('getLirrBranchName returns fallback for unknown', () => {
      expect(getLirrBranchName('999')).toBe('Branch 999');
    });

    it('getLirrBranchColor returns correct color', () => {
      const color = getLirrBranchColor('1');
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('Metro-North functions', () => {
    it('getMnrLineIds returns all line IDs', () => {
      const ids = getMnrLineIds();
      expect(ids.length).toBeGreaterThan(0);
      expect(ids).toContain('1'); // Hudson
      expect(ids).toContain('2'); // Harlem
      expect(ids).toContain('3'); // New Haven
    });

    it('getMnrLine returns line info', () => {
      const hudson = getMnrLine('1');
      expect(hudson).not.toBeNull();
      expect(hudson?.name).toBe('Hudson');
      expect(hudson?.color).toBeDefined();
    });

    it('getMnrLine returns null for unknown line', () => {
      const unknown = getMnrLine('999');
      expect(unknown).toBeNull();
    });

    it('getAllMnrLines returns all lines', () => {
      const lines = getAllMnrLines();
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.some(l => l.name === 'Hudson')).toBe(true);
      expect(lines.some(l => l.name === 'Harlem')).toBe(true);
    });

    it('getMnrLineName returns correct name', () => {
      expect(getMnrLineName('1')).toBe('Hudson');
      expect(getMnrLineName('2')).toBe('Harlem');
    });

    it('getMnrLineName returns fallback for unknown', () => {
      expect(getMnrLineName('999')).toBe('Line 999');
    });

    it('getMnrLineColor returns correct color', () => {
      const color = getMnrLineColor('1');
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('Generic rail functions', () => {
    it('getRailBranch returns correct branch for LIRR', () => {
      const branch = getRailBranch('1', 'lirr');
      expect(branch?.name).toBe('Babylon');
    });

    it('getRailBranch returns correct line for Metro-North', () => {
      const line = getRailBranch('1', 'metro-north');
      expect(line?.name).toBe('Hudson');
    });

    it('getRailBranch returns null for subway mode', () => {
      const result = getRailBranch('1', 'subway');
      expect(result).toBeNull();
    });

    it('getRailBranchName returns correct name for each mode', () => {
      expect(getRailBranchName('1', 'lirr')).toBe('Babylon');
      expect(getRailBranchName('1', 'metro-north')).toBe('Hudson');
    });

    it('getRailBranchColor returns correct color for each mode', () => {
      const lirrColor = getRailBranchColor('1', 'lirr');
      const mnrColor = getRailBranchColor('1', 'metro-north');
      expect(lirrColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(mnrColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      // Colors should be different for different modes with same ID
      expect(lirrColor).not.toBe(mnrColor);
    });

    it('getAllRailBranches returns branches for LIRR', () => {
      const branches = getAllRailBranches('lirr');
      expect(branches.length).toBeGreaterThan(0);
      expect(branches.some(b => b.name === 'Babylon')).toBe(true);
    });

    it('getAllRailBranches returns lines for Metro-North', () => {
      const lines = getAllRailBranches('metro-north');
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.some(l => l.name === 'Hudson')).toBe(true);
    });

    it('getAllRailBranches returns empty array for other modes', () => {
      const subway = getAllRailBranches('subway');
      const bus = getAllRailBranches('bus');
      expect(subway).toEqual([]);
      expect(bus).toEqual([]);
    });
  });
});

