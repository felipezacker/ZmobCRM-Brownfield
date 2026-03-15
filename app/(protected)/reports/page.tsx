'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/PageLoader'
import { PermissionGate } from '@/components/auth/PermissionGate'

const ReportsPage = dynamic(
    () => import('@/features/reports/ReportsPage'),
    { loading: () => <PageLoader />, ssr: false }
)

/**
 * Componente React `Reports`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
export default function Reports() {
    return (
        <PermissionGate permission="ver_relatorios">
            <ReportsPage />
        </PermissionGate>
    )
}
