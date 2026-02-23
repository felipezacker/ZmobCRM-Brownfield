import { describe, it, expect } from 'vitest';
import { getResponsiveMode, getCurrentResponsiveMode, APP_BREAKPOINTS } from '../responsive';

describe('responsive', () => {
  describe('APP_BREAKPOINTS', () => {
    it('md is 768', () => {
      expect(APP_BREAKPOINTS.md).toBe(768);
    });
    it('lg is 1280', () => {
      expect(APP_BREAKPOINTS.lg).toBe(1280);
    });
  });

  describe('getResponsiveMode', () => {
    it('returns mobile for < 768', () => {
      expect(getResponsiveMode(320)).toBe('mobile');
      expect(getResponsiveMode(767)).toBe('mobile');
    });
    it('returns tablet for 768-1279', () => {
      expect(getResponsiveMode(768)).toBe('tablet');
      expect(getResponsiveMode(1024)).toBe('tablet');
      expect(getResponsiveMode(1279)).toBe('tablet');
    });
    it('returns desktop for >= 1280', () => {
      expect(getResponsiveMode(1280)).toBe('desktop');
      expect(getResponsiveMode(1920)).toBe('desktop');
    });
  });

  describe('getCurrentResponsiveMode', () => {
    it('returns a valid mode', () => {
      const mode = getCurrentResponsiveMode();
      expect(['mobile', 'tablet', 'desktop']).toContain(mode);
    });
  });
});
