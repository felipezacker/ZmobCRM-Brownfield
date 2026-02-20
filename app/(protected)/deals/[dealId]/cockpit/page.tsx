import DealCockpitClient from '@/features/deals/cockpit/DealCockpitClient';

/**
 * Cockpit oficial — UI V2 com AI, notas, scripts e multi-tab.
 * URL: /deals/[dealId]/cockpit
 */
export default async function DealCockpitPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  return <DealCockpitClient dealId={dealId} />;
}
