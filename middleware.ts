/**
 * Next.js 15 Middleware
 *
 * Convenção oficial:
 * - Este arquivo precisa se chamar `middleware.ts|js` e ficar na raiz (ou em `src/`).
 * - Deve exportar uma função named `middleware`.
 * - Pode exportar `config.matcher` para limitar onde roda.
 *
 * Neste projeto, o Middleware é usado só para:
 * - refresh de sessão do Supabase SSR
 * - redirects de páginas protegidas para `/login`
 *
 * Importante:
 * - NÃO queremos interceptar `/api/*` aqui, porque Route Handlers já tratam auth
 *   e um redirect 307 para /login quebra clientes (ex: fetch do chat).
 */

import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Middleware de autenticação Supabase.
 *
 * @param request - Objeto da requisição.
 * @returns Response com sessão atualizada.
 */
export async function middleware(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths exceto:
         * - api (Route Handlers)
         * - _next/static, _next/image
         * - _next/data
         * - arquivos de metadata (manifest, sitemap, robots)
         * - assets (imagens)
         */
        '/((?!api|_next/static|_next/image|_next/data|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
