import { describe, it, expect } from 'vitest';
import { formatPriorityPtBr, priorityAriaLabelPtBr } from '../priority';

describe('priority', () => {
  describe('formatPriorityPtBr', () => {
    it('normalizes English high', () => {
      expect(formatPriorityPtBr('high')).toBe('Alta');
      expect(formatPriorityPtBr('High')).toBe('Alta');
    });
    it('normalizes English medium', () => {
      expect(formatPriorityPtBr('medium')).toBe('Média');
    });
    it('normalizes English low', () => {
      expect(formatPriorityPtBr('low')).toBe('Baixa');
    });
    it('normalizes Portuguese variants', () => {
      expect(formatPriorityPtBr('alta')).toBe('Alta');
      expect(formatPriorityPtBr('média')).toBe('Média');
      expect(formatPriorityPtBr('baixa')).toBe('Baixa');
      expect(formatPriorityPtBr('crítica')).toBe('Crítica');
    });
    it('handles critical', () => {
      expect(formatPriorityPtBr('critical')).toBe('Crítica');
    });
    it('handles null/undefined', () => {
      expect(formatPriorityPtBr(null)).toBe('');
      expect(formatPriorityPtBr(undefined)).toBe('');
    });
    it('returns original for unknown values', () => {
      expect(formatPriorityPtBr('urgent')).toBe('urgent');
    });
  });

  describe('priorityAriaLabelPtBr', () => {
    it('returns aria label', () => {
      expect(priorityAriaLabelPtBr('high')).toBe('prioridade alta');
    });
    it('returns empty for null', () => {
      expect(priorityAriaLabelPtBr(null)).toBe('');
    });
  });
});
