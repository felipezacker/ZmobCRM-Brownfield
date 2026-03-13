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
import { Button } from '@/components/ui/button';

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
          <HeartPulse className="h-3 w-3 text-muted-foreground dark:text-muted-foreground" />
          <div className="h-1.5 w-10 rounded-full bg-accent dark:bg-white/10 overflow-hidden">
            <div className={`h-full rounded-full ${healthColor}`} style={{ width: `${health.score}%` }} />
          </div>
          <span className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground">{health.score}%</span>
        </div>
      }
    >
      <div className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground line-clamp-2">{nextBestAction.action}</div>
      <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{nextBestAction.reason}</div>

      <div className="mt-2 flex items-center gap-1.5">
        <Button
          type="button"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-2 py-1.5 text-1xs font-semibold text-white hover:bg-rose-500"
          onClick={onExecuteNext}
        >
          <Zap className="h-3 w-3" />
          Executar
        </Button>
        <Button
          type="button"
          className="rounded-lg border border-border bg-background dark:bg-white/3 p-1.5 hover:bg-muted dark:hover:bg-white/5"
          title="Reanalisar IA"
          onClick={onRefetchAI}
        >
          <Sparkles className={`h-3 w-3 text-muted-foreground dark:text-muted-foreground ${aiLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Action buttons — 3x2 grid */}
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <Button type="button" className="h-auto flex flex-col items-center gap-1.5 rounded-lg border border-border bg-background dark:bg-white/2 px-2 py-2.5 hover:bg-cyan-500/10 hover:border-cyan-500/20 dark:hover:bg-cyan-500/10 transition-colors" title="Ligar" onClick={() => onCall('Ligacao')}>
          <Phone className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          <span className="text-xs font-medium text-secondary-foreground dark:text-muted-foreground">Ligar</span>
        </Button>
        <Button type="button" className="h-auto flex flex-col items-center gap-1.5 rounded-lg border border-border bg-background dark:bg-white/2 px-2 py-2.5 hover:bg-cyan-500/10 hover:border-cyan-500/20 dark:hover:bg-cyan-500/10 transition-colors" title="WhatsApp" onClick={() => onOpenMessageComposer('WHATSAPP', { message: buildWhatsAppMessage() }, aiCtx)}>
          <MessageCircle className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          <span className="text-xs font-medium text-secondary-foreground dark:text-muted-foreground">WhatsApp</span>
        </Button>
        <Button type="button" className="h-auto flex flex-col items-center gap-1.5 rounded-lg border border-border bg-background dark:bg-white/2 px-2 py-2.5 hover:bg-cyan-500/10 hover:border-cyan-500/20 dark:hover:bg-cyan-500/10 transition-colors" title="E-mail" onClick={() => onOpenMessageComposer('EMAIL', { subject: `Sobre ${dealTitle}`, message: buildEmailBody() }, aiCtx)}>
          <Inbox className="h-5 w-5 text-violet-500 dark:text-violet-400" />
          <span className="text-xs font-medium text-secondary-foreground dark:text-muted-foreground">Email</span>
        </Button>
        <Button type="button" className="h-auto flex flex-col items-center gap-1.5 rounded-lg border border-border bg-background dark:bg-white/2 px-2 py-2.5 hover:bg-cyan-500/10 hover:border-cyan-500/20 dark:hover:bg-cyan-500/10 transition-colors" title="Agendar" onClick={() => onOpenScheduleModal({ type: 'TASK', title: 'Agendar proximo passo', description: 'Criado no cockpit.' })}>
          <CalendarClock className="h-5 w-5 text-amber-500 dark:text-amber-400" />
          <span className="text-xs font-medium text-secondary-foreground dark:text-muted-foreground">Agendar</span>
        </Button>
        <Button type="button" className="h-auto flex flex-col items-center gap-1 rounded-lg border border-border bg-background dark:bg-white/2 px-2 py-3 hover:bg-cyan-500/10 hover:border-cyan-500/20 dark:hover:bg-cyan-500/10 transition-colors disabled:opacity-40" title="Template WA" onClick={() => onOpenTemplatePicker('WHATSAPP')} disabled={isScriptsLoading || scriptsCount === 0}>
          <FileText className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          <span className="text-xs font-medium text-secondary-foreground dark:text-muted-foreground text-center leading-tight">Template<br/>WA</span>
        </Button>
        <Button type="button" className="h-auto flex flex-col items-center gap-1 rounded-lg border border-border bg-background dark:bg-white/2 px-2 py-3 hover:bg-cyan-500/10 hover:border-cyan-500/20 dark:hover:bg-cyan-500/10 transition-colors disabled:opacity-40" title="Template Email" onClick={() => onOpenTemplatePicker('EMAIL')} disabled={isScriptsLoading || scriptsCount === 0}>
          <FileText className="h-5 w-5 text-violet-500 dark:text-violet-400" />
          <span className="text-xs font-medium text-secondary-foreground dark:text-muted-foreground text-center leading-tight">Template<br/>Email</span>
        </Button>
      </div>
    </Panel>
  );
}
