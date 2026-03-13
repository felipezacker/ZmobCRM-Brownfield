/**
 * Flush pending microtasks (queueMicrotask callbacks).
 * In Vitest with happy-dom, `await Promise.resolve()` suffices.
 */
export async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
}
