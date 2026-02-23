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
});
