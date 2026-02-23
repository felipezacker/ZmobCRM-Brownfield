import { describe, it, expect, vi } from 'vitest';

// Mock useRealtimeSync before importing presets
vi.mock('../useRealtimeSync', () => ({
  useRealtimeSync: vi.fn(),
}));

import { getPresetTables, REALTIME_PRESETS } from '../presets';

describe('realtime presets', () => {
  describe('REALTIME_PRESETS', () => {
    it('has contacts preset', () => {
      expect(REALTIME_PRESETS.contacts).toEqual(['contacts']);
    });
    it('has kanban preset with deals and stages', () => {
      expect(REALTIME_PRESETS.kanban).toEqual(['deals', 'board_stages']);
    });
    it('has all preset', () => {
      expect(REALTIME_PRESETS.all).toContain('deals');
      expect(REALTIME_PRESETS.all).toContain('contacts');
    });
  });

  describe('getPresetTables', () => {
    it('returns tables for contacts', () => {
      expect(getPresetTables('contacts')).toEqual(['contacts']);
    });
    it('returns tables for activities', () => {
      expect(getPresetTables('activities')).toEqual(['activities', 'deals']);
    });
    it('returns tables for boards', () => {
      expect(getPresetTables('boards')).toEqual(['boards', 'board_stages']);
    });
  });
});
