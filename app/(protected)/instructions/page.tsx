'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/PageLoader'

const InstructionsPage = dynamic(
    () => import('@/features/instructions/InstructionsPage').then(m => ({ default: m.InstructionsPage })),
    { loading: () => <PageLoader />, ssr: false }
)

export default function Instructions() {
    return <InstructionsPage />
}
