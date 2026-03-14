import { useEffect, useMemo, useState, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { contactPreferencesService } from '@/lib/supabase/contact-preferences';
import { normalizePhoneE164 } from '@/lib/phone';

import type { QuickScript } from '@/lib/supabase/quickScripts';
import type { Activity, Board, Contact, ContactPreference, Deal, DealItem, DealView } from '@/types';
import type { ScheduleData, ScheduleType } from '@/features/inbox/components/ScheduleModal';
import type { MessageChannel, MessageExecutedEvent } from '@/features/inbox/components/MessageComposerModal';
import type { CallLogData } from '@/features/inbox/components/CallModal';

import type {
  Actor,
  ChecklistItem,
  MessageLogContext,
  NextBestAction,
  Stage,
  TemplatePickerMode,
  ToastState,
  ToastTone,
} from '../cockpit-types';
import {
  buildExecutionHeader,
  buildSuggestedEmailBody,
  buildSuggestedWhatsAppMessage,
  errorMessage,
  hashString,
  pickEmailPrefill,
  uid,
} from '../cockpit-utils';

type CockpitActionsDeps = {
  selectedDeal: DealView | null;
  selectedContact: Contact | null;
  selectedBoard: Board | null;
  stages: Stage[];
  actor: Actor;
  nextBestAction: NextBestAction;
  addActivity: (activity: Omit<Activity, 'id' | 'createdAt'>) => Promise<Activity | null>;
  updateDeal: (id: string, data: Partial<Deal>) => void;
  updateContact: (id: string, data: Partial<Contact>) => Promise<void>;
  moveDeal: (deal: Deal | DealView, stageId: string, lossReason?: string, explicitWin?: boolean, explicitLost?: boolean) => Promise<unknown>;
  applyVariables: (template: string, vars: Record<string, string>) => string;
  templateVariables: Record<string, string>;
  preferences: ContactPreference | null;
  setPreferences: React.Dispatch<React.SetStateAction<ContactPreference | null>>;
  profile: { organization_id?: string; commission_rate?: number | null } | null;
  addItemToDeal: (dealId: string, item: Omit<DealItem, 'id'>) => Promise<DealItem | null>;
  removeItemFromDeal: (dealId: string, itemId: string) => Promise<void>;
};

export function useDealCockpitActions(deps: CockpitActionsDeps) {
  const {
    selectedDeal,
    selectedContact,
    selectedBoard,
    stages,
    actor,
    nextBestAction,
    addActivity,
    updateDeal,
    updateContact,
    moveDeal,
    applyVariables,
    templateVariables,
    preferences,
    setPreferences,
    profile,
    addItemToDeal,
    removeItemFromDeal,
  } = deps;

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // --- Toast ---
  const [toast, setToast] = useState<ToastState | null>(null);

  const pushToast = useCallback((message: string, tone: ToastTone = 'neutral') => {
    const id = uid('toast');
    setToast({ id, message, tone });
    window.setTimeout(() => { setToast((prev) => (prev?.id === id ? null : prev)); }, 2400);
  }, []);

  const copyToClipboard = useCallback(async (label: string, text: string) => {
    try { await navigator.clipboard.writeText(text); pushToast(`${label} copiado`, 'success'); }
    catch { pushToast(`Não foi possível copiar ${label.toLowerCase()}`, 'danger'); }
  }, [pushToast]);

  // --- Modal state ---
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callSuggestedTitle, setCallSuggestedTitle] = useState('Ligação');

  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageChannel, setMessageChannel] = useState<MessageChannel>('WHATSAPP');
  const [messagePrefill, setMessagePrefill] = useState<{ subject?: string; message?: string } | null>(null);
  const [messageLogContext, setMessageLogContext] = useState<MessageLogContext | null>(null);
  const [messageLogDedupe, setMessageLogDedupe] = useState<{ key: string; at: number } | null>(null);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleInitial, setScheduleInitial] = useState<{
    type?: ScheduleType;
    title?: string;
    description?: string;
  } | null>(null);

  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [templatePickerMode, setTemplatePickerMode] = useState<TemplatePickerMode>('WHATSAPP');

  // --- Checklist ---
  const defaultChecklist: ChecklistItem[] = useMemo(
    () => [
      { id: 'qualify', text: 'Qualificar (dor, urgência, orçamento, decisor)', done: false },
      { id: 'next-step', text: 'Definir próximo passo (data + responsável)', done: false },
      { id: 'materials', text: 'Enviar material / proposta', done: false },
      { id: 'stakeholders', text: 'Mapear decisores e objeções', done: false },
    ],
    [],
  );

  const [checklist, setChecklist] = useState<ChecklistItem[]>(defaultChecklist);

  const normalizeChecklist = useCallback((raw: unknown): ChecklistItem[] | null => {
    if (!Array.isArray(raw)) return null;
    const items: ChecklistItem[] = [];
    for (const it of raw) {
      if (!it || typeof it !== 'object') continue;
      const rec = it as Record<string, unknown>;
      const id = typeof rec.id === 'string' && rec.id ? rec.id : uid('chk');
      const text = typeof rec.text === 'string' ? rec.text.trim() : '';
      const done = Boolean(rec.done);
      if (!text) continue;
      items.push({ id, text, done });
    }
    return items.length ? items : [];
  }, []);

  const loadChecklistFromDeal = useCallback(() => {
    const raw = (selectedDeal?.metadata as Record<string, unknown> | undefined)?.cockpitChecklist;
    const parsed = normalizeChecklist(raw);
    setChecklist(parsed ?? defaultChecklist);
  }, [defaultChecklist, normalizeChecklist, selectedDeal?.metadata]);

  useEffect(() => { loadChecklistFromDeal(); }, [loadChecklistFromDeal, selectedDeal?.id]);

  const persistChecklist = useCallback(async (next: ChecklistItem[]) => {
    if (!selectedDeal) return;
    setChecklist(next);
    const nextMetadata = { ...(selectedDeal.metadata ?? {}), cockpitChecklist: next };
    try { await updateDeal(selectedDeal.id, { metadata: nextMetadata }); }
    catch (e) { pushToast(errorMessage(e, 'Não foi possível salvar o checklist.'), 'danger'); }
  }, [pushToast, selectedDeal, updateDeal]);

  // --- Modal openers ---
  const openMessageComposer = useCallback((channel: MessageChannel, prefill?: { subject?: string; message?: string }, ctx?: MessageLogContext | null) => {
    setMessageChannel(channel); setMessagePrefill(prefill ?? null); setMessageLogContext(ctx ?? null); setIsMessageModalOpen(true);
  }, []);

  const openScheduleModal = useCallback((initial?: { type?: ScheduleType; title?: string; description?: string }) => {
    setScheduleInitial(initial ?? null); setIsScheduleModalOpen(true);
  }, []);

  const openTemplatePicker = useCallback((mode: TemplatePickerMode) => {
    setTemplatePickerMode(mode); setIsTemplatePickerOpen(true);
  }, []);

  // --- Template picker ---
  const handlePickTemplate = useCallback((script: QuickScript) => {
    if (!selectedDeal) return;
    const applied = applyVariables(script.template, templateVariables);
    const ctx = { source: 'template' as const, origin: 'nextBestAction' as const, template: { id: script.id, title: script.title }, aiSuggested: nextBestAction.isAI, aiActionType: nextBestAction.actionType };
    if (templatePickerMode === 'WHATSAPP') {
      openMessageComposer('WHATSAPP', { message: applied }, ctx); setIsTemplatePickerOpen(false); return;
    }
    const { subject, body } = pickEmailPrefill(applied, `Sobre ${selectedDeal.title}`);
    openMessageComposer('EMAIL', { subject, message: body }, ctx); setIsTemplatePickerOpen(false);
  }, [applyVariables, nextBestAction.actionType, nextBestAction.isAI, openMessageComposer, selectedDeal, templatePickerMode, templateVariables]);

  // --- URL management ---
  const setDealInUrl = useCallback((nextDealId: string) => {
    if (pathname?.includes('/deals/') && pathname.endsWith('/cockpit')) {
      if (!nextDealId) return; router.replace(`/deals/${nextDealId}/cockpit`); return;
    }
    const sp = new URLSearchParams(searchParams?.toString());
    if (nextDealId) sp.set('dealId', nextDealId); else sp.delete('dealId');
    router.replace(`?${sp.toString()}`);
  }, [pathname, router, searchParams]);

  // --- Message handlers ---
  const handleMessageExecuted = useCallback(async (ev: MessageExecutedEvent) => {
    if (!selectedDeal) return;
    const payloadKey = `${ev.channel}|${ev.subject ?? ''}|${ev.message ?? ''}`;
    const nextKey = hashString(payloadKey);
    const now = Date.now();
    if (messageLogDedupe && messageLogDedupe.key === nextKey && now - messageLogDedupe.at < 1500) return;
    setMessageLogDedupe({ key: nextKey, at: now });
    const header = buildExecutionHeader({ channel: ev.channel === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL', context: messageLogContext });
    if (ev.channel === 'WHATSAPP') {
      const msg = ev.message?.trim() ? ev.message.trim() : 'Mensagem enviada via WhatsApp.';
      try {
        await addActivity({ dealId: selectedDeal.id, dealTitle: selectedDeal.title, type: 'NOTE', title: 'WhatsApp', description: `${header}\n\n---\n\n${msg}`, date: new Date().toISOString(), completed: true, user: actor });
        pushToast('WhatsApp registrado', 'success'); setMessageLogContext(null);
      } catch (e) { pushToast(errorMessage(e, 'Não foi possível registrar o WhatsApp.'), 'danger'); }
      return;
    }
    const subject = ev.subject?.trim() ? ev.subject.trim() : 'Email';
    const body = ev.message?.trim() ? ev.message.trim() : 'Email enviado.';
    try {
      await addActivity({ dealId: selectedDeal.id, dealTitle: selectedDeal.title, type: 'EMAIL', title: subject, description: `${header}\nAssunto: ${subject}\n\n---\n\n${body}`, date: new Date().toISOString(), completed: true, user: actor });
      pushToast('Email registrado', 'success'); setMessageLogContext(null);
    } catch (e) { pushToast(errorMessage(e, 'Não foi possível registrar o email.'), 'danger'); }
  }, [addActivity, actor, messageLogContext, messageLogDedupe, pushToast, selectedDeal]);

  // --- Schedule ---
  const handleScheduleSave = useCallback(async (data: ScheduleData) => {
    if (!selectedDeal) return;
    const when = new Date(`${data.date}T${data.time}:00`);
    try {
      await addActivity({ dealId: selectedDeal.id, dealTitle: selectedDeal.title, type: data.type, title: data.title, description: data.description, date: when.toISOString(), completed: false, user: actor });
      pushToast('Atividade agendada', 'success');
    } catch (e) { pushToast(errorMessage(e, 'Não foi possível agendar a atividade.'), 'danger'); }
  }, [addActivity, actor, pushToast, selectedDeal]);

  // --- Call ---
  const handleCall = useCallback((suggestedTitle?: string) => {
    if (!selectedContact?.phone) { pushToast('Contato sem telefone', 'danger'); return; }
    setCallSuggestedTitle(suggestedTitle || 'Ligação'); setIsCallModalOpen(true);
  }, [pushToast, selectedContact?.phone]);

  const handleCallLogSave = useCallback(async (data: CallLogData) => {
    if (!selectedDeal) return;
    const outcomeLabels = { connected: 'Atendeu', no_answer: 'Não atendeu', voicemail: 'Caixa postal', busy: 'Ocupado' };
    try {
      await addActivity({ dealId: selectedDeal.id, dealTitle: selectedDeal.title, type: 'CALL', title: data.title, description: `${outcomeLabels[data.outcome]} - Duração: ${Math.floor(data.duration / 60)}min ${data.duration % 60}s${data.notes ? `\n\n${data.notes}` : ''}`, date: new Date().toISOString(), completed: true, user: actor });
      pushToast('Ligação registrada', 'success');
    } catch (e) { pushToast(errorMessage(e, 'Não foi possível registrar a ligação.'), 'danger'); }
  }, [addActivity, actor, pushToast, selectedDeal]);

  // --- Execute next best action ---
  const handleExecuteNext = useCallback(async () => {
    if (!selectedDeal) return;
    const { action, reason, actionType } = nextBestAction;
    if (actionType === 'CALL') { handleCall(action); return; }
    if (actionType === 'WHATSAPP') {
      openMessageComposer('WHATSAPP', { message: buildSuggestedWhatsAppMessage({ contact: selectedContact ?? undefined, deal: selectedDeal, actionType: 'TASK', action, reason }) },
        { source: 'generated', origin: 'nextBestAction', aiSuggested: nextBestAction.isAI, aiActionType: nextBestAction.actionType }); return;
    }
    if (actionType === 'EMAIL') {
      openMessageComposer('EMAIL', { subject: action, message: buildSuggestedEmailBody({ contact: selectedContact ?? undefined, deal: selectedDeal, actionType: 'TASK', action, reason }) },
        { source: 'generated', origin: 'nextBestAction', aiSuggested: nextBestAction.isAI, aiActionType: nextBestAction.actionType }); return;
    }
    if (actionType === 'MEETING') {
      openScheduleModal({ type: 'MEETING', title: action, description: `${reason} - Sugerido por IA` }); return;
    }
    openScheduleModal({ type: 'TASK', title: action, description: `${reason} - Sugerido por IA` });
  }, [handleCall, nextBestAction, openMessageComposer, openScheduleModal, selectedContact, selectedDeal]);

  // --- Stage change ---
  const handleStageChange = useCallback(async (nextStageId: string) => {
    if (!selectedDeal || !selectedBoard || nextStageId === selectedDeal.status) return;
    try {
      await moveDeal(selectedDeal, nextStageId);
      const next = selectedBoard.stages.find((s) => s.id === nextStageId);
      pushToast(`Etapa: ${next?.label ?? 'Atualizada'}`, 'success');
      try {
        await addActivity({ dealId: selectedDeal.id, dealTitle: selectedDeal.title, type: 'STATUS_CHANGE', title: 'Moveu para', description: next?.label ?? 'Etapa atualizada', date: new Date().toISOString(), completed: true, user: actor });
      } catch { pushToast('Etapa atualizada (sem log)', 'neutral'); }
    } catch (e) { pushToast(errorMessage(e, 'Não foi possível mover etapa.'), 'danger'); }
  }, [addActivity, actor, moveDeal, pushToast, selectedBoard, selectedDeal]);

  // --- Win / Loss / Reopen ---
  const handleWin = useCallback(async () => {
    if (!selectedDeal || !selectedBoard?.wonStageId) {
      pushToast('Board sem etapa "Ganho" configurada', 'danger');
      return;
    }
    try {
      await moveDeal(selectedDeal, selectedBoard.wonStageId);
      pushToast('Deal marcado como GANHO!', 'success');
      try {
        await addActivity({
          dealId: selectedDeal.id, dealTitle: selectedDeal.title, type: 'STATUS_CHANGE',
          title: 'Ganhou', description: 'Deal marcado como ganho', date: new Date().toISOString(), completed: true, user: actor,
        });
      } catch { /* logged silently */ }
    } catch (e) { pushToast(errorMessage(e, 'Não foi possível marcar como ganho.'), 'danger'); }
  }, [addActivity, actor, moveDeal, pushToast, selectedBoard, selectedDeal]);

  const handleLoss = useCallback(async () => {
    if (!selectedDeal || !selectedBoard?.lostStageId) {
      pushToast('Board sem etapa "Perdido" configurada', 'danger');
      return;
    }
    try {
      await moveDeal(selectedDeal, selectedBoard.lostStageId);
      pushToast('Deal marcado como PERDIDO', 'danger');
      try {
        await addActivity({
          dealId: selectedDeal.id, dealTitle: selectedDeal.title, type: 'STATUS_CHANGE',
          title: 'Perdeu', description: 'Deal marcado como perdido', date: new Date().toISOString(), completed: true, user: actor,
        });
      } catch { /* logged silently */ }
    } catch (e) { pushToast(errorMessage(e, 'Não foi possível marcar como perdido.'), 'danger'); }
  }, [addActivity, actor, moveDeal, pushToast, selectedBoard, selectedDeal]);

  const handleReopen = useCallback(async () => {
    if (!selectedDeal || !selectedBoard || !stages.length) return;
    const firstStage = stages[0];
    if (!firstStage) return;
    try {
      await moveDeal(selectedDeal, firstStage.id);
      pushToast(`Deal reaberto na etapa: ${firstStage.label}`, 'success');
      try {
        await addActivity({
          dealId: selectedDeal.id, dealTitle: selectedDeal.title, type: 'STATUS_CHANGE',
          title: 'Reabriu', description: `Reaberto para ${firstStage.label}`, date: new Date().toISOString(), completed: true, user: actor,
        });
      } catch { /* logged silently */ }
    } catch (e) { pushToast(errorMessage(e, 'Não foi possível reabrir o deal.'), 'danger'); }
  }, [addActivity, actor, moveDeal, pushToast, selectedBoard, selectedDeal, stages]);

  // --- Inline edit handlers ---
  const handleUpdateDeal = useCallback((updates: Partial<Deal>) => {
    if (!selectedDeal?.id) return;
    updateDeal(selectedDeal.id, updates);
  }, [selectedDeal?.id, updateDeal]);

  const handleUpdateContact = useCallback(async (updates: Partial<Contact>) => {
    if (!selectedContact?.id) return;
    await updateContact(selectedContact.id, updates);
  }, [selectedContact?.id, updateContact]);

  const handleUpdatePreferences = useCallback(async (updates: Partial<ContactPreference>) => {
    if (!preferences?.id) return;
    await contactPreferencesService.update(preferences.id, updates);
    setPreferences(p => p ? { ...p, ...updates } : p);
    window.dispatchEvent(new CustomEvent('zmob:data-mutated', { detail: { tool: 'updateContactPreference' } }));
  }, [preferences?.id, setPreferences]);

  const handleCreatePreferences = useCallback(async (initialData?: Partial<ContactPreference>) => {
    if (!selectedContact?.id) { pushToast('Contato não encontrado para criar preferências.', 'danger'); return; }
    if (!profile?.organization_id) { pushToast('Organização não encontrada. Faça login novamente.', 'danger'); return; }
    const { data, error } = await contactPreferencesService.create({
      contactId: selectedContact.id,
      organizationId: profile.organization_id,
      propertyTypes: initialData?.propertyTypes || [],
      purpose: initialData?.purpose || null,
      priceMin: initialData?.priceMin ?? null,
      priceMax: initialData?.priceMax ?? null,
      regions: initialData?.regions || [],
      bedroomsMin: initialData?.bedroomsMin ?? null,
      parkingMin: initialData?.parkingMin ?? null,
      areaMin: initialData?.areaMin ?? null,
      acceptsFinancing: initialData?.acceptsFinancing ?? null,
      acceptsFgts: initialData?.acceptsFgts ?? null,
      urgency: initialData?.urgency || null,
      notes: initialData?.notes || null,
    });
    if (error) { console.error('[Cockpit] createPreferences failed:', error); pushToast('Erro ao criar preferências.', 'danger'); return; }
    if (data) setPreferences(data);
    window.dispatchEvent(new CustomEvent('zmob:data-mutated', { detail: { tool: 'createContactPreference' } }));
  }, [selectedContact?.id, profile?.organization_id, setPreferences, pushToast]);

  const handleAddItem = useCallback(async (item: { productId?: string; name: string; price: number; quantity: number }) => {
    if (!selectedDeal?.id) return;
    await addItemToDeal(selectedDeal.id, { productId: item.productId ?? '', ...item });
  }, [selectedDeal?.id, addItemToDeal]);

  const handleRemoveItem = useCallback(async (itemId: string) => {
    if (!selectedDeal?.id) return;
    await removeItemFromDeal(selectedDeal.id, itemId);
  }, [selectedDeal?.id, removeItemFromDeal]);

  // --- Derived values for modals ---
  const phoneE164 = normalizePhoneE164(selectedContact?.phone);

  return {
    // Toast
    toast,
    pushToast,
    copyToClipboard,

    // Call modal
    isCallModalOpen,
    setIsCallModalOpen,
    callSuggestedTitle,
    handleCall,
    handleCallLogSave,

    // Message modal
    isMessageModalOpen,
    setIsMessageModalOpen,
    messageChannel,
    messagePrefill,
    setMessagePrefill,
    messageLogContext,
    setMessageLogContext,
    openMessageComposer,
    handleMessageExecuted,

    // Schedule modal
    isScheduleModalOpen,
    setIsScheduleModalOpen,
    scheduleInitial,
    setScheduleInitial,
    openScheduleModal,
    handleScheduleSave,

    // Template picker
    isTemplatePickerOpen,
    setIsTemplatePickerOpen,
    templatePickerMode,
    openTemplatePicker,
    handlePickTemplate,

    // Checklist
    checklist,
    persistChecklist,
    loadChecklistFromDeal,

    // URL
    setDealInUrl,
    router,

    // Stage changes
    handleStageChange,
    handleWin,
    handleLoss,
    handleReopen,
    handleExecuteNext,

    // Inline edits
    handleUpdateDeal,
    handleUpdateContact,
    handleUpdatePreferences,
    handleCreatePreferences,
    handleAddItem,
    handleRemoveItem,

    // Derived
    phoneE164,
  };
}
