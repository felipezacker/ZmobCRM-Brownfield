import { describe, it, expect } from 'vitest';
import { isBackdropClick, isEscapeKey } from '../overlay';

describe('a11y module', () => {
  it('exports overlay helpers', async () => {
    const mod = await import('../overlay');
    expect(mod.isBackdropClick).toBeDefined();
    expect(mod.isEscapeKey).toBeDefined();
  });

  describe('isBackdropClick', () => {
    it('returns true when eventTarget equals currentTarget', () => {
      const el = {} as EventTarget;
      expect(isBackdropClick(el, el)).toBe(true);
    });

    it('returns false when targets differ', () => {
      const a = {} as EventTarget;
      const b = {} as EventTarget;
      expect(isBackdropClick(a, b)).toBe(false);
    });

    it('returns false when either target is null', () => {
      const el = {} as EventTarget;
      expect(isBackdropClick(null, el)).toBe(false);
      expect(isBackdropClick(el, null)).toBe(false);
      expect(isBackdropClick(null, null)).toBe(false);
    });
  });

  describe('isEscapeKey', () => {
    it('returns true for Escape key', () => {
      expect(isEscapeKey({ key: 'Escape' } as KeyboardEvent)).toBe(true);
    });

    it('returns true for legacy Esc key', () => {
      expect(isEscapeKey({ key: 'Esc' } as KeyboardEvent)).toBe(true);
    });

    it('returns false for other keys', () => {
      expect(isEscapeKey({ key: 'Enter' } as KeyboardEvent)).toBe(false);
    });
  });
});
