import Link from 'next/link'

/**
 * Custom 404 page for protected routes.
 *
 * Renders inside the (protected) layout so the sidebar/navigation
 * remain visible -- the user stays oriented within the app.
 */
export default function ProtectedNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Large 404 indicator */}
        <p className="text-7xl font-extrabold text-primary/20 font-display select-none">
          404
        </p>

        <div>
          <h1 className="text-xl font-bold text-foreground font-display">
            Pagina nao encontrada
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A pagina que voce procura nao existe ou foi movida.
          </p>
        </div>

        {/* Navigation links */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible-ring"
          >
            Ir para o Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible-ring"
          >
            Pagina inicial
          </Link>
        </div>

        {/* Subtle branding */}
        <p className="text-xs text-muted-foreground/60">
          ZmobCRM
        </p>
      </div>
    </div>
  )
}
