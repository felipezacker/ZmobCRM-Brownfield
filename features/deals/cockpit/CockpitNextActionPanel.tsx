'use client';

import React from 'react';
import {
  Activity as ActivityIcon,
  BadgeCheck,
  CalendarClock,
  Inbox,
  MessageCircle,
  Phone,
  Sparkles,
} from 'lucide-react';
import { Panel } from './cockpit-ui';
import type { NextBestAction, TemplatePickerMode } from './cockpit-types';
import type { MessageChannel } from '@/features/inbox/components/MessageComposerModal';
import type { MessageLogContext } from './cockpit-types';
import type { ScheduleType } from '@/features/inbox/components/ScheduleModal';
import { Button } from '@/components/ui/button';

interface CockpitNextActionPanelProps {
  nextBestAction: NextBestAction;
  isScriptsLoading: boolean;
  scriptsCount: number;
  onExecuteNext: () => void;
  onCall: (title: string) => void;
  onOpenMessageComposer: (channel: MessageChannel, prefill?: { subject?: string; message?: string }, ctx?: MessageLogContext | null) => void;
  onOpenScheduleModal: (initial?: { type?: ScheduleType; title?: string; description?: string }) => void;
  onOpenTemplatePicker: (mode: TemplatePickerMode) => void;
  buildWhatsAppMessage: () => string;
  buildEmailBody: () => string;
  dealTitle: string;
}

export function CockpitNextActionPanel({
  nextBestAction,
  isScriptsLoading,
  scriptsCount,
  onExecuteNext,
  onCall,
  onOpenMessageComposer,
  onOpenScheduleModal,
  onOpenTemplatePicker,
  buildWhatsAppMessage,
  buildEmailBody,
  dealTitle,
}: CockpitNextActionPanelProps) {
  const aiCtx = {
    source: 'generated' as const,
    origin: 'nextBestAction' as const,
    aiSuggested: nextBestAction.isAI,
    aiActionType: nextBestAction.actionType,
  };

  return (
    <Panel title="Próxima ação" icon={<BadgeCheck className="h-4 w-4 text-cyan-300" />} className="shrink-0">
      <div className="text-sm font-semibold text-muted-foreground">{nextBestAction.action}</div>
      <div className="mt-1 text-xs text-muted-foreground">{nextBestAction.reason}</div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        Aqui EXECUTA (e tenta registrar o que dá). No rodapé da timeline você REGISTRA atividades rápidas que aconteceram fora do CRM.
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/25 hover:bg-rose-500"
          onClick={onExecuteNext}
        >
          <ActivityIcon className="h-4 w-4" />
          Executar agora
        </Button>

        <div className="grid w-full grid-cols-4 gap-2">
          <Button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/3 px-2 py-2 hover:bg-white/5"
            title="Ligar (abre modal de ligação)"
            aria-label="Ligar"
            onClick={() => onCall('Ligação')}
          >
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground">Ligar</span>
          </Button>

          <Button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/3 px-2 py-2 hover:bg-white/5"
            title="Preparar WhatsApp"
            aria-label="Preparar WhatsApp"
            onClick={() => onOpenMessageComposer('WHATSAPP', { message: buildWhatsAppMessage() }, aiCtx)}
          >
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground">Gerar WA</span>
          </Button>

          <Button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/3 px-2 py-2 hover:bg-white/5"
            title="Preparar e-mail"
            aria-label="Preparar e-mail"
            onClick={() =>
              onOpenMessageComposer('EMAIL', { subject: `Sobre ${dealTitle}`, message: buildEmailBody() }, aiCtx)
            }
          >
            <Inbox className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground">E-mail</span>
          </Button>

          <Button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/3 px-2 py-2 hover:bg-white/5"
            title="Agendar (cria uma tarefa simples)"
            aria-label="Agendar"
            onClick={() => onOpenScheduleModal({ type: 'TASK', title: 'Agendar próximo passo', description: 'Criado no cockpit.' })}
          >
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground">Agendar</span>
          </Button>
        </div>

        <div className="grid w-full grid-cols-2 gap-2">
          <Button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/2 px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:bg-white/5 disabled:opacity-50"
            title="Usar um template persistido (Quick Scripts)"
            onClick={() => onOpenTemplatePicker('WHATSAPP')}
            disabled={isScriptsLoading || scriptsCount === 0}
          >
            <MessageCircle className="h-4 w-4" />
            Template WhatsApp
          </Button>

          <Button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/2 px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:bg-white/5 disabled:opacity-50"
            title="Usar um template persistido (Quick Scripts)"
            onClick={() => onOpenTemplatePicker('EMAIL')}
            disabled={isScriptsLoading || scriptsCount === 0}
          >
            <Inbox className="h-4 w-4" />
            Template E-mail
          </Button>
        </div>
      </div>
    </Panel>
  );
}
