import { describe, it, expect, vi } from 'vitest';
import { isValidUUID, sanitizeUUID, sanitizeUUIDs, requireUUID, sanitizeText, sanitizeNumber } from '../utils';

describe('supabase/utils', () => {
  describe('isValidUUID', () => {
    it('accepts valid UUID v4', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });
    it('rejects empty string', () => {
      expect(isValidUUID('')).toBe(false);
    });
    it('rejects non-string', () => {
      expect(isValidUUID(null)).toBe(false);
      expect(isValidUUID(undefined)).toBe(false);
      expect(isValidUUID(42)).toBe(false);
    });
    it('rejects invalid format', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
    });
  });

  describe('sanitizeUUID', () => {
    it('returns valid UUID as-is', () => {
      expect(sanitizeUUID('123e4567-e89b-12d3-a456-426614174000')).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
    it('returns null for empty', () => {
      expect(sanitizeUUID('')).toBeNull();
      expect(sanitizeUUID(null)).toBeNull();
      expect(sanitizeUUID(undefined)).toBeNull();
      expect(sanitizeUUID('  ')).toBeNull();
    });
    it('returns null and warns for invalid', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(sanitizeUUID('bad')).toBeNull();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('sanitizeUUIDs', () => {
    it('sanitizes specified fields', () => {
      const obj = { contactId: '', boardId: '123e4567-e89b-12d3-a456-426614174000', name: 'Test' };
      const result = sanitizeUUIDs(obj, ['contactId', 'boardId']);
      expect(result.contactId).toBeNull();
      expect(result.boardId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.name).toBe('Test');
    });
  });

  describe('requireUUID', () => {
    it('returns valid UUID', () => {
      expect(requireUUID('123e4567-e89b-12d3-a456-426614174000', 'Board')).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
    it('throws for invalid', () => {
      expect(() => requireUUID('', 'Board')).toThrow('Board é obrigatório');
    });
  });

  describe('sanitizeText', () => {
    it('trims whitespace', () => {
      expect(sanitizeText('  hello  ')).toBe('hello');
    });
    it('returns null for empty', () => {
      expect(sanitizeText('')).toBeNull();
      expect(sanitizeText('   ')).toBeNull();
      expect(sanitizeText(null)).toBeNull();
    });
  });

  describe('sanitizeNumber', () => {
    it('returns number as-is', () => {
      expect(sanitizeNumber(42)).toBe(42);
    });
    it('parses string number', () => {
      expect(sanitizeNumber('42')).toBe(42);
    });
    it('returns default for NaN', () => {
      expect(sanitizeNumber(NaN)).toBe(0);
      expect(sanitizeNumber('abc')).toBe(0);
    });
    it('uses custom default', () => {
      expect(sanitizeNumber(NaN, 100)).toBe(100);
    });
    it('handles boolean', () => {
      expect(sanitizeNumber(true)).toBe(0);
    });
  });

  describe('sanitizeUUIDs edge cases', () => {
    it('leaves non-uuid fields untouched', () => {
      const obj = { name: 'Test', contactId: '' };
      const result = sanitizeUUIDs(obj, ['contactId']);
      expect(result.name).toBe('Test');
    });
    it('handles undefined fields gracefully', () => {
      const obj = { a: undefined } as any;
      const result = sanitizeUUIDs(obj, ['a']);
      expect(result.a).toBeUndefined();
    });
  });

  describe('requireUUID edge cases', () => {
    it('throws with field name in message', () => {
      expect(() => requireUUID(null, 'Deal ID')).toThrow('Deal ID');
    });
  });
});
