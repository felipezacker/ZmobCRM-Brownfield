'use client'

import { ErrorBoundaryFallback } from '@/components/ui/ErrorBoundaryFallback'

/**
 * Root-level error boundary for pages outside the (protected) route group.
 *
 * Catches runtime errors in non-protected routes (login, roadmap, join, etc.)
 * that would otherwise fall through to global-error.tsx (which renders outside
 * the root layout without Tailwind).
 *
 * Each protected route already has its own error.tsx using ErrorBoundaryFallback.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorBoundaryFallback error={error} reset={reset} sectionName="esta pagina" />
}
