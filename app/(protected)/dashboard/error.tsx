'use client'

import { ErrorBoundaryFallback } from '@/components/ui/ErrorBoundaryFallback'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorBoundaryFallback error={error} reset={reset} sectionName="Dashboard" />
}
