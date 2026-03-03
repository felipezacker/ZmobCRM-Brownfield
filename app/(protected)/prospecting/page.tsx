'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/PageLoader'
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary'

const ProspectingPage = dynamic(
    () => import('@/features/prospecting/ProspectingPage').then(m => ({ default: m.ProspectingPage })),
    { loading: () => <PageLoader />, ssr: false }
)

export default function Prospecting() {
    return (
        <ErrorBoundary>
            <ProspectingPage />
        </ErrorBoundary>
    )
}
