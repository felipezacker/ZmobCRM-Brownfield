'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Bug, Check, Moon, Sun, X } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useCRMActions } from '@/hooks/useCRMActions';
import { useDeals } from '@/context/deals/DealsContext';
import { useContacts } from '@/context/contacts/ContactsContext';
import { useBoards } from '@/context/boards/BoardsContext';
import { useActivities } from '@/context/activities/ActivitiesContext';
import { useSettings } from '@/context/settings/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { isDebugMode, enableDebugMode, disableDebugMode } from '@/lib/debug';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';
import { useMoveDealSimple } from '@/lib/query/hooks';
import { normalizePhoneE164 } from '@/lib/phone';
import { supabase } from '@/lib/supabase/client';
import { calculateEstimatedCommission } from '@/lib/supabase';
import { contactPreferencesService } from '@/lib/supabase/contact-preferences';

import { useAIDealAnalysis, deriveHealthFromProbability } from '@/features/inbox/hooks/useAIDealAnalysis';
import { useDealNotes } from '@/features/inbox/hooks/useDealNotes';
import { useDealFiles } from '@/features/inbox/hooks/useDealFiles';
import { useQuickScripts } from '@/features/inbox/hooks/useQuickScripts';
import type { QuickScript } from '@/lib/supabase/quickScripts';

import { CallModal, type CallLogData } from '@/features/inbox/components/CallModal';
import { MessageComposerModal, type MessageChannel, type MessageExecutedEvent } from '@/features/inbox/components/MessageComposerModal';
import { ScheduleModal, type ScheduleData, type ScheduleType } from '@/features/inbox/components/ScheduleModal';

import type { Activity, Board, BoardStage, Contact, ContactPreference, Deal } from '@/types';
import type {
  Actor,
  ChecklistItem,
  MessageLogContext,
  NextBestAction,
  Stage,
  TemplatePickerMode,
  TimelineItem,
  ToastState,
  ToastTone,
} from './cockpit-types';
import {
  buildExecutionHeader,
  buildSuggestedEmailBody,
  buildSuggestedWhatsAppMessage,
  errorMessage,
  formatAtISO,
  formatCurrencyBRL,
  hashString,
  pickEmailPrefill,
  stageToneFromBoardColor,
  uid,
} from './cockpit-utils';

import { CockpitPipelineBar } from './CockpitPipelineBar';
import { CockpitActionPanel } from './CockpitActionPanel';
import { CockpitDataPanel } from './components';
import { CockpitTimeline } from './CockpitTimeline';
import { CockpitChecklist } from './CockpitChecklist';
import { CockpitRightRail } from './CockpitRightRail';
import { TemplatePickerModal } from './TemplatePickerModal';
import { Button } from '@/components/ui/button';

