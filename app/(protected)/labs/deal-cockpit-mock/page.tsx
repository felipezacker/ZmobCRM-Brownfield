import { notFound, redirect } from 'next/navigation';
import DealCockpitMockClient from './DealCockpitMockClient';
import DealCockpitClient from '@/features/deals/cockpit/DealCockpitClient';

/**
 * Cockpit mock (high-density, everything in one place)
 * Access at: /labs/deal-cockpit-mock
 */
export default async function DealCockpitMockPage({
  searchParams,
}: {
  searchParams?: Promise<{ dealId?: string; mode?: string }>;
}) {
  const params = await searchParams;

  // Dev-only. Em dev, habilitado por padrão.
  const envFlag = process.env.ALLOW_UI_MOCKS_ROUTE;
  const isEnabled =
    process.env.NODE_ENV === 'development' &&
    (envFlag == null || String(envFlag).toLowerCase() === 'true');

  if (!isEnabled) {
    notFound();
  }

  const mode = (params?.mode ?? '').toLowerCase();

  // Default: versão "real" (plugada no CRMContext + Supabase hooks + chat real).
  // Fallback: ?mode=mock mantém o UI mock original.
  if (mode === 'mock') {
    return <DealCockpitMockClient />;
  }

  // Se já temos um dealId, leva para a rota canônica do cockpit.
  if (params?.dealId) {
    redirect(`/deals/${params.dealId}/cockpit`);
  }

  return <DealCockpitClient dealId={params?.dealId} />;
}
