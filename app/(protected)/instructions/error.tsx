'use client'

import { ErrorBoundaryFallback } from '@/components/ui/ErrorBoundaryFallback'

export default function InstructionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorBoundaryFallback error={error} reset={reset} sectionName="Instrucoes" />
}
