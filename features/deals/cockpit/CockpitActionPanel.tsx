'use client';

import React from 'react';
import {
  CalendarClock,
  FileText,
  HeartPulse,
  Inbox,
  MessageCircle,
  Phone,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Panel } from './cockpit-ui';
import type { NextBestAction, TemplatePickerMode } from './cockpit-types';
import type { MessageChannel } from '@/features/inbox/components/MessageComposerModal';
import type { MessageLogContext } from './cockpit-types';
import type { ScheduleType } from '@/features/inbox/components/ScheduleModal';
import { Button } from '@/app/components/ui/Button';

interface CockpitActionPanelProps {
  health: { score: number; status: 'excellent' | 'good' | 'warning' | 'critical' };
  aiLoading: boolean;
  onRefetchAI: () => void;
  nextBestAction: NextBestAction;
  onExecuteNext: () => void;
  onCall: (title: string) => void;
  onOpenMessageComposer: (channel: MessageChannel, prefill?: { subject?: string; message?: string }, ctx?: MessageLogContext | null) => void;
  onOpenScheduleModal: (initial?: { type?: ScheduleType; title?: string; description?: string }) => void;
  onOpenTemplatePicker: (mode: TemplatePickerMode) => void;
  buildWhatsAppMessage: () => string;
  buildEmailBody: () => string;
  dealTitle: string;
  isScriptsLoading: boolean;
  scriptsCount: number;
}

export function CockpitActionPanel({
  health,
  aiLoading,
  onRefetchAI,
  nextBestAction,
  onExecuteNext,
  onCall,
  onOpenMessageComposer,
  onOpenScheduleModal,
  onOpenTemplatePicker,
  buildWhatsAppMessage,
  buildEmailBody,
  dealTitle,
  isScriptsLoading,
  scriptsCount,
}: CockpitActionPanelProps) {
  const aiCtx = {
    source: 'generated' as const,
    origin: 'nextBestAction' as const,
    aiSuggested: nextBestAction.isAI,
    aiActionType: nextBestAction.actionType,
  };

  const healthColor =
    health.status === 'excellent' ? 'bg-emerald-500' :
    health.status === 'good' ? 'bg-green-500' :
    health.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <Panel
      title="Proxima acao"
      icon={<Zap className="h-4 w-4 text-amber-500 dark:text-amber-300" />}
      right={
        <div className="flex items-center gap-2">
          <HeartPulse className="h-3 w-3 text-slate-400 dark:text-slate-500" />
          <div className="h-1.5 w-10 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div className={`h-full rounded-full ${healthColor}`} style={{ width: `${health.score}%` }} />
          </div>
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{health.score}%</span>
        </div>
      }
    >
      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-2">{nextBestAction.action}</div>
      <div className="mt-0.5 text-[10px] text-slate-500 line-clamp-1">{nextBestAction.reason}</div>

      <div className="mt-2 flex items-center gap-1.5">
        <Button
          type="button"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-500"
          onClick={onExecuteNext}
        >
          <Zap className="h-3 w-3" />
          Executar
        </Button>
        <Button
          type="button"
          className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/3 p-1.5 hover:bg-slate-100 dark:hover:bg-white/5"
          title="Reanalisar IA"
          onClick={onRefetchAI}
        >
          <Sparkles className={`h-3 w-3 text-slate-500 dark:text-slate-300 ${aiLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Action buttons — 6 in a row */}
      <div className="mt-2 grid grid-cols-6 gap-1">
        <Button type="button" className="flex flex-col items-center gap-0.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-1.5 hover:bg-slate-100 dark:hover:bg-white/5" title="Ligar" onClick={() => onCall('Ligacao')}>
          <Phone className="h-3 w-3 text-slate-500 dark:text-slate-300" />
          <span className="text-[8px] text-slate-500">Ligar</span>
        </Button>
        <Button type="button" className="flex flex-col items-center gap-0.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-1.5 hover:bg-slate-100 dark:hover:bg-white/5" title="WhatsApp" onClick={() => onOpenMessageComposer('WHATSAPP', { message: buildWhatsAppMessage() }, aiCtx)}>
          <MessageCircle className="h-3 w-3 text-slate-500 dark:text-slate-300" />
          <span className="text-[8px] text-slate-500">WA</span>
        </Button>
        <Button type="button" className="flex flex-col items-center gap-0.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-1.5 hover:bg-slate-100 dark:hover:bg-white/5" title="E-mail" onClick={() => onOpenMessageComposer('EMAIL', { subject: `Sobre ${dealTitle}`, message: buildEmailBody() }, aiCtx)}>
          <Inbox className="h-3 w-3 text-slate-500 dark:text-slate-300" />
          <span className="text-[8px] text-slate-500">Email</span>
        </Button>
        <Button type="button" className="flex flex-col items-center gap-0.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-1.5 hover:bg-slate-100 dark:hover:bg-white/5" title="Agendar" onClick={() => onOpenScheduleModal({ type: 'TASK', title: 'Agendar proximo passo', description: 'Criado no cockpit.' })}>
          <CalendarClock className="h-3 w-3 text-slate-500 dark:text-slate-300" />
          <span className="text-[8px] text-slate-500">Agend</span>
        </Button>
        <Button type="button" className="flex flex-col items-center gap-0.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40" title="Template WA" onClick={() => onOpenTemplatePicker('WHATSAPP')} disabled={isScriptsLoading || scriptsCount === 0}>
          <FileText className="h-3 w-3 text-slate-500 dark:text-slate-300" />
          <span className="text-[8px] text-slate-500">T.WA</span>
        </Button>
        <Button type="button" className="flex flex-col items-center gap-0.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40" title="Template Email" onClick={() => onOpenTemplatePicker('EMAIL')} disabled={isScriptsLoading || scriptsCount === 0}>
          <FileText className="h-3 w-3 text-slate-500 dark:text-slate-300" />
          <span className="text-[8px] text-slate-500">T.Em</span>
        </Button>
      </div>
    </Panel>
  );
}
