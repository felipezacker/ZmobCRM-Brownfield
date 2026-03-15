'use client'
import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/PageLoader'

const CommandCenterPage = dynamic(
  () => import('@/features/command-center/CommandCenterPage'),
  { loading: () => <PageLoader />, ssr: false }
)

export default function CommandCenter() {
  return <CommandCenterPage />
}
