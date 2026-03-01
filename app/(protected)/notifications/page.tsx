'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/PageLoader'
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary'

const NotificationsPage = dynamic(
    () => import('@/features/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })),
    { loading: () => <PageLoader />, ssr: false }
)

export default function Notifications() {
    return (
        <ErrorBoundary>
            <NotificationsPage />
        </ErrorBoundary>
    )
}
