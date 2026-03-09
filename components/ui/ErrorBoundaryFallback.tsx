'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Bug } from 'lucide-react'

interface ErrorBoundaryFallbackProps {
  error: Error & { digest?: string }
  reset: () => void
  /** Human-readable name of the section that failed (e.g. "Dashboard", "Contatos") */
  sectionName?: string
}

/**
 * Shared fallback UI for Next.js route-segment error boundaries.
 *
 * Each `error.tsx` file renders this component so branding and UX
 * stay consistent across all 18 protected routes.
 *
 * Features:
 * - ZmobCRM branding (logo text + colors)
 * - Error logging via console.error
 * - Retry button (calls Next.js reset())
 * - "Report problem" mailto link
 */
export function ErrorBoundaryFallback({
  error,
  reset,
  sectionName = 'esta pagina',
}: ErrorBoundaryFallbackProps) {
  useEffect(() => {
    console.error(`[ErrorBoundary] ${sectionName}:`, error)
  }, [error, sectionName])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Branding */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/20">
          <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" aria-hidden="true" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground font-display">
            Algo deu errado
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ocorreu um erro inesperado em <strong>{sectionName}</strong>.
            Voce pode tentar novamente ou reportar o problema.
          </p>
        </div>

        {/* Error digest (useful for support) */}
        {error.digest && (
          <p className="rounded-lg bg-muted px-3 py-2 text-xs font-mono text-muted-foreground">
            Codigo: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible-ring"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </button>

          <a
            href={`mailto:suporte@zmobcrm.com?subject=${encodeURIComponent(`Erro em ${sectionName}`)}&body=${encodeURIComponent(`Erro: ${error.message}\nDigest: ${error.digest || 'N/A'}\nURL: ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible-ring"
          >
            <Bug className="h-4 w-4" aria-hidden="true" />
            Reportar problema
          </a>
        </div>

        {/* Subtle branding */}
        <p className="text-xs text-muted-foreground/60">
          ZmobCRM
        </p>
      </div>
    </div>
  )
}
