import { describe, it, expect } from 'vitest';
import { isBackdropClick, isEscapeKey } from '../overlay';

describe('overlay helpers', () => {
  describe('isBackdropClick', () => {
    it('returns true when target === currentTarget', () => {
      const el = document.createElement('div');
      expect(isBackdropClick(el, el)).toBe(true);
    });
    it('returns false when targets differ', () => {
      const a = document.createElement('div');
      const b = document.createElement('div');
      expect(isBackdropClick(a, b)).toBe(false);
    });
    it('returns false for null', () => {
      expect(isBackdropClick(null, null)).toBe(false);
    });
  });

  describe('isEscapeKey', () => {
    it('detects Escape', () => {
      expect(isEscapeKey(new KeyboardEvent('keydown', { key: 'Escape' }))).toBe(true);
    });
    it('detects Esc (legacy)', () => {
      expect(isEscapeKey(new KeyboardEvent('keydown', { key: 'Esc' }))).toBe(true);
    });
    it('rejects other keys', () => {
      expect(isEscapeKey(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(false);
    });
  });
});
