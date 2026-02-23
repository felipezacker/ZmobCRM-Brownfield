import { describe, it, expect } from 'vitest';
import { slugify } from '../slugify';

describe('slugify', () => {
  it('lowercases and replaces spaces', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });
  it('removes accents via NFD', () => {
    expect(slugify('café résumé')).toBe('cafe-resume');
  });
  it('removes special characters', () => {
    expect(slugify('hello@world#2024!')).toBe('hello-world-2024');
  });
  it('trims leading/trailing hyphens', () => {
    expect(slugify('---hello---')).toBe('hello');
  });
  it('collapses multiple hyphens', () => {
    expect(slugify('a    b    c')).toBe('a-b-c');
  });
  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });
  it('handles Portuguese characters', () => {
    expect(slugify('São Paulo é ótimo')).toBe('sao-paulo-e-otimo');
  });
});
