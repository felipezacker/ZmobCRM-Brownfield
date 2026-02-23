import { describe, it, expect } from 'vitest';
import { parseLimit, decodeOffsetCursor, encodeOffsetCursor } from '../cursor';

describe('cursor', () => {
  describe('parseLimit', () => {
    it('returns default for null', () => {
      expect(parseLimit(null)).toBe(50);
    });
    it('returns default for empty string', () => {
      expect(parseLimit('')).toBe(50);
    });
    it('parses valid number', () => {
      expect(parseLimit('25')).toBe(25);
    });
    it('clamps to max', () => {
      expect(parseLimit('999')).toBe(250);
    });
    it('clamps to min 1', () => {
      expect(parseLimit('0')).toBe(1);
      expect(parseLimit('-5')).toBe(1);
    });
    it('floors decimals', () => {
      expect(parseLimit('10.7')).toBe(10);
    });
    it('returns default for NaN', () => {
      expect(parseLimit('abc')).toBe(50);
    });
    it('respects custom opts', () => {
      expect(parseLimit(null, { defaultLimit: 10, max: 100 })).toBe(10);
      expect(parseLimit('200', { max: 100 })).toBe(100);
    });
  });

  describe('encodeOffsetCursor / decodeOffsetCursor', () => {
    it('round-trips offset', () => {
      const cursor = encodeOffsetCursor(42);
      expect(decodeOffsetCursor(cursor)).toBe(42);
    });
    it('returns 0 for null cursor', () => {
      expect(decodeOffsetCursor(null)).toBe(0);
    });
    it('returns 0 for invalid base64', () => {
      expect(decodeOffsetCursor('not-valid-json!!!')).toBe(0);
    });
    it('returns 0 for negative offset', () => {
      const cursor = Buffer.from(JSON.stringify({ offset: -5 }), 'utf8').toString('base64url');
      expect(decodeOffsetCursor(cursor)).toBe(0);
    });
  });
});
