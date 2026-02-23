'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/PageLoader'
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary'

const ContactsPage = dynamic(
    () => import('@/features/contacts/ContactsPage').then(m => ({ default: m.ContactsPage })),
    { loading: () => <PageLoader />, ssr: false }
)

/**
 * Componente React `Contacts`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
export default function Contacts() {
    return (
        <ErrorBoundary>
            <ContactsPage />
        </ErrorBoundary>
    )
}
