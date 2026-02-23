import { describe, it, expect } from 'vitest';
import { normalizePhoneE164, isE164, toWhatsAppPhone } from '../phone';

describe('phone', () => {
  describe('isE164', () => {
    it('validates correct E.164', () => {
      expect(isE164('+5511999990000')).toBe(true);
      expect(isE164('+14155552671')).toBe(true);
    });
    it('rejects invalid formats', () => {
      expect(isE164('5511999990000')).toBe(false); // no +
      expect(isE164('+0111')).toBe(false); // starts with 0
      expect(isE164('')).toBe(false);
      expect(isE164(null)).toBe(false);
      expect(isE164(undefined)).toBe(false);
    });
  });

  describe('normalizePhoneE164', () => {
    it('returns empty for null/undefined/empty', () => {
      expect(normalizePhoneE164(null)).toBe('');
      expect(normalizePhoneE164(undefined)).toBe('');
      expect(normalizePhoneE164('')).toBe('');
    });
    it('preserves valid E.164', () => {
      expect(normalizePhoneE164('+5511999990000')).toBe('+5511999990000');
    });
    it('normalizes Brazilian format', () => {
      const result = normalizePhoneE164('(11) 99999-0000');
      expect(result).toMatch(/^\+55/);
    });
    it('strips whitespace and formatting', () => {
      const result = normalizePhoneE164('+55 11 99999-0000');
      expect(result).toBe('+5511999990000');
    });
  });

  describe('toWhatsAppPhone', () => {
    it('returns digits without +', () => {
      const result = toWhatsAppPhone('+5511999990000');
      expect(result).toBe('5511999990000');
    });
    it('returns empty for empty input', () => {
      expect(toWhatsAppPhone(null)).toBe('');
      expect(toWhatsAppPhone('')).toBe('');
    });
  });
});
