'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { MessageChannel, MessageExecutedEvent } from '@/features/inbox/components/MessageComposerModal';
import type { ScheduleData, ScheduleType } from '@/features/inbox/components/ScheduleModal';
import type { CallLogData } from '@/features/inbox/components/CallModal';
import type { QuickScript } from '@/lib/supabase/quickScripts';

import type { ChecklistItem, MessageLogContext, TemplatePickerMode, ToastState, ToastTone } from '../types';
import {
  buildExecutionHeader,
  buildSuggestedEmailBody,
  buildSuggestedWhatsAppMessage,
  hashString,
  pickEmailPrefill,
  uid,
} from '../utils';
import type { useCockpitDealState } from './useCockpitDealState';

type DealState = ReturnType<typeof useCockpitDealState>;

export function useCockpitActions(ds: {
  selectedDeal: DealState['selectedDeal'];
  selectedContact: DealState['selectedContact'];
  selectedBoard: DealState['selectedBoard'];
  actor: DealState['actor'];
  nextBestAction: DealState['nextBestAction'];
  templateVariables: DealState['templateVariables'];
  applyVariables: DealState['applyVariables'];
  moveDeal: DealState['moveDeal'];
  addActivity: DealState['addActivity'];
  updateDeal: DealState['updateDeal'];
}) {
  const {
    selectedDeal,
    selectedContact,
    selectedBoard,
    actor,
    nextBestAction,
    templateVariables,
    applyVariables,
    moveDeal,
    addActivity,
    updateDeal,
  } = ds;

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // --- Toast ---
  const [toast, setToast] = useState<ToastState | null>(null);

  const pushToast = useCallback((message: string, tone: ToastTone = 'neutral') => {
    const id = uid('toast');
    setToast({ id, message, tone });
    window.setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 2400);
  }, []);

  const copyToClipboard = useCallback(
    async (label: string, text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        pushToast(`${label} copiado`, 'success');
      } catch {
        pushToast(`N\u00e3o foi poss\u00edvel copiar ${label.toLowerCase()}`, 'danger');
      }
    },
    [pushToast]
  );

  // --- Message Composer ---
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageChannel, setMessageChannel] = useState<MessageChannel>('WHATSAPP');
  const [messagePrefill, setMessagePrefill] = useState<{ subject?: string; message?: string } | null>(null);
  const [messageLogContext, setMessageLogContext] = useState<MessageLogContext | null>(null);
  const [messageLogDedupe, setMessageLogDedupe] = useState<{ key: string; at: number } | null>(null);

  const openMessageComposer = useCallback(
    (channel: MessageChannel, prefill?: { subject?: string; message?: string }, ctx?: MessageLogContext | null) => {
      setMessageChannel(channel);
      setMessagePrefill(prefill ?? null);
      setMessageLogContext(ctx ?? null);
      setIsMessageModalOpen(true);
    }, []
  );

  const closeMessageModal = useCallback(() => {
    setIsMessageModalOpen(false);
    setMessagePrefill(null);
    setMessageLogContext(null);
  }, []);

  // --- Schedule Modal ---
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleInitial, setScheduleInitial] = useState<{
    type?: ScheduleType;
    title?: string;
    description?: string;
  } | null>(null);

  const openScheduleModal = useCallback((initial?: { type?: ScheduleType; title?: string; description?: string }) => {
    setScheduleInitial(initial ?? null);
    setIsScheduleModalOpen(true);
  }, []);

  const closeScheduleModal = useCallback(() => {
    setIsScheduleModalOpen(false);
    setScheduleInitial(null);
  }, []);

  // --- Template Picker ---
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [templatePickerMode, setTemplatePickerMode] = useState<TemplatePickerMode>('WHATSAPP');

  const openTemplatePicker = useCallback((mode: TemplatePickerMode) => {
    setTemplatePickerMode(mode);
    setIsTemplatePickerOpen(true);
  }, []);

  const closeTemplatePicker = useCallback(() => {
    setIsTemplatePickerOpen(false);
  }, []);

  // --- Call Modal ---
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callSuggestedTitle, setCallSuggestedTitle] = useState('Liga\u00e7\u00e3o');

  // --- Checklist ---
  const defaultChecklist: ChecklistItem[] = useMemo(
    () => [
      { id: 'qualify', text: 'Qualificar (dor, urg\u00eancia, or\u00e7amento, decisor)', done: false },
      { id: 'next-step', text: 'Definir pr\u00f3ximo passo (data + respons\u00e1vel)', done: false },
      { id: 'materials', text: 'Enviar material / proposta', done: false },
      { id: 'stakeholders', text: 'Mapear decisores e obje\u00e7\u00f5es', done: false },
    ],
    []
  );

  const [checklist, setChecklist] = useState<ChecklistItem[]>(defaultChecklist);
  const [checklistDraft, setChecklistDraft] = useState('');

  const normalizeChecklist = useCallback(
    (raw: unknown): ChecklistItem[] | null => {
      if (!Array.isArray(raw)) return null;
      const items: ChecklistItem[] = [];
      for (const it of raw) {
        if (!it || typeof it !== 'object') continue;
        const anyIt = it as Record<string, unknown>;
        const id = typeof anyIt.id === 'string' && anyIt.id ? anyIt.id : uid('chk');
        const text = typeof anyIt.text === 'string' ? anyIt.text.trim() : '';
        const done = Boolean(anyIt.done);
        if (!text) continue;
        items.push({ id, text, done });
      }
      return items.length ? items : [];
    },
    []
  );

  const loadChecklistFromDeal = useCallback(() => {
    const raw = (selectedDeal?.metadata as Record<string, unknown> | null | undefined)?.cockpitChecklist;
    const parsed = normalizeChecklist(raw);
    setChecklist(parsed ?? defaultChecklist);
    setChecklistDraft('');
  }, [defaultChecklist, normalizeChecklist, selectedDeal?.metadata]);

  useEffect(() => {
    loadChecklistFromDeal();
  }, [loadChecklistFromDeal, selectedDeal?.id]);

  const persistChecklist = useCallback(
    async (next: ChecklistItem[]) => {
      if (!selectedDeal) return;
      setChecklist(next);
      const nextMetadata = { ...(selectedDeal.metadata ?? {}), cockpitChecklist: next };
      await updateDeal(selectedDeal.id, { metadata: nextMetadata });
    },
    [selectedDeal, updateDeal]
  );

  // --- Drafts ---
  const [noteDraftTimeline, setNoteDraftTimeline] = useState('');
  const [dealNoteDraft, setDealNoteDraft] = useState('');

  // --- Template Pick Handler ---
  const handlePickTemplate = useCallback(
    (script: QuickScript) => {
      if (!selectedDeal) return;

      const applied = applyVariables(script.template, templateVariables);

      if (templatePickerMode === 'WHATSAPP') {
        openMessageComposer(
          'WHATSAPP',
          { message: applied },
          { source: 'template', origin: 'nextBestAction', template: { id: script.id, title: script.title }, aiSuggested: nextBestAction.isAI, aiActionType: nextBestAction.actionType }
        );
        setIsTemplatePickerOpen(false);
        return;
      }

      const fallbackSubject = `Sobre ${selectedDeal.title}`;
      const { subject, body } = pickEmailPrefill(applied, fallbackSubject);
      openMessageComposer(
        'EMAIL',
        { subject, message: body },
        { source: 'template', origin: 'nextBestAction', template: { id: script.id, title: script.title }, aiSuggested: nextBestAction.isAI, aiActionType: nextBestAction.actionType }
      );
      setIsTemplatePickerOpen(false);
    },
    [applyVariables, nextBestAction.actionType, nextBestAction.isAI, openMessageComposer, selectedDeal, templatePickerMode, templateVariables]
  );

  // --- URL management ---
  const setDealInUrl = useCallback(
    (nextDealId: string) => {
      if (pathname?.includes('/deals/') && pathname.endsWith('/cockpit')) {
        if (!nextDealId) return;
        router.replace(`/deals/${nextDealId}/cockpit`);
        return;
      }

      const sp = new URLSearchParams(searchParams?.toString());
      if (nextDealId) sp.set('dealId', nextDealId);
      else sp.delete('dealId');
      router.replace(`?${sp.toString()}`);
    },
    [pathname, router, searchParams]
  );

  // --- Message execution ---
  const handleMessageExecuted = useCallback(
    async (ev: MessageExecutedEvent) => {
      if (!selectedDeal) return;

      const payloadKey = `${ev.channel}|${ev.subject ?? ''}|${ev.message ?? ''}`;
      const nextKey = hashString(payloadKey);
      const now = Date.now();

      if (messageLogDedupe && messageLogDedupe.key === nextKey && now - messageLogDedupe.at < 1500) {
        return;
      }
      setMessageLogDedupe({ key: nextKey, at: now });

      const header = buildExecutionHeader({
        channel: ev.channel === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL',
        context: messageLogContext,
      });

      if (ev.channel === 'WHATSAPP') {
        const msg = ev.message?.trim() ? ev.message.trim() : 'Mensagem enviada via WhatsApp.';
        await addActivity({
          dealId: selectedDeal.id,
          dealTitle: selectedDeal.title,
          type: 'NOTE',
          title: 'WhatsApp',
          description: `${header}\n\n---\n\n${msg}`,
          date: new Date().toISOString(),
          completed: true,
          user: actor,
        });
        pushToast('WhatsApp registrado', 'success');
        setMessageLogContext(null);
        return;
      }

      const subject = ev.subject?.trim() ? ev.subject.trim() : 'Email';
      const body = ev.message?.trim() ? ev.message.trim() : 'Email enviado.';

      await addActivity({
        dealId: selectedDeal.id,
        dealTitle: selectedDeal.title,
        type: 'EMAIL',
        title: subject,
        description: `${header}\nAssunto: ${subject}\n\n---\n\n${body}`,
        date: new Date().toISOString(),
        completed: true,
        user: actor,
      });
      pushToast('Email registrado', 'success');
      setMessageLogContext(null);
    },
    [addActivity, actor, messageLogContext, messageLogDedupe, pushToast, selectedDeal]
  );

  // --- Schedule save ---
  const handleScheduleSave = useCallback(
    async (data: ScheduleData) => {
      if (!selectedDeal) return;

      const when = new Date(`${data.date}T${data.time}:00`);
      await addActivity({
        dealId: selectedDeal.id,
        dealTitle: selectedDeal.title,
        type: data.type,
        title: data.title,
        description: data.description,
        date: when.toISOString(),
        completed: false,
        user: actor,
      });
      pushToast('Atividade agendada', 'success');
    },
    [addActivity, actor, pushToast, selectedDeal]
  );

  // --- Call ---
  const handleCall = useCallback((suggestedTitle?: string) => {
    if (!selectedContact?.phone) {
      pushToast('Contato sem telefone', 'danger');
      return;
    }
    setCallSuggestedTitle(suggestedTitle || 'Liga\u00e7\u00e3o');
    setIsCallModalOpen(true);
  }, [pushToast, selectedContact?.phone]);

  const handleCallLogSave = useCallback(async (data: CallLogData) => {
    if (!selectedDeal) return;

    const outcomeLabels = {
      connected: 'Atendeu',
      no_answer: 'N\u00e3o atendeu',
      voicemail: 'Caixa postal',
      busy: 'Ocupado',
    };

    await addActivity({
      dealId: selectedDeal.id,
      dealTitle: selectedDeal.title,
      type: 'CALL',
      title: data.title,
      description: `${outcomeLabels[data.outcome]} - Dura\u00e7\u00e3o: ${Math.floor(data.duration / 60)}min ${data.duration % 60}s${data.notes ? `\n\n${data.notes}` : ''}`,
      date: new Date().toISOString(),
      completed: true,
      user: actor,
    });

    pushToast('Liga\u00e7\u00e3o registrada', 'success');
  }, [addActivity, actor, pushToast, selectedDeal]);

  // --- Execute next best action ---
  const handleExecuteNext = useCallback(async () => {
    if (!selectedDeal) return;

    const { action, reason, actionType } = nextBestAction;

    if (actionType === 'CALL') {
      handleCall(action);
      return;
    }

    if (actionType === 'WHATSAPP') {
      openMessageComposer('WHATSAPP', {
        message: buildSuggestedWhatsAppMessage({
          contact: selectedContact ?? undefined,
          deal: selectedDeal,
          actionType: 'TASK',
          action,
          reason,
        }),
      }, { source: 'generated', origin: 'nextBestAction', aiSuggested: nextBestAction.isAI, aiActionType: nextBestAction.actionType });
      return;
    }

    if (actionType === 'EMAIL') {
      openMessageComposer('EMAIL', {
        subject: action,
        message: buildSuggestedEmailBody({
          contact: selectedContact ?? undefined,
          deal: selectedDeal,
          actionType: 'TASK',
          action,
          reason,
        }),
      }, { source: 'generated', origin: 'nextBestAction', aiSuggested: nextBestAction.isAI, aiActionType: nextBestAction.actionType });
      return;
    }

    if (actionType === 'MEETING') {
      openScheduleModal({
        type: 'MEETING',
        title: action,
        description: `${reason} - Sugerido por IA`,
      });
      return;
    }

    openScheduleModal({
      type: 'TASK',
      title: action,
      description: `${reason} - Sugerido por IA`,
    });
  }, [handleCall, nextBestAction, openMessageComposer, openScheduleModal, selectedContact, selectedDeal]);

  // --- Stage change ---
  const handleStageChange = useCallback(
    async (nextStageId: string) => {
      if (!selectedDeal) return;
      if (!selectedBoard) return;
      if (nextStageId === selectedDeal.status) return;

      try {
        await moveDeal(selectedDeal, nextStageId);
        const next = selectedBoard.stages.find((s) => s.id === nextStageId);
        pushToast(`Etapa: ${next?.label ?? 'Atualizada'}`, 'success');

        try {
          await addActivity({
            dealId: selectedDeal.id,
            dealTitle: selectedDeal.title,
            type: 'STATUS_CHANGE',
            title: 'Moveu para',
            description: next?.label ?? 'Etapa atualizada',
            date: new Date().toISOString(),
            completed: true,
            user: actor,
          });
        } catch {
          pushToast('Etapa atualizada (sem log)', 'neutral');
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'N\u00e3o foi poss\u00edvel mover etapa.';
        pushToast(msg, 'danger');
      }
    },
    [addActivity, actor, moveDeal, pushToast, selectedBoard, selectedDeal]
  );

  return {
    // Toast
    toast,
    pushToast,
    copyToClipboard,
    // Message composer
    isMessageModalOpen,
    messageChannel,
    messagePrefill,
    messageLogContext,
    openMessageComposer,
    closeMessageModal,
    handleMessageExecuted,
    // Schedule
    isScheduleModalOpen,
    scheduleInitial,
    openScheduleModal,
    closeScheduleModal,
    handleScheduleSave,
    // Template picker
    isTemplatePickerOpen,
    templatePickerMode,
    openTemplatePicker,
    closeTemplatePicker,
    handlePickTemplate,
    // Call
    isCallModalOpen,
    callSuggestedTitle,
    handleCall,
    handleCallLogSave,
    setIsCallModalOpen,
    // Checklist
    checklist,
    checklistDraft,
    setChecklistDraft,
    persistChecklist,
    loadChecklistFromDeal,
    // Drafts
    noteDraftTimeline,
    setNoteDraftTimeline,
    dealNoteDraft,
    setDealNoteDraft,
    // Actions
    handleExecuteNext,
    handleStageChange,
    setDealInUrl,
  };
}
