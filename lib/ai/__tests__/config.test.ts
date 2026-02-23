import { describe, it, expect, vi } from 'vitest';

// Mock AI SDK providers
vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn((model: string) => ({ provider: 'google', model }))),
}));
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => vi.fn((model: string) => ({ provider: 'openai', model }))),
}));
vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => vi.fn((model: string) => ({ provider: 'anthropic', model }))),
}));

import { getModel } from '../config';
import { AI_DEFAULT_MODELS, AI_DEFAULT_PROVIDER } from '../defaults';

describe('AI config', () => {
  describe('AI_DEFAULT_MODELS', () => {
    it('has google default', () => {
      expect(AI_DEFAULT_MODELS.google).toBeDefined();
    });
    it('has openai default', () => {
      expect(AI_DEFAULT_MODELS.openai).toBeDefined();
    });
    it('has anthropic default', () => {
      expect(AI_DEFAULT_MODELS.anthropic).toBeDefined();
    });
  });

  describe('AI_DEFAULT_PROVIDER', () => {
    it('is google', () => {
      expect(AI_DEFAULT_PROVIDER).toBe('google');
    });
  });

  describe('getModel', () => {
    it('throws without API key', () => {
      expect(() => getModel('google', '', '')).toThrow('API Key is missing');
    });

    it('creates google model with custom modelId', () => {
      const model = getModel('google', 'key', 'custom-model') as any;
      expect(model.provider).toBe('google');
      expect(model.model).toBe('custom-model');
    });

    it('creates google model with default when modelId empty', () => {
      const model = getModel('google', 'key', '') as any;
      expect(model.model).toBe(AI_DEFAULT_MODELS.google);
    });

    it('creates openai model', () => {
      const model = getModel('openai', 'key', '') as any;
      expect(model.model).toBe(AI_DEFAULT_MODELS.openai);
    });

    it('creates anthropic model', () => {
      const model = getModel('anthropic', 'key', '') as any;
      expect(model.model).toBe(AI_DEFAULT_MODELS.anthropic);
    });

    it('throws for unsupported provider', () => {
      expect(() => getModel('unknown' as any, 'key', '')).toThrow('not supported');
    });
  });
});
