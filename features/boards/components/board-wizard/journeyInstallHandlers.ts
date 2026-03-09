import { BOARD_TEMPLATES, BoardTemplateType } from '@/lib/templates/board-templates';
import { Board, BoardStage, JourneyDefinition } from '@/types';
import { fetchTemplateJourney } from '@/lib/templates/registryService';
import { OFFICIAL_JOURNEYS } from '@/lib/templates/journey-templates';
import { InstallProgress, guessWonLostStageIds } from '@/features/boards/components/board-wizard/types';

interface JourneyInstallDeps {
  includeSubscriptionRenewals: boolean;
  setIsInstalling: (v: boolean) => void;
  setInstallProgress: (p: InstallProgress | null) => void;
  setError: (e: string | null) => void;
  onCreate: (board: Omit<Board, 'id' | 'createdAt'>, order?: number) => void;
  onCreateBoardAsync?: (board: Omit<Board, 'id' | 'createdAt'>, order?: number) => Promise<Board>;
  onUpdateBoardAsync?: (id: string, updates: Partial<Board>) => Promise<void>;
  onClose: () => void;
  handleReset: () => void;
}

function buildRenewalsBoard(): JourneyDefinition['boards'][number] {
  return {
    slug: 'renewals',
    name: '6. Renovacoes (Assinatura)',
    columns: [
      { name: '180+ dias', color: 'bg-blue-500', linkedLifecycleStage: 'CUSTOMER' },
      { name: '120 dias', color: 'bg-purple-500', linkedLifecycleStage: 'CUSTOMER' },
      { name: '90 dias', color: 'bg-yellow-500', linkedLifecycleStage: 'CUSTOMER' },
      { name: '60 dias', color: 'bg-orange-500', linkedLifecycleStage: 'CUSTOMER' },
      { name: '30 dias', color: 'bg-orange-500', linkedLifecycleStage: 'CUSTOMER' },
      { name: 'Renovado (Ganho)', color: 'bg-green-500', linkedLifecycleStage: 'CUSTOMER' },
      { name: 'Cancelado (Perdido)', color: 'bg-red-500', linkedLifecycleStage: 'OTHER' },
    ],
    strategy: {
      agentPersona: { name: 'CS Renewals', role: 'Renovacoes', behavior: 'Trate renovacoes com rigor comercial.' },
      goal: { description: 'Aumentar taxa de renovacao.', kpi: 'Renewal Rate', targetValue: '90', type: 'percentage' },
      entryTrigger: 'Assinantes com data de renovacao aproximando.',
    },
  };
}

export function getJourneyForInstall(
  journeyId: string,
  includeSubscriptionRenewals: boolean
): JourneyDefinition | null {
  const base = OFFICIAL_JOURNEYS[journeyId];
  if (!base) return null;
  if (journeyId !== 'INFOPRODUCER' || !includeSubscriptionRenewals) return base;
  const renewalsBoard = buildRenewalsBoard();
  const nextBoards = [...base.boards];
  const idx = nextBoards.findIndex((b) => b.slug === 'expansion');
  nextBoards.splice(idx >= 0 ? idx + 1 : nextBoards.length, 0, renewalsBoard);
  return { ...base, boards: nextBoards };
}

export async function installCommunityJourney(templatePath: string, d: JourneyInstallDeps) {
  d.setIsInstalling(true);
  d.setInstallProgress(null);
  try {
    const journey = await fetchTemplateJourney(templatePath);
    const created: Board[] = [];
    d.setInstallProgress({ total: journey.boards.length, current: 0 });
    for (let i = 0; i < journey.boards.length; i++) {
      const bDef = journey.boards[i];
      d.setInstallProgress({ total: journey.boards.length, current: i + 1, currentBoardName: bDef.name });
      const stages: BoardStage[] = bDef.columns.map((c) => ({
        id: crypto.randomUUID(), label: c.name, color: c.color || 'bg-accent', linkedLifecycleStage: c.linkedLifecycleStage,
      }));
      const guessed = guessWonLostStageIds(stages);
      const lifecycle = bDef.columns.find((c) => c.linkedLifecycleStage)?.linkedLifecycleStage;
      const payload: Omit<Board, 'id' | 'createdAt'> = {
        name: bDef.name, description: `Parte da jornada: ${journey.boards.length > 1 ? 'Sim' : 'Nao'}`,
        linkedLifecycleStage: lifecycle, template: 'CUSTOM', stages, isDefault: false,
        wonStageId: guessed.wonStageId || undefined, lostStageId: guessed.lostStageId || undefined,
        agentPersona: bDef.strategy?.agentPersona, goal: bDef.strategy?.goal, entryTrigger: bDef.strategy?.entryTrigger,
      };
      if (d.onCreateBoardAsync) { created.push(await d.onCreateBoardAsync(payload, i)); }
      else { d.onCreate(payload, i); }
    }
    if (d.onUpdateBoardAsync && created.length > 1) {
      for (let i = 0; i < created.length - 1; i++) {
        await d.onUpdateBoardAsync(created[i].id, { nextBoardId: created[i + 1].id });
      }
    }
    d.onClose(); d.handleReset();
  } catch (err) {
    console.error('Failed to install journey:', err);
    d.setError('Erro ao instalar template da comunidade.');
  } finally {
    d.setIsInstalling(false); d.setInstallProgress(null);
  }
}

