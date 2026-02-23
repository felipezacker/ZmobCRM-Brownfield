// Setup específico para testes com DOM (React Testing Library, etc.)
// Importa matchers do jest-dom apenas quando existe `document`.

const hasDom = typeof document !== 'undefined'

if (hasDom) {
  // Alguns helpers (ex: @testing-library/user-event) esperam `window`/`navigator`
  // disponíveis na "view" atual.
  const g = globalThis as typeof globalThis & { window?: unknown; navigator?: unknown; IS_REACT_ACT_ENVIRONMENT?: boolean }

  if (typeof g.window === 'undefined') {
    g.window = globalThis
  }

  if (typeof g.navigator === 'undefined') {
    g.navigator = { userAgent: 'vitest' }
  }

  // Top-level await é suportado neste projeto (ESM). Em ambiente node puro, `hasDom` é false.
  await import('@testing-library/jest-dom/vitest')

  // Ajuda a evitar warnings do React sobre act() em alguns cenários.
  g.IS_REACT_ACT_ENVIRONMENT = true

  // Global mock for Next.js App Router navigation
  const { vi } = await import('vitest')
  vi.mock('next/navigation', () => ({
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
    redirect: vi.fn(),
    notFound: vi.fn(),
  }))
}
