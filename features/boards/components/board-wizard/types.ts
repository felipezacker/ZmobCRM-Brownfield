import { BoardStage } from '@/types';
import { GeneratedBoard } from '@/lib/ai/tasksClient';

// ---- Wizard step/mode types ----
export type WizardStep = 'select' | 'ai-input' | 'ai-preview' | 'playbook-preview';
export type SelectMode = 'home' | 'browse';
export type SelectBrowseFocus = 'playbooks' | 'templates' | 'community';

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  proposalData?: GeneratedBoard;
}

// ---- Color palette (fixed for Tailwind safety) ----
export const AI_STAGE_COLOR_PALETTE = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-orange-500',
  'bg-red-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
] as const;

export function normalizeAIStageColor(color: string | undefined, index: number) {
  if (color && (AI_STAGE_COLOR_PALETTE as readonly string[]).includes(color)) return color;
  return AI_STAGE_COLOR_PALETTE[index % AI_STAGE_COLOR_PALETTE.length];
}

export function normalizeGeneratedBoardColors(board: GeneratedBoard): GeneratedBoard {
  const stages = Array.isArray(board.stages) ? board.stages : [];
  return {
    ...board,
    stages: stages.map((s, idx) => ({
      ...s,
      color: normalizeAIStageColor(s.color, idx),
    })),
  };
}

// ---- Stage label utilities ----
export function normalizeStageLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function guessWonLostStageIds(
  stages: BoardStage[],
  opts?: { wonLabel?: string; lostLabel?: string }
) {
  const byLabel = new Map<string, string>();
  for (const s of stages) {
    byLabel.set(normalizeStageLabel(s.label), s.id);
  }

  const exactWon = opts?.wonLabel ? byLabel.get(normalizeStageLabel(opts.wonLabel)) : undefined;
  const exactLost = opts?.lostLabel ? byLabel.get(normalizeStageLabel(opts.lostLabel)) : undefined;

  const heuristicWon =
    exactWon ?? stages.find((s) => /\b(ganho|won|fechado ganho|conclu[ií]do)\b/i.test(s.label))?.id;
  const heuristicLost =
    exactLost ?? stages.find((s) => /\b(perdido|lost|churn|cancelad[oa])\b/i.test(s.label))?.id;

  return { wonStageId: heuristicWon ?? '', lostStageId: heuristicLost ?? '' };
}

// ---- Random agent name ----
const AGENT_NAMES = [
  'Sofia', 'Valeria', 'Julia', 'Cecilia', 'Livia',
  'Vitoria', 'Alicia', 'Olivia', 'Claudia', 'Silvia',
];

export function randomAgentName() {
  return AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)];
}

export interface InstallProgress {
  total: number;
  current: number;
  currentBoardName?: string;
}
