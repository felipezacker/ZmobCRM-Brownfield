'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/PageLoader'

const InstructionsPageV2 = dynamic(
    () => import('@/features/instructions/InstructionsPageV2').then(m => ({ default: m.InstructionsPageV2 })),
    { loading: () => <PageLoader />, ssr: false }
)

export default function Instructions() {
    return <InstructionsPageV2 />
}
