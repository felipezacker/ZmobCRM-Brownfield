import { redirect } from 'next/navigation';

/**
 * Rota legada — redireciona para a rota canônica /deals/[dealId]/cockpit.
 */
export default async function DealCockpitV2Page({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  redirect(`/deals/${dealId}/cockpit`);
}