export default function DealCockpitClient({ dealId }: { dealId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { profile, user } = useAuth();

  const { deals } = useCRMActions();
  const dealsCtx = useDeals();
  const { updateDeal, addItemToDeal, removeItemFromDeal } = dealsCtx;
  const { contacts, updateContact } = useContacts();
  const { boards } = useBoards();
  const activitiesCtx = useActivities();
  const { activities, addActivity } = activitiesCtx;
  const crmLoading = dealsCtx.loading || activitiesCtx.loading;
  const crmError = dealsCtx.error || activitiesCtx.error;
  const refreshCRM = useCallback(async () => { await dealsCtx.refresh(); await activitiesCtx.refresh(); }, [dealsCtx, activitiesCtx]);

  const { customFieldDefinitions, products } = useSettings();
  const { darkMode, toggleDarkMode } = useTheme();
  const [debugEnabled, setDebugEnabled] = useState(() => isDebugMode());

  const [toast, setToast] = useState<ToastState | null>(null);

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

  const [preferences, setPreferences] = useState<ContactPreference | null>(null);

  const defaultChecklist: ChecklistItem[] = useMemo(
    () => [
      { id: 'qualify', text: 'Qualificar (dor, urgência, orçamento, decisor)', done: false },
      { id: 'next-step', text: 'Definir próximo passo (data + responsável)', done: false },
      { id: 'materials', text: 'Enviar material / proposta', done: false },
      { id: 'stakeholders', text: 'Mapear decisores e objeções', done: false },
    ],
    []
  );

  const [checklist, setChecklist] = useState<ChecklistItem[]>(defaultChecklist);

  // Broker commission rate (fetched from profiles for the deal owner)
  const [brokerCommissionRate, setBrokerCommissionRate] = useState<number | null>(null);

  const actor: Actor = useMemo(() => {
    const name =
      profile?.nickname?.trim() ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ||
      user?.email?.split('@')[0] ||
      'Usuário';
    return { name, avatar: profile?.avatar_url ?? '' };
  }, [profile?.avatar_url, profile?.first_name, profile?.last_name, profile?.nickname, user?.email]);

  // Performance: build lookup maps once
  const dealsById = useMemo(() => new Map(deals.map((d) => [d.id, d])), [deals]);
  const contactsById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const boardsById = useMemo(() => new Map(boards.map((b) => [b.id, b])), [boards]);

  const activitiesByDealIdSorted = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const a of activities ?? []) {
      if (!a.dealId) continue;
      const list = map.get(a.dealId);
      if (list) list.push(a);
      else map.set(a.dealId, [a]);
    }
    for (const [, list] of map) {
      list.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    }
    return map;
  }, [activities]);

  const selectedDeal = useMemo(() => {
    if (dealId) return dealsById.get(dealId) ?? null;
    return deals[0] ?? null;
  }, [deals, dealsById, dealId]);

  const sortedDeals = useMemo(() => {
    return (deals ?? []).slice().sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  }, [deals]);

  const selectedContact = useMemo(() => {
    if (!selectedDeal) return null;
    return contactsById.get(selectedDeal.contactId) ?? null;
  }, [contactsById, selectedDeal]);

  const selectedBoard = useMemo(() => {
    if (!selectedDeal) return null;
    return boardsById.get(selectedDeal.boardId) ?? null;
  }, [boardsById, selectedDeal]);

  // Fetch broker commission rate when deal owner changes
  useEffect(() => {
    const ownerId = selectedDeal?.ownerId;
    if (!ownerId || !supabase) {
      setBrokerCommissionRate(null);
      return;
    }
    // If the owner is the current user, use profile from context
    if (ownerId === user?.id) {
      setBrokerCommissionRate(profile?.commission_rate ?? null);
      return;
    }
    // Otherwise, fetch from Supabase
    let cancelled = false;
    supabase
      .from('profiles')
      .select('commission_rate')
      .eq('id', ownerId)
      .single()
      .then(({ data }) => {
        if (!cancelled) setBrokerCommissionRate(data?.commission_rate ?? null);
      });
    return () => { cancelled = true; };
  }, [selectedDeal?.ownerId, user?.id, profile?.commission_rate]);

  // Fetch contact preferences
  useEffect(() => {
    if (!selectedContact?.id) { setPreferences(null); return; }
    let cancelled = false;
    contactPreferencesService.getByContactId(selectedContact.id)
      .then(({ data }) => { if (!cancelled) setPreferences(data?.[0] ?? null); })
      .catch(err => console.error('[Cockpit] fetch preferences failed:', err));
    return () => { cancelled = true; };
  }, [selectedContact?.id]);

  // Commission calculation
  const estimatedCommission = useMemo(() => {
    if (!selectedDeal) return null;
    return calculateEstimatedCommission(
      selectedDeal.value,
      selectedDeal.commissionRate,
      brokerCommissionRate,
    );
  }, [selectedDeal, brokerCommissionRate]);

  const templateVariables = useMemo(() => {
    const nome = selectedContact?.name?.split(' ')[0]?.trim() || 'Cliente';
    const valor = typeof selectedDeal?.value === 'number' ? formatCurrencyBRL(selectedDeal.value) : '';
    const produto = selectedDeal?.items?.[0]?.name?.trim() || selectedDeal?.title?.trim() || 'Produto';
    return { nome, valor, produto };
  }, [selectedContact?.name, selectedDeal?.items, selectedDeal?.title, selectedDeal?.value]);

  const dealActivities = useMemo(() => {
    if (!selectedDeal) return [] as Activity[];
    return activitiesByDealIdSorted.get(selectedDeal.id) ?? [];
  }, [activitiesByDealIdSorted, selectedDeal]);

  const { moveDeal } = useMoveDealSimple(selectedBoard as Board | null, []);

  const stages: Stage[] = useMemo(() => {
    const ss: BoardStage[] = selectedBoard?.stages ?? [];
    return ss.map((s) => ({
      id: s.id,
      label: s.label,
      tone: stageToneFromBoardColor(s.color),
      rawColor: s.color,
    }));
  }, [selectedBoard]);

  const stageId = selectedDeal?.status ?? '';
  const stageSelection = useMemo(() => {
    if (!stages.length) return { stageIndex: 0, activeStage: undefined as Stage | undefined };
    let idx = 0;
    for (let i = 0; i < stages.length; i += 1) {
      if (stages[i]?.id === stageId) { idx = i; break; }
    }
    return { stageIndex: Math.max(0, idx), activeStage: stages[idx] ?? stages[0] };
  }, [stageId, stages]);
  const stageIndex = stageSelection.stageIndex;
  const activeStage = stageSelection.activeStage ?? stages[0];

  const { data: aiAnalysis, isLoading: aiLoading, refetch: refetchAI } = useAIDealAnalysis(
    selectedDeal,
    selectedDeal?.stageLabel
  );

  const health = useMemo(() => {
    const probability = aiAnalysis?.probabilityScore ?? selectedDeal?.probability ?? 50;
    return deriveHealthFromProbability(probability);
  }, [aiAnalysis?.probabilityScore, selectedDeal?.probability]);

  const nextBestAction: NextBestAction = useMemo(() => {
    if (aiAnalysis?.action && !aiAnalysis.error) {
      return {
        action: aiAnalysis.action,
        reason: aiAnalysis.reason,
        urgency: aiAnalysis.urgency,
        actionType: aiAnalysis.actionType,
        isAI: true,
      };
    }
    return {
      action: 'Analisar deal manualmente',
      reason: 'Sem sugestão da IA no momento',
      urgency: 'low',
      actionType: 'TASK',
      isAI: false,
    };
  }, [aiAnalysis]);

  const { notes, isLoading: isNotesLoading, createNote, deleteNote } = useDealNotes(selectedDeal?.id);
  const { files, isLoading: isFilesLoading, uploadFile, deleteFile, downloadFile, formatFileSize } = useDealFiles(selectedDeal?.id);
  const { scripts, isLoading: isScriptsLoading, applyVariables, getCategoryInfo } = useQuickScripts();

  const cockpitSnapshot = useMemo(() => {
    if (!selectedDeal) return undefined;
    const stageInfo = activeStage ? { id: activeStage.id, label: activeStage.label, color: activeStage.rawColor ?? '' } : undefined;
    const boardInfo = selectedBoard
      ? {
          id: selectedBoard.id, name: selectedBoard.name, description: selectedBoard.description,
          wonStageId: selectedBoard.wonStageId, lostStageId: selectedBoard.lostStageId,
          stages: (selectedBoard.stages ?? []).map((s) => ({ id: s.id, label: s.label, color: s.color })),
        }
      : undefined;
    const contactInfo = selectedContact
      ? {
          id: selectedContact.id, name: selectedContact.name, email: selectedContact.email,
          phone: selectedContact.phone, avatar: selectedContact.avatar, status: selectedContact.status,
          stage: selectedContact.stage, source: selectedContact.source, notes: selectedContact.notes,
          lastInteraction: selectedContact.lastInteraction, birthDate: selectedContact.birthDate,
          lastPurchaseDate: selectedContact.lastPurchaseDate, totalValue: selectedContact.totalValue,
        }
      : undefined;
    return {
      meta: { generatedAt: new Date().toISOString(), source: 'deal-cockpit', version: 1 },
      deal: {
        id: selectedDeal.id, title: selectedDeal.title, value: selectedDeal.value, status: selectedDeal.status,
        isWon: selectedDeal.isWon, isLost: selectedDeal.isLost, probability: selectedDeal.probability,
        priority: selectedDeal.priority, owner: selectedDeal.owner, ownerId: selectedDeal.ownerId,
        nextActivity: selectedDeal.nextActivity, contactTags: selectedDeal.contactTags, items: selectedDeal.items,
        contactCustomFields: selectedDeal.contactCustomFields, lastStageChangeDate: selectedDeal.lastStageChangeDate,
        lossReason: selectedDeal.lossReason, createdAt: selectedDeal.createdAt, updatedAt: selectedDeal.updatedAt,
        stageLabel: selectedDeal.stageLabel,
      },
      contact: contactInfo, board: boardInfo, stage: stageInfo,
      cockpitSignals: { nextBestAction, aiAnalysis: aiAnalysis ?? null, aiAnalysisLoading: aiLoading },
      lists: {
        activities: { total: dealActivities.length, preview: dealActivities.slice(0, 25).map((a) => ({ id: a.id, type: a.type, title: a.title, description: a.description, date: a.date, completed: a.completed, user: a.user?.name })), limit: 25, truncated: dealActivities.length > 25 },
        notes: { total: notes.length, preview: notes.slice(0, 50).map((n) => ({ id: n.id, content: n.content, created_at: n.created_at, updated_at: n.updated_at, created_by: n.created_by })), loading: isNotesLoading, limit: 50, truncated: notes.length > 50 },
        files: { total: files.length, preview: files.slice(0, 50).map((f) => ({ id: f.id, file_name: f.file_name, file_size: f.file_size, mime_type: f.mime_type, file_path: f.file_path, created_at: f.created_at, created_by: f.created_by })), loading: isFilesLoading, limit: 50, truncated: files.length > 50 },
        scripts: { total: scripts.length, preview: scripts.slice(0, 50).map((s) => ({ id: s.id, title: s.title, category: s.category, template: s.template, icon: s.icon, is_system: s.is_system, updated_at: s.updated_at })), loading: isScriptsLoading, limit: 50, truncated: scripts.length > 50 },
      },
    };
  }, [selectedDeal, selectedContact, selectedBoard, activeStage, dealActivities, notes, files, scripts, nextBestAction, aiAnalysis, aiLoading, isNotesLoading, isFilesLoading, isScriptsLoading]);

  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];
    for (const a of dealActivities) {
      const kind: TimelineItem['kind'] = a.type === 'CALL' ? 'call' : a.type === 'STATUS_CHANGE' ? 'status' : 'note';
      const tone: TimelineItem['tone'] =
        a.type === 'STATUS_CHANGE'
          ? `${a.title ?? ''} ${a.description ?? ''}`.toLowerCase().includes('ganh') ? 'success'
            : `${a.title ?? ''} ${a.description ?? ''}`.toLowerCase().includes('perd') ? 'danger' : 'neutral'
          : undefined;
      const subtitle = a.description?.trim() ? a.description.trim() : undefined;
      items.push({ id: a.id, at: formatAtISO(a.date), sortKey: a.date, kind, title: a.title || a.type, subtitle, tone });
    }
    return items;
  }, [dealActivities]);

  // --- Callbacks ---

  const pushToast = useCallback((message: string, tone: ToastTone = 'neutral') => {
    const id = uid('toast');
    setToast({ id, message, tone });
    window.setTimeout(() => { setToast((prev) => (prev?.id === id ? null : prev)); }, 2400);
  }, []);

  const copyToClipboard = useCallback(async (label: string, text: string) => {
    try { await navigator.clipboard.writeText(text); pushToast(`${label} copiado`, 'success'); }
    catch { pushToast(`Não foi possível copiar ${label.toLowerCase()}`, 'danger'); }
  }, [pushToast]);

  const openMessageComposer = useCallback((channel: MessageChannel, prefill?: { subject?: string; message?: string }, ctx?: MessageLogContext | null) => {
    setMessageChannel(channel); setMessagePrefill(prefill ?? null); setMessageLogContext(ctx ?? null); setIsMessageModalOpen(true);
  }, []);

  const openScheduleModal = useCallback((initial?: { type?: ScheduleType; title?: string; description?: string }) => {
    setScheduleInitial(initial ?? null); setIsScheduleModalOpen(true);
  }, []);

  const openTemplatePicker = useCallback((mode: TemplatePickerMode) => {
    setTemplatePickerMode(mode); setIsTemplatePickerOpen(true);
  }, []);

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

  const setDealInUrl = useCallback((nextDealId: string) => {
    if (pathname?.includes('/deals/') && pathname.endsWith('/cockpit')) {
      if (!nextDealId) return; router.replace(`/deals/${nextDealId}/cockpit`); return;
    }
    const sp = new URLSearchParams(searchParams?.toString());
    if (nextDealId) sp.set('dealId', nextDealId); else sp.delete('dealId');
    router.replace(`?${sp.toString()}`);
  }, [pathname, router, searchParams]);

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

  const handleScheduleSave = useCallback(async (data: ScheduleData) => {
    if (!selectedDeal) return;
    const when = new Date(`${data.date}T${data.time}:00`);
    try {
      await addActivity({ dealId: selectedDeal.id, dealTitle: selectedDeal.title, type: data.type, title: data.title, description: data.description, date: when.toISOString(), completed: false, user: actor });
      pushToast('Atividade agendada', 'success');
    } catch (e) { pushToast(errorMessage(e, 'Não foi possível agendar a atividade.'), 'danger'); }
  }, [addActivity, actor, pushToast, selectedDeal]);

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

  // GANHOU/PERDEU handlers
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
    // Reopen to first stage
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
  }, [preferences?.id]);

  const handleCreatePreferences = useCallback(async () => {
    if (!selectedContact?.id || !profile?.organization_id) return;
    const { data } = await contactPreferencesService.create({
      contactId: selectedContact.id,
      organizationId: profile.organization_id,
      propertyTypes: [], purpose: null, priceMin: null, priceMax: null,
      regions: [], bedroomsMin: null, parkingMin: null, areaMin: null,
      acceptsFinancing: null, acceptsFgts: null, urgency: null, notes: null,
    });
    if (data) setPreferences(data);
  }, [selectedContact?.id, profile?.organization_id]);

  const handleAddItem = useCallback(async (item: { productId?: string; name: string; price: number; quantity: number }) => {
    if (!selectedDeal?.id) return;
    await addItemToDeal(selectedDeal.id, { productId: item.productId ?? '', ...item });
  }, [selectedDeal?.id, addItemToDeal]);

  const handleRemoveItem = useCallback(async (itemId: string) => {
    if (!selectedDeal?.id) return;
    await removeItemFromDeal(selectedDeal.id, itemId);
  }, [selectedDeal?.id, removeItemFromDeal]);

  // --- Render ---

  if (crmError) {
    return (
      <div className="h-dvh bg-background dark:bg-background text-foreground dark:text-muted-foreground flex items-center justify-center p-8">
        <div className="max-w-xl w-full rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold">Cockpit</div>
            <div className="text-xs text-secondary-foreground dark:text-muted-foreground">/deals/[dealId]/cockpit</div>
          </div>
          <div className="mt-3 text-sm">Não foi possível carregar os dados do CRM.</div>
          <div className="mt-2 text-xs text-rose-700 dark:text-rose-100/80 break-words">{crmError}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted" onClick={() => void refreshCRM()}>Recarregar</Button>
            <Button type="button" className="rounded-xl border border-border bg-muted dark:bg-white/5 px-4 py-2 text-xs font-semibold hover:bg-accent dark:hover:bg-white/8" onClick={() => router.push('/boards')}>Ir para Boards</Button>
          </div>
        </div>
      </div>
    );
  }

  if (crmLoading && (!deals || deals.length === 0)) {
    return (
      <div className="h-dvh bg-background dark:bg-background text-foreground dark:text-muted-foreground flex items-center justify-center p-8">
        <div className="max-w-xl w-full rounded-2xl border border-border bg-white dark:bg-white/3 p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold">Cockpit</div>
            <div className="text-xs text-muted-foreground dark:text-muted-foreground">Carregando…</div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="h-4 w-2/3 rounded bg-accent dark:bg-white/10 animate-pulse" />
            <div className="h-4 w-full rounded bg-accent dark:bg-white/10 animate-pulse" />
            <div className="h-4 w-5/6 rounded bg-accent dark:bg-white/10 animate-pulse" />
          </div>
          <div className="mt-4 text-xs text-muted-foreground">Buscando deals, boards e atividades do seu workspace…</div>
        </div>
      </div>
    );
  }

  if (!selectedDeal || !selectedBoard) {
    return (
      <div className="h-dvh bg-background dark:bg-background text-foreground dark:text-muted-foreground flex items-center justify-center p-8">
        <div className="max-w-xl w-full rounded-2xl border border-border bg-white dark:bg-white/3 p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold">Cockpit</div>
            <div className="text-xs text-muted-foreground dark:text-muted-foreground">/deals/[dealId]/cockpit</div>
          </div>
          <div className="mt-3 text-sm text-secondary-foreground dark:text-muted-foreground">Não encontrei nenhum deal carregado no contexto.</div>
          <div className="mt-2 text-xs text-muted-foreground">Dica: abra o app normal (Boards) para carregar dados.</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted" onClick={() => void refreshCRM()}>Recarregar</Button>
            <Button type="button" className="rounded-xl border border-border bg-muted dark:bg-white/5 px-4 py-2 text-xs font-semibold hover:bg-accent dark:hover:bg-white/8" onClick={() => router.push('/boards')}>Ir para Boards</Button>
          </div>
        </div>
      </div>
    );
  }

  const deal = selectedDeal;
  const board = selectedBoard;
  const contact = selectedContact;
  const phoneE164 = normalizePhoneE164(contact?.phone);

  return (
    <div className="fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-50 flex flex-col overflow-hidden bg-background dark:bg-background text-foreground dark:text-muted-foreground">
      {toast ? (
        <div className="fixed right-6 top-6 z-50">
          <div
            className={toast.tone ==='success'
                ? 'flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-100 shadow-xl shadow-border/30 dark:shadow-black/30'
                : toast.tone === 'danger'
                  ? 'flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/15 px-4 py-3 text-sm text-rose-700 dark:text-rose-100 shadow-xl shadow-border/30 dark:shadow-black/30'
                  : 'flex items-center gap-2 rounded-2xl border border-border  bg-muted dark:bg-white/8 px-4 py-3 text-sm shadow-xl shadow-border/30 dark:shadow-black/30'
            }
            role="status"
            aria-live="polite"
          >
            {toast.tone === 'success' ? <Check className="h-4 w-4" /> : toast.tone === 'danger' ? <X className="h-4 w-4" /> : null}
            <div className="min-w-0 truncate">{toast.message}</div>
          </div>
        </div>
      ) : null}

      <CockpitPipelineBar
        deal={deal}
        boardName={board.name ?? 'Pipeline'}
        sortedDeals={sortedDeals}
        stages={stages}
        stageIndex={stageIndex}
        activeStage={activeStage}
        crmLoading={crmLoading}
        onDealChange={setDealInUrl}
        onStageChange={(id) => void handleStageChange(id)}
        onBack={() => router.push('/boards')}
        onWin={() => void handleWin()}
        onLoss={() => void handleLoss()}
        isWon={deal.isWon ?? false}
        isLost={deal.isLost ?? false}
        onReopen={() => void handleReopen()}
        headerControls={
          <div className="flex items-center gap-1">
            <Button
              type="button"
              onClick={() => { if (debugEnabled) { disableDebugMode(); setDebugEnabled(false); } else { enableDebugMode(); setDebugEnabled(true); } }}
              className={`p-1.5 rounded-lg transition-colors ${debugEnabled ? 'text-purple-500 dark:text-purple-400 bg-purple-500/15' : 'text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground hover:bg-muted dark:hover:bg-white/5'}`}
              title="Debug mode"
            >
              <Bug className="h-3.5 w-3.5" />
            </Button>
            <div className="flex items-center [&_button]:p-1.5 [&_button]:rounded-lg [&_svg]:!w-3.5 [&_svg]:!h-3.5">
              <NotificationPopover />
            </div>
            <Button
              type="button"
              onClick={toggleDarkMode}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 transition-colors"
              title="Alternar tema"
            >
              {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
          </div>
        }
      />

      <div className="flex-1 min-h-0 w-full overflow-hidden px-6 py-4 2xl:px-10">
        <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[340px_1fr_400px] lg:items-stretch">
          {/* Left rail — ações + dados */}
          <div className="flex min-h-0 flex-col gap-3 overflow-auto pr-1">
            <CockpitActionPanel
              health={health}
              aiLoading={aiLoading}
              onRefetchAI={() => void refetchAI()}
              nextBestAction={nextBestAction}
              onExecuteNext={() => void handleExecuteNext()}
              onCall={handleCall}
              onOpenMessageComposer={openMessageComposer}
              onOpenScheduleModal={openScheduleModal}
              onOpenTemplatePicker={openTemplatePicker}
              buildWhatsAppMessage={() =>
                buildSuggestedWhatsAppMessage({ contact: contact ?? undefined, deal, actionType: nextBestAction.actionType, action: nextBestAction.action, reason: nextBestAction.reason })
              }
              buildEmailBody={() =>
                buildSuggestedEmailBody({ contact: contact ?? undefined, deal, actionType: nextBestAction.actionType, action: nextBestAction.action, reason: nextBestAction.reason })
              }
              dealTitle={deal.title}
              isScriptsLoading={isScriptsLoading}
              scriptsCount={scripts.length}
            />
            <CockpitDataPanel
              deal={deal}
              contact={contact}
              phoneE164={phoneE164}
              onCopy={(label, text) => void copyToClipboard(label, text)}
              estimatedCommission={estimatedCommission}
              preferences={preferences}
              customFieldDefinitions={customFieldDefinitions}
              products={products}
              onUpdateDeal={handleUpdateDeal}
              onUpdateContact={handleUpdateContact}
              onUpdatePreferences={handleUpdatePreferences}
              onCreatePreferences={handleCreatePreferences}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
            />
          </div>

          {/* Center */}
          <div className="flex min-h-0 flex-col gap-4">
            <CockpitTimeline
              timelineItems={timelineItems}
              actor={actor}
              dealId={deal.id}
              dealTitle={deal.title}
              addActivity={addActivity}
              pushToast={pushToast}
              notes={notes}
              isNotesLoading={isNotesLoading}
            />

            <CockpitChecklist
              checklist={checklist}
              onPersistChecklist={(next) => void persistChecklist(next)}
              onReload={loadChecklistFromDeal}
            />
          </div>

          {/* Right rail — IA + ferramentas */}
          <CockpitRightRail
            dealId={deal.id}
            dealTitle={deal.title}
            boardId={board.id}
            contactId={contact?.id}
            cockpitSnapshot={cockpitSnapshot}
            notes={notes}
            isNotesLoading={isNotesLoading}
            createNote={createNote}
            deleteNote={deleteNote}
            files={files}
            isFilesLoading={isFilesLoading}
            uploadFile={uploadFile}
            deleteFile={deleteFile}
            downloadFile={downloadFile}
            formatFileSize={formatFileSize}
            scripts={scripts}
            isScriptsLoading={isScriptsLoading}
            applyVariables={applyVariables}
            getCategoryInfo={getCategoryInfo}
            templateVariables={templateVariables}
            contactNotes={contact?.notes ?? null}
            onUpdateContactNotes={(notes) => { if (contact?.id) updateContact(contact.id, { notes } as Parameters<typeof updateContact>[1]); }}
            crmLoading={crmLoading}
            onRefreshCRM={() => void refreshCRM()}
            onCopy={(label, text) => void copyToClipboard(label, text)}
            pushToast={pushToast}
          />
        </div>
      </div>

      <CallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        onSave={handleCallLogSave}
        contactName={contact?.name || 'Contato'}
        contactPhone={contact?.phone || ''}
        suggestedTitle={callSuggestedTitle}
      />

      <TemplatePickerModal
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
        mode={templatePickerMode}
        scripts={scripts}
        isLoading={isScriptsLoading}
        variables={templateVariables}
        applyVariables={applyVariables}
        getCategoryInfo={getCategoryInfo}
        onPick={handlePickTemplate}
      />

      <MessageComposerModal
        isOpen={isMessageModalOpen}
        onClose={() => { setIsMessageModalOpen(false); setMessagePrefill(null); setMessageLogContext(null); }}
        channel={messageChannel}
        contactName={contact?.name || 'Contato'}
        contactEmail={contact?.email}
        contactPhone={contact?.phone}
        initialSubject={messagePrefill?.subject}
        initialMessage={messagePrefill?.message}
        onExecuted={(ev) => void handleMessageExecuted(ev)}
        aiContext={{
          cockpitSnapshot,
          nextBestAction: { action: nextBestAction.action, reason: nextBestAction.reason, actionType: nextBestAction.actionType as 'CALL' | 'MEETING' | 'EMAIL' | 'TASK' | 'WHATSAPP', urgency: nextBestAction.urgency as 'low' | 'medium' | 'high' },
        }}
      />

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => { setIsScheduleModalOpen(false); setScheduleInitial(null); }}
        onSave={(data) => void handleScheduleSave(data)}
        contactName={contact?.name || 'Contato'}
        initialType={scheduleInitial?.type}
        initialTitle={scheduleInitial?.title}
        initialDescription={scheduleInitial?.description}
      />
    </div>
  );
}