export async function installOfficialJourney(journeyId: string, d: JourneyInstallDeps) {
  if (!OFFICIAL_JOURNEYS) return;
  const journey = getJourneyForInstall(journeyId, d.includeSubscriptionRenewals);
  if (!journey) return;
  d.setIsInstalling(true);
  d.setInstallProgress({ total: journey.boards.length, current: 0 });

  const wonLostMap: Record<string, Record<string, { wonLabel?: string; lostLabel?: string; wonArchive?: boolean }>> = {
    INFOPRODUCER: {
      sales: { wonLabel: 'Matriculado (Ganho)', lostLabel: 'Nao comprou (Perdido)' },
      onboarding: { wonLabel: 'Primeiro Resultado (Ganho)' },
      cs: { wonArchive: true, lostLabel: 'Churn' },
      expansion: { wonLabel: 'Upsell Fechado (Ganho)', lostLabel: 'Perdido' },
      renewals: { wonLabel: 'Renovado (Ganho)', lostLabel: 'Cancelado (Perdido)' },
    },
    B2B_MACHINE: {
      onboarding: { wonLabel: 'Go Live' }, cs: { wonArchive: true, lostLabel: 'Churn' },
      expansion: { wonLabel: 'Upsell Fechado', lostLabel: 'Perdido' },
    },
    SIMPLE_SALES: { 'sales-simple': { wonLabel: 'Ganho', lostLabel: 'Perdido' } },
  };

  const lifecycleBySlug: Record<string, string | undefined> = {
    sdr: BOARD_TEMPLATES.PRE_SALES.linkedLifecycleStage, sales: BOARD_TEMPLATES.SALES.linkedLifecycleStage,
    onboarding: BOARD_TEMPLATES.ONBOARDING.linkedLifecycleStage, cs: BOARD_TEMPLATES.CS.linkedLifecycleStage,
    renewals: 'CUSTOMER', expansion: 'CUSTOMER', 'sales-simple': BOARD_TEMPLATES.SALES.linkedLifecycleStage,
  };

  const tplBySlug: Record<string, BoardTemplateType> = {
    sdr: 'PRE_SALES', sales: 'SALES', onboarding: 'ONBOARDING', cs: 'CS',
    renewals: 'CUSTOM', expansion: 'CUSTOM', 'sales-simple': 'SALES',
  };

  const created: Board[] = [];
  for (let i = 0; i < journey.boards.length; i++) {
    const bDef = journey.boards[i];
    d.setInstallProgress({ total: journey.boards.length, current: i + 1, currentBoardName: bDef.name });
    const stages: BoardStage[] = bDef.columns.map((c) => ({
      id: crypto.randomUUID(), label: c.name, color: c.color || 'bg-accent', linkedLifecycleStage: c.linkedLifecycleStage,
    }));
    const tpl = BOARD_TEMPLATES[tplBySlug[bDef.slug] ?? 'CUSTOM'];
    const ov = wonLostMap[journeyId]?.[bDef.slug] || {};
    const guessed = guessWonLostStageIds(stages, { wonLabel: ov.wonLabel ?? tpl.defaultWonStageLabel, lostLabel: ov.lostLabel ?? tpl.defaultLostStageLabel });
    const payload: Omit<Board, 'id' | 'createdAt'> = {
      name: bDef.name, description: `Parte da jornada: ${journey.boards.length > 1 ? 'Sim' : 'Nao'}`,
      linkedLifecycleStage: lifecycleBySlug[bDef.slug], template: 'CUSTOM', stages, isDefault: false,
      wonStageId: ov.wonArchive ? undefined : (guessed.wonStageId || undefined),
      lostStageId: guessed.lostStageId || undefined, wonStayInStage: ov.wonArchive ? true : false,
      agentPersona: bDef.strategy?.agentPersona, goal: bDef.strategy?.goal, entryTrigger: bDef.strategy?.entryTrigger,
    };
    if (d.onCreateBoardAsync) { created.push(await d.onCreateBoardAsync(payload, i)); }
    else { d.onCreate(payload, i); }
  }

  if (d.onUpdateBoardAsync && created.length > 0) {
    const bySlug = new Map<string, Board>();
    for (let i = 0; i < created.length; i++) { bySlug.set(journey.boards[i]?.slug, created[i]); }
    for (const [from, to] of [['sdr', 'sales'], ['sales', 'onboarding'], ['onboarding', 'cs'], ['cs', null]] as const) {
      const fb = bySlug.get(from);
      if (!fb) continue;
      await d.onUpdateBoardAsync(fb.id, { nextBoardId: to ? bySlug.get(to)?.id : undefined });
    }
  }

  d.onClose(); d.handleReset();
  d.setIsInstalling(false); d.setInstallProgress(null);
}
