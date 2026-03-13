import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shouldProcessInsert } from '../realtimeConfig';

describe('shouldProcessInsert', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true on first call for a new key (AC6.2 baseline)', () => {
    const result = shouldProcessInsert('test-key-unique-' + Date.now());
    expect(result).toBe(true);
  });

  it('returns false on second call with same key within TTL (AC6.2)', () => {
    const key = 'deals-deal1-2026-01-01';
    shouldProcessInsert(key);
    const result = shouldProcessInsert(key);
    expect(result).toBe(false);
  });

  it('returns true after TTL expires (AC6.3)', () => {
    const key = 'deals-deal2-2026-01-01';
    shouldProcessInsert(key);

    // Advance past TTL (5000ms)
    vi.advanceTimersByTime(5001);

    const result = shouldProcessInsert(key);
    expect(result).toBe(true);
  });

  it('returns true for distinct keys (each first call)', () => {
    const key1 = 'deals-deal3-2026-01-01';
    const key2 = 'contacts-contact1-2026-01-01';
    const key3 = 'boards-board1-2026-01-01';

    expect(shouldProcessInsert(key1)).toBe(true);
    expect(shouldProcessInsert(key2)).toBe(true);
    expect(shouldProcessInsert(key3)).toBe(true);
  });

  it('cleans up expired entries on next call', () => {
    const keyExpired = 'deals-expired-2026-01-01';
    const keyNew = 'deals-new-2026-01-01';

    shouldProcessInsert(keyExpired);

    // Advance past TTL
    vi.advanceTimersByTime(5001);

    // This call should cleanup keyExpired and process keyNew
    expect(shouldProcessInsert(keyNew)).toBe(true);

    // keyExpired was cleaned up, so calling it again should return true
    expect(shouldProcessInsert(keyExpired)).toBe(true);
  });

  it('blocks duplicates within TTL window even after other keys processed', () => {
    const key1 = 'deals-dup-test-2026-01-01';
    const key2 = 'contacts-other-2026-01-01';

    shouldProcessInsert(key1);
    shouldProcessInsert(key2);

    // key1 should still be blocked
    expect(shouldProcessInsert(key1)).toBe(false);
    // key2 should also be blocked
    expect(shouldProcessInsert(key2)).toBe(false);
  });
});
