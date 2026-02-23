import type { Activity, Board, BoardStage, Contact, DealView } from '@/types';
import type { QuickScript, ScriptCategory } from '@/lib/supabase/quickScripts';

export type Tab = 'chat' | 'notas' | 'scripts' | 'arquivos';

export type StageTone = 'blue' | 'violet' | 'amber' | 'green' | 'slate';

export type Stage = {
  id: string;
  label: string;
  tone: StageTone;
  rawColor?: string;
};

export type TimelineItem = {
  id: string;
  at: string;
  kind: 'status' | 'call' | 'note' | 'system';
  title: string;
  subtitle?: string;
  tone?: 'success' | 'danger' | 'neutral';
};

export type ToastTone = 'neutral' | 'success' | 'danger';
export type ToastState = { id: string; message: string; tone: ToastTone };

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type TemplatePickerMode = 'WHATSAPP' | 'EMAIL';

export type MessageLogContext = {
  source: 'template' | 'generated' | 'manual';
  origin: 'nextBestAction' | 'quickAction';
  template?: { id: string; title: string };
  aiSuggested?: boolean;
  aiActionType?: string;
};

export type NextBestAction = {
  action: string;
  reason: string;
  urgency: string;
  actionType: string;
  isAI: boolean;
};

export type Actor = {
  name: string;
  avatar: string;
};

export type CockpitSnapshot = {
  meta: { generatedAt: string; source: string; version: number };
  deal: Record<string, unknown>;
  contact?: Record<string, unknown>;
  board?: Record<string, unknown>;
  stage?: Record<string, unknown>;
  cockpitSignals: {
    nextBestAction: NextBestAction;
    aiAnalysis: Record<string, unknown> | null;
    aiAnalysisLoading: boolean;
  };
  lists: Record<string, unknown>;
};
