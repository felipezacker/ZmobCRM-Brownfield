import { describe, it, expect } from 'vitest';
import { normalizeEmail, normalizeText, normalizeUrl } from '../sanitize';

describe('sanitize', () => {
  describe('normalizeEmail', () => {
    it('lowercases and trims', () => {
      expect(normalizeEmail('  Test@Email.COM  ')).toBe('test@email.com');
    });
    it('returns null for empty/null', () => {
      expect(normalizeEmail(null)).toBeNull();
      expect(normalizeEmail('')).toBeNull();
      expect(normalizeEmail('  ')).toBeNull();
    });
  });

  describe('normalizeText', () => {
    it('trims whitespace', () => {
      expect(normalizeText('  hello  ')).toBe('hello');
    });
    it('returns null for empty', () => {
      expect(normalizeText(null)).toBeNull();
      expect(normalizeText('')).toBeNull();
    });
  });

  describe('normalizeUrl', () => {
    it('trims whitespace', () => {
      expect(normalizeUrl('  https://example.com  ')).toBe('https://example.com');
    });
    it('returns null for empty', () => {
      expect(normalizeUrl(null)).toBeNull();
    });
  });

  describe('XSS / injection inputs', () => {
    it('preserves script tags as-is (normalize functions only trim, no HTML stripping)', () => {
      // These functions are normalizers (trim/lowercase), not sanitizers.
      // XSS protection must happen at the rendering/output layer.
      expect(normalizeText("<script>alert('xss')</script>")).toBe("<script>alert('xss')</script>");
      expect(normalizeEmail("<script>alert('xss')</script>")).toBe("<script>alert('xss')</script>");
    });

    it('handles HTML entity strings', () => {
      expect(normalizeText('&lt;b&gt;bold&lt;/b&gt;')).toBe('&lt;b&gt;bold&lt;/b&gt;');
    });

    it('handles SQL injection strings', () => {
      const sqlInjection = "'; DROP TABLE users; --";
      expect(normalizeText(sqlInjection)).toBe(sqlInjection);
      expect(normalizeEmail(sqlInjection)).toBe(sqlInjection.toLowerCase());
    });

    it('handles unicode and special characters', () => {
      expect(normalizeText('  \u0000null\u0000  ')).toBe('\u0000null\u0000');
    });
  });
});
