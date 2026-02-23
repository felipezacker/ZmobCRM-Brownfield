import { describe, it, expect } from 'vitest';

describe('a11y module', () => {
  it('exports overlay helpers', async () => {
    const mod = await import('../overlay');
    expect(mod.isBackdropClick).toBeDefined();
    expect(mod.isEscapeKey).toBeDefined();
  });
});
