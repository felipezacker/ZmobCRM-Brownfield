import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import { useCRMActions } from '@/hooks/useCRMActions';
import { useContacts } from '@/context/contacts/ContactsContext';
import { useDeals } from '@/context/deals/DealsContext';
import { useActivities } from '@/context/activities/ActivitiesContext';
import { useBoards } from '@/context/boards/BoardsContext';
import { useSettings } from '@/context/settings/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { dealNotesService, type DealNote } from '@/lib/supabase/dealNotes';
import ConfirmModal from '@/components/ConfirmModal';
import { LossReasonModal } from '@/components/ui/LossReasonModal';
import { useMoveDealSimple } from '@/lib/query/hooks';
import { FocusTrap, useFocusReturn } from '@/lib/a11y';
import { Activity } from '@/types';
import { useResponsiveMode } from '@/hooks/useResponsiveMode';
import { DealSheet } from '../DealSheet';
import {
  analyzeLead,
  generateEmailDraft,
  generateObjectionResponse,
} from '@/lib/ai/tasksClient';
import { useRouter } from 'next/navigation';
import {
  BrainCircuit,
  Mail,
  Phone,
  Check,
  Search,
  X,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  User,
  Package,
  Sword,
  Bot,
  Tag as TagIcon,
  Maximize2,
  Copy,
  MessageSquare,
  StickyNote,
} from 'lucide-react';
import { StageProgressBar } from '../StageProgressBar';
import { ActivityRow } from '@/features/activities/components/ActivityRow';
import { ActivityFormModal } from '@/features/activities/components/ActivityFormModal';
import { formatPriorityPtBr } from '@/lib/utils/priority';
import { CorretorSelect } from '@/components/ui/CorretorSelect';
import { Button } from '@/app/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { calculateEstimatedCommission } from '@/lib/supabase';
import { contactPreferencesService } from '@/lib/supabase/contact-preferences';
import type { ContactPreference, ContactTemperature, ContactClassification, PreferenceUrgency, PreferencePurpose, PropertyType } from '@/types';

type TimelineItem =
  | { kind: 'activity'; data: Activity; date: string }
  | { kind: 'note'; data: DealNote; date: string };

interface DealDetailModalProps {
  dealId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// Performance: reuse formatter instances.
const PT_BR_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR');
const BRL_CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Componente React `DealDetailModal`.
 *
 * @param {DealDetailModalProps} { dealId, isOpen, onClose } - Parâmetro `{ dealId, isOpen, onClose }`.
 * @returns {Element | null} Retorna um valor do tipo `Element | null`.
 */
export const DealDetailModal: React.FC<DealDetailModalProps> = ({ dealId, isOpen, onClose }) => {
  // Accessibility: Unique ID for ARIA labelling
  const headingId = useId();

  // Accessibility: Return focus to trigger element when modal closes
  useFocusReturn({ enabled: isOpen });

  const { mode } = useResponsiveMode();
  const isMobile = mode === 'mobile';

  const { deals } = useCRMActions();
  const { contacts, updateContact } = useContacts();
  const { updateDeal, deleteDeal, addItemToDeal, removeItemFromDeal } = useDeals();
  const { activities, addActivity, updateActivity, deleteActivity } = useActivities();
  const { activeBoard, boards } = useBoards();
  const { products, customFieldDefinitions, lifecycleStages } = useSettings();
  const { profile } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  // Performance: avoid repeated `find(...)` on large arrays.
  const dealsById = useMemo(() => new Map(deals.map((d) => [d.id, d])), [deals]);
  const contactsById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const boardsById = useMemo(() => new Map(boards.map((b) => [b.id, b])), [boards]);
  const lifecycleStageById = useMemo(() => new Map(lifecycleStages.map((s) => [s.id, s])), [lifecycleStages]);
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const activitiesById = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities]);

  const deal = dealId ? dealsById.get(dealId) : undefined;
  const contact = deal ? (contactsById.get(deal.contactId) ?? null) : null;

  // Determine the correct board for this deal
  const dealBoard = deal ? (boardsById.get(deal.boardId) ?? activeBoard) : activeBoard;

  // Use unified TanStack Query hook for moving deals
  const { moveDeal } = useMoveDealSimple(dealBoard, lifecycleStages);

  const [isEditingValue, setIsEditingValue] = useState(false);
  const [editValue, setEditValue] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [aiResult, setAiResult] = useState<{ suggestion: string; score: number } | null>(null);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState<'timeline' | 'products' | 'info'>('timeline');
  const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [objection, setObjection] = useState('');
  const [objectionResponses, setObjectionResponses] = useState<string[]>([]);
  const [isGeneratingObjections, setIsGeneratingObjections] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const productPickerRef = useRef<HTMLDivElement>(null);
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  const [productQuantity, setProductQuantity] = useState(1);
  const [showCustomItem, setShowCustomItem] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState<string>('0');
  const [customItemQuantity, setCustomItemQuantity] = useState(1);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return productsById.get(selectedProductId) ?? null;
  }, [selectedProductId, productsById]);

  // Deal notes for timeline
  const [dealNotes, setDealNotes] = useState<DealNote[]>([]);

  // Contact preferences
  const [preferences, setPreferences] = useState<ContactPreference | null>(null);

  // Activity editing state
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);
  const [activityFormData, setActivityFormData] = useState({
    title: '',
    type: 'TASK' as Activity['type'],
    date: '',
    time: '',
    description: '',
    dealId: '',
    recurrenceType: 'none' as 'none' | 'daily' | 'weekly' | 'monthly',
    recurrenceEndDate: '',
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showLossReasonModal, setShowLossReasonModal] = useState(false);
  const [pendingLostStageId, setPendingLostStageId] = useState<string | null>(null);
  const [lossReasonOrigin, setLossReasonOrigin] = useState<'button' | 'stage'>('button');

  // Broker commission rate for estimated commission display
  const [brokerCommissionRate, setBrokerCommissionRate] = useState<number | null>(null);
  // Product picker: click-outside
  useEffect(() => {
    if (!productPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (productPickerRef.current && !productPickerRef.current.contains(e.target as Node)) {
        setProductPickerOpen(false);
        setProductSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [productPickerOpen]);

  // Product picker: auto-focus search
  useEffect(() => {
    if (productPickerOpen) productSearchInputRef.current?.focus();
  }, [productPickerOpen]);

  useEffect(() => {
    const ownerId = deal?.ownerId;
    if (!ownerId || !supabase) { setBrokerCommissionRate(null); return; }
    if (ownerId === profile?.id) { setBrokerCommissionRate(profile?.commission_rate ?? null); return; }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('commission_rate')
      .eq('id', ownerId)
      .single()
      .then(({ data }) => { if (!cancelled) setBrokerCommissionRate(data?.commission_rate ?? null); });
    return () => { cancelled = true; };
  }, [deal?.ownerId, profile?.id, profile?.commission_rate]);

  // Fetch contact preferences
  useEffect(() => {
    if (!contact?.id) { setPreferences(null); return; }
    let cancelled = false;
    contactPreferencesService.getByContactId(contact.id).then(({ data }) => {
      if (!cancelled) setPreferences(data?.[0] ?? null);
    }).catch(err => console.error('[DealDetailModal] fetch preferences failed:', err));
    return () => { cancelled = true; };
  }, [contact?.id]);

  // Fetch deal notes for timeline
  const fetchDealNotes = useMemo(() => {
    if (!deal?.id) return () => {};
    return () => {
      dealNotesService.getNotesForDeal(deal.id).then(({ data }) => {
        setDealNotes(data ?? []);
      }).catch(err => console.error('[DealDetailModal] fetch deal notes failed:', err));
    };
  }, [deal?.id]);

  useEffect(() => {
    if (!deal?.id) { setDealNotes([]); return; }
    fetchDealNotes();
  }, [deal?.id, fetchDealNotes]);

  const estimatedCommission = useMemo(() => {
    if (!deal) return null;
    return calculateEstimatedCommission(deal.value, deal.commissionRate, brokerCommissionRate);
  }, [deal, brokerCommissionRate]);

  // Reset state when deal changes or modal opens
  useEffect(() => {
    if (isOpen && deal) {
      setEditValue(deal.value.toString());
      setAiResult(null);
      setEmailDraft(null);
      setObjectionResponses([]);
      setObjection('');
      setActiveTab('timeline');
      setIsEditingValue(false);
      setShowLossReasonModal(false);
      setPendingLostStageId(null);
      setLossReasonOrigin('button');
    }
  }, [isOpen, dealId]); // Depend on dealId to reset when switching deals

  // UX: preselect board's default product when opening the Products tab (non-invasive).
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab !== 'products') return;
    const defaultId = dealBoard?.defaultProductId;
    if (!defaultId) return;
    if (selectedProductId) return;
    // Only suggest if product exists & is active.
    const p = productsById.get(defaultId);
    if (!p || p.active === false) return;
    setSelectedProductId(defaultId);
    setProductQuantity(1);
  }, [activeTab, dealBoard?.defaultProductId, isOpen, productsById, selectedProductId]);

  // Pre-compute stage label once for tool prompts (avoid repeated stage lookup).
  const stageLabel = useMemo(() => {
    if (!dealBoard) return undefined;
    const stage = dealBoard.stages.find((s) => s.id === deal?.status);
    return stage?.label;
  }, [deal?.status, dealBoard]);

  // Performance: filter deal activities once per deal change (avoid filtering inside render).
  const dealActivities = useMemo(() => {
    if (!deal) return [] as Activity[];
    return activities.filter((a) => a.dealId === deal.id);
  }, [activities, deal]);

  const timelineFeed = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    for (const a of dealActivities) {
      items.push({ kind: 'activity', data: a, date: a.date });
    }
    for (const n of dealNotes) {
      items.push({ kind: 'note', data: n, date: n.created_at });
    }
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
  }, [dealActivities, dealNotes]);

  if (!isOpen || !deal) return null;

  // Tags/custom fields are now on the contact (read-only in deal view)

  const handleAnalyzeDeal = async () => {
    setIsAnalyzing(true);
    try {
      // Performance: stageLabel memoized above.
      const result = await analyzeLead(deal, stageLabel);
      setAiResult({ suggestion: result.suggestion, score: result.probabilityScore });
      updateDeal(deal.id, { aiSummary: result.suggestion, probability: result.probabilityScore });
    } catch (error: any) {
      console.error('[DealDetailModal] analyzeLead failed:', error);
      addToast(
        error?.message || 'Falha ao analisar deal com IA. Verifique Configurações → Inteligência Artificial.',
        'warning'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDraftEmail = async () => {
    setIsDrafting(true);
    try {
      // Performance: stageLabel memoized above.
      const draft = await generateEmailDraft(deal, stageLabel);
      setEmailDraft(draft);
    } catch (error: any) {
      console.error('[DealDetailModal] generateEmailDraft failed:', error);
      addToast(
        error?.message || 'Falha ao gerar e-mail com IA. Verifique Configurações → Inteligência Artificial.',
        'warning'
      );
    } finally {
      setIsDrafting(false);
    }
  };


  const handleObjection = async () => {
    if (!objection.trim()) return;
    setIsGeneratingObjections(true);
    try {
      const responses = await generateObjectionResponse(deal, objection);
      setObjectionResponses(responses);
    } catch (error: any) {
      console.error('[DealDetailModal] generateObjectionResponse failed:', error);
      addToast(
        error?.message || 'Falha ao gerar respostas. Verifique Configurações → Inteligência Artificial.',
        'warning'
      );
    } finally {
      setIsGeneratingObjections(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    const orgId = profile?.organization_id;
    const { error } = await dealNotesService.createNote(deal.id, newNote.trim(), orgId ?? undefined);

    if (error) {
      console.error('[DealDetailModal] Erro ao salvar nota em deal_notes:', error);
      addToast('Falha ao salvar nota. Tente novamente.', 'warning');
      return;
    }

    setNewNote('');
    fetchDealNotes();
    addToast('Nota salva', 'success');
  };

  const handleAddProduct = async () => {
    if (!selectedProductId) return;
    const product = productsById.get(selectedProductId);
    if (!product) return;

    const result = await addItemToDeal(deal.id, {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: productQuantity,
    });

    if (!result) {
      addToast('Erro ao adicionar produto. Tente novamente.', 'warning');
      return;
    }

    addToast(`${product.name} adicionado`, 'success');
    setSelectedProductId('');
    setProductSearch('');
    setProductPickerOpen(false);
    setProductQuantity(1);
  };

  const handleAddCustomItem = async () => {
    const name = customItemName.trim();
    const price = Number(customItemPrice);
    const qty = Number(customItemQuantity);
    if (!name) {
      addToast('Digite o nome do item.', 'warning');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      addToast('Preço inválido.', 'warning');
      return;
    }
    if (!Number.isFinite(qty) || qty < 1) {
      addToast('Quantidade inválida.', 'warning');
      return;
    }

    // "Produto depende do cliente": item livre, sem product_id.
    const result = await addItemToDeal(deal.id, {
      productId: '', // deal_items.product_id é opcional no schema; sanitizeUUID('') => null
      name,
      price,
      quantity: qty,
    });

    if (!result) {
      addToast('Erro ao adicionar item. Tente novamente.', 'warning');
      return;
    }

    addToast(`${name} adicionado`, 'success');
    setCustomItemName('');
    setCustomItemPrice('0');
    setCustomItemQuantity(1);
    setShowCustomItem(false);
  };

  const confirmDeleteDeal = () => {
    if (deleteId) {
      deleteDeal(deleteId);
      addToast('Negócio excluído com sucesso', 'success');
      setDeleteId(null);
      onClose();
    }
  };

  const saveValue = () => {
    if (editValue) {
      updateDeal(deal.id, { value: Number(editValue) });
      setIsEditingValue(false);
    }
  };

  // updateCustomField removed — custom fields moved to contact

  // dealActivities memoized above.

  // Handle escape key to close modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isEditingValue) {
      onClose();
    }
  };

  const inner = (
    <>
      <div
        className={
          isMobile
            ? 'bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 w-full h-[100dvh] flex flex-col overflow-hidden pb-[var(--app-safe-area-bottom,0px)]'
            : 'bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200'
        }
      >
        {/* HEADER */}
        <div className="bg-slate-50 dark:bg-[#0b1222] border-b border-slate-200 dark:border-white/[0.06] px-6 pt-5 pb-4 shrink-0">
          {/* Row 1: Lead name + product + action icons */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-400/20 flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-300 shrink-0">
              {(deal.contactName || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 id={headingId} className="text-base font-semibold text-slate-900 dark:text-white tracking-tight truncate leading-tight">
                {deal.contactName || 'Sem contato'}
              </h2>
              {deal.items && deal.items.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5" title={deal.items[0].name}>
                  {deal.items[0].name}
                  {deal.items.length > 1 && (
                    <span className="text-slate-400 dark:text-slate-500 ml-1">+{deal.items.length - 1}</span>
                  )}
                </p>
              )}
            </div>
            <div className="flex gap-0.5 items-center shrink-0">
              <Button
                onClick={() => { onClose(); router.push(`/deals/${deal.id}/cockpit`); }}
                className="text-slate-400 hover:text-primary-500 dark:text-slate-500 dark:hover:text-primary-400 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
                title="Abrir Cockpit"
              >
                <Maximize2 size={18} />
              </Button>
              <Button
                onClick={() => setDeleteId(deal.id)}
                className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
                title="Excluir Negócio"
              >
                <Trash2 size={18} />
              </Button>
              <Button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <X size={18} />
              </Button>
            </div>
          </div>

          {/* Row 2: Value + Corretor + Win/Loss */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Valor editavel */}
            <div className="shrink-0">
              {isEditingValue ? (
                <div className="flex gap-2 items-center">
                  <span className="text-lg font-mono font-bold text-slate-500">R$</span>
                  <input
                    autoFocus
                    type="number"
                    className="text-lg font-mono font-bold text-primary-600 dark:text-primary-400 bg-white dark:bg-black/30 border border-slate-300 dark:border-primary-500/20 rounded-lg px-2.5 py-1 w-36 outline-none focus:ring-2 focus:ring-primary-500/40"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={saveValue}
                    onKeyDown={e => e.key === 'Enter' && saveValue()}
                  />
                  <Button onClick={saveValue} className="text-green-500 hover:text-green-400">
                    <Check size={18} />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => { setEditValue(deal.value.toString()); setIsEditingValue(true); }}
                  className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  title="Clique para editar valor"
                >
                  {BRL_CURRENCY.format(deal.value)}
                </Button>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-white/[0.06] shrink-0" />

            {/* Corretor Select */}
            <div className="w-44 shrink-0">
              <CorretorSelect
                value={deal.ownerId || profile?.id}
                onChange={(newOwnerId) => updateDeal(deal.id, { ownerId: newOwnerId })}
              />
            </div>

            <div className="flex-1" />

            {/* GANHO / PERDIDO / Reabrir */}
            <div className="flex gap-2 items-center shrink-0">
              {(deal.isWon || deal.isLost) ? (
                <>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                    deal.isWon
                      ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 dark:shadow-[0_0_12px_rgba(34,197,94,0.15)]'
                      : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 dark:shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                  }`}>
                    {deal.isWon ? '✓ GANHO' : '✗ PERDIDO'}
                  </span>
                  <Button
                    onClick={() => {
                      const firstRegularStage = dealBoard?.stages.find(
                        s => s.linkedLifecycleStage !== 'CUSTOMER' && s.linkedLifecycleStage !== 'OTHER'
                      );
                      if (firstRegularStage) { moveDeal(deal, firstRegularStage.id); }
                      else { updateDeal(deal.id, { isWon: false, isLost: false, closedAt: undefined }); }
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all border border-transparent dark:border-white/[0.06]"
                  >
                    ↩ Reabrir
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => {
                      if (dealBoard?.wonStayInStage) { moveDeal(deal, deal.status, undefined, true, false); onClose(); return; }
                      if (dealBoard?.wonStageId) { moveDeal(deal, dealBoard.wonStageId); onClose(); return; }
                      const successStage = dealBoard?.stages.find(s => s.linkedLifecycleStage === 'CUSTOMER')
                        || dealBoard?.stages.find(s => s.linkedLifecycleStage === 'MQL')
                        || dealBoard?.stages.find(s => s.linkedLifecycleStage === 'SALES_QUALIFIED');
                      if (successStage) { moveDeal(deal, successStage.id); }
                      else { updateDeal(deal.id, { isWon: true, isLost: false, closedAt: new Date().toISOString() }); }
                      onClose();
                    }}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-500 dark:bg-green-600/90 dark:hover:bg-green-500 text-white rounded-lg font-bold text-sm shadow-sm dark:shadow-[0_0_16px_rgba(34,197,94,0.2)] flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                  >
                    <ThumbsUp size={14} /> GANHO
                  </Button>
                  <Button
                    onClick={() => {
                      if (dealBoard?.lostStageId) { setPendingLostStageId(dealBoard.lostStageId); }
                      setLossReasonOrigin('button');
                      setShowLossReasonModal(true);
                    }}
                    className="px-4 py-1.5 bg-transparent border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg font-bold text-sm flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                  >
                    <ThumbsDown size={14} /> PERDIDO
                  </Button>
                </>
              )}
            </div>
          </div>

          {dealBoard ? (
            <StageProgressBar
              stages={dealBoard.stages}
              currentStatus={deal.status}
              variant="timeline"
              onStageClick={stageId => {
                // Check if clicking on a LOST stage
                const targetStage = dealBoard.stages.find(s => s.id === stageId);
                // Check if it matches configured Lost Stage OR explicitly linked 'OTHER' stage
                const isLostStage =
                  dealBoard.lostStageId === stageId ||
                  targetStage?.linkedLifecycleStage === 'OTHER';

                if (isLostStage) {
                  // Show loss reason modal
                  setPendingLostStageId(stageId);
                  setLossReasonOrigin('stage');
                  setShowLossReasonModal(true);
                } else {
                  // Regular move
                  moveDeal(deal, stageId);
                }
              }}
            />
          ) : (
            <div className="mt-4 rounded-lg border border-slate-200/60 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              Board não encontrado para este negócio. Algumas ações (mover estágio) podem ficar indisponíveis.
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Left Sidebar */}
          <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/5 p-4 sm:p-5 overflow-y-auto bg-white dark:bg-dark-card max-h-[38vh] md:max-h-none">
            <div className="space-y-4">
              {/* CONTATO (editável) */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                  <User size={14} /> Contato
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">
                    {(deal.contactName || '?').charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-900 dark:text-white font-medium text-sm flex items-center gap-2">
                      {deal.contactName || 'Sem contato'}
                      {contact?.stage &&
                        (() => {
                          const stage = lifecycleStageById.get(contact.stage);
                          if (!stage) return null;
                          return (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-wider text-white ${stage.color}`}>
                              {stage.name}
                            </span>
                          );
                        })()}
                    </p>
                    {/* Phone — editable inline */}
                    <div className="flex items-center gap-1 mt-1">
                      <Phone size={11} className="text-slate-400 shrink-0" />
                      <input
                        key={`phone-${contact?.id}`}
                        type="tel"
                        defaultValue={contact?.phone || ''}
                        onBlur={e => contact && updateContact(contact.id, { phone: e.target.value })}
                        placeholder="Telefone"
                        className="text-xs text-slate-700 dark:text-slate-200 bg-transparent outline-none w-full placeholder:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 rounded px-1 py-0.5 transition-colors focus:ring-1 focus:ring-primary-500 focus:bg-white dark:focus:bg-white/5"
                      />
                      {contact?.phone && (
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(contact.phone || '').catch(() => {});
                            addToast('Telefone copiado', 'success');
                          }}
                          className="text-slate-400 hover:text-primary-500 transition-colors shrink-0"
                          title="Copiar telefone"
                        >
                          <Copy size={11} />
                        </Button>
                      )}
                    </div>
                    {/* Email — editable inline */}
                    <div className="flex items-center gap-1 mt-0.5">
                      <Mail size={11} className="text-slate-400 shrink-0" />
                      <input
                        key={`email-${contact?.id}`}
                        type="email"
                        defaultValue={contact?.email || ''}
                        onBlur={e => contact && updateContact(contact.id, { email: e.target.value })}
                        placeholder="Email"
                        className="text-xs text-slate-700 dark:text-slate-200 bg-transparent outline-none w-full placeholder:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 rounded px-1 py-0.5 transition-colors focus:ring-1 focus:ring-primary-500 focus:bg-white dark:focus:bg-white/5 truncate"
                      />
                    </div>
                  </div>
                </div>

                {/* Temperature + Classification (editable selects) */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={contact?.temperature || ''}
                    onChange={e => contact && updateContact(contact.id, { temperature: (e.target.value || undefined) as ContactTemperature | undefined })}
                    className={`text-[11px] font-semibold bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer ${
                      contact?.temperature === 'HOT' ? 'text-red-500' :
                      contact?.temperature === 'WARM' ? 'text-amber-500' :
                      contact?.temperature === 'COLD' ? 'text-blue-500' : 'text-slate-400'
                    }`}
                  >
                    <option value="">Temperatura</option>
                    <option value="HOT">🔥 Quente</option>
                    <option value="WARM">🌡️ Morno</option>
                    <option value="COLD">❄️ Frio</option>
                  </select>
                  <select
                    value={contact?.classification || ''}
                    onChange={e => contact && updateContact(contact.id, { classification: (e.target.value || undefined) as ContactClassification | undefined })}
                    className="text-[11px] font-semibold bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer text-slate-700 dark:text-slate-200"
                  >
                    <option value="">Classificação</option>
                    <option value="COMPRADOR">Comprador</option>
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="LOCATARIO">Locatário</option>
                    <option value="LOCADOR">Locador</option>
                    <option value="INVESTIDOR">Investidor</option>
                    <option value="PERMUTANTE">Permutante</option>
                  </select>
                </div>

                {/* Lead Score bar (read-only — score é calculado) */}
                {contact?.leadScore != null && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Score</span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all ${
                          contact.leadScore <= 30 ? 'bg-red-500' :
                          contact.leadScore <= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, contact.leadScore)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {contact.leadScore}
                      <span className="ml-1 text-[10px] font-normal text-slate-400">
                        {contact.leadScore <= 30 ? 'Frio' : contact.leadScore <= 60 ? 'Morno' : 'Quente'}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* PREFERÊNCIAS (editável) */}
              <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                  Preferências
                  {!preferences && contact && (
                    <Button
                      onClick={async () => {
                        const orgId = profile?.organization_id;
                        if (!contact || !orgId) return;
                        const { data } = await contactPreferencesService.create({
                          contactId: contact.id,
                          propertyTypes: [],
                          purpose: null,
                          priceMin: null,
                          priceMax: null,
                          regions: [],
                          bedroomsMin: null,
                          parkingMin: null,
                          areaMin: null,
                          acceptsFinancing: null,
                          acceptsFgts: null,
                          urgency: null,
                          notes: null,
                          organizationId: orgId,
                        });
                        if (data) setPreferences(data);
                      }}
                      className="text-[10px] text-primary-500 hover:text-primary-600 font-medium"
                      title="Criar preferências"
                    >
                      + Adicionar
                    </Button>
                  )}
                </h3>
                {preferences ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-xs">Finalidade</span>
                      <select
                        value={preferences.purpose || ''}
                        onChange={e => {
                          const val = (e.target.value || null) as PreferencePurpose | null;
                          contactPreferencesService.update(preferences.id, { purpose: val });
                          setPreferences(p => p ? { ...p, purpose: val } : p);
                        }}
                        className="text-xs text-slate-900 dark:text-white bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                      >
                        <option value="">—</option>
                        <option value="MORADIA">Moradia</option>
                        <option value="INVESTIMENTO">Investimento</option>
                        <option value="VERANEIO">Veraneio</option>
                      </select>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-xs">Tipos</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {(['APARTAMENTO', 'CASA', 'TERRENO', 'COMERCIAL', 'RURAL', 'GALPAO'] as PropertyType[]).map(pt => (
                          <Button
                            key={pt}
                            onClick={() => {
                              const current = preferences.propertyTypes;
                              const next = current.includes(pt)
                                ? current.filter(t => t !== pt)
                                : [...current, pt];
                              contactPreferencesService.update(preferences.id, { propertyTypes: next });
                              setPreferences(p => p ? { ...p, propertyTypes: next } : p);
                            }}
                            className={`text-[9px] px-1.5 py-0.5 rounded-full border transition-colors ${
                              preferences.propertyTypes.includes(pt)
                                ? 'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-500/10 dark:text-primary-400 dark:border-primary-500/20'
                                : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-white/5 dark:border-white/10 hover:text-slate-600'
                            }`}
                          >
                            {pt.charAt(0) + pt.slice(1).toLowerCase()}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-slate-500 text-xs">Faixa R$</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={preferences.priceMin ?? ''}
                          onChange={e => {
                            const val = e.target.value ? Number(e.target.value) : null;
                            setPreferences(p => p ? { ...p, priceMin: val } : p);
                          }}
                          onBlur={e => {
                            const val = e.target.value ? Number(e.target.value) : null;
                            contactPreferencesService.update(preferences.id, { priceMin: val });
                          }}
                          placeholder="Mín"
                          className="w-20 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 text-slate-900 dark:text-white"
                        />
                        <span className="text-slate-400 text-xs">–</span>
                        <input
                          type="number"
                          value={preferences.priceMax ?? ''}
                          onChange={e => {
                            const val = e.target.value ? Number(e.target.value) : null;
                            setPreferences(p => p ? { ...p, priceMax: val } : p);
                          }}
                          onBlur={e => {
                            const val = e.target.value ? Number(e.target.value) : null;
                            contactPreferencesService.update(preferences.id, { priceMax: val });
                          }}
                          placeholder="Máx"
                          className="w-20 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-xs">Regiões</span>
                      <input
                        type="text"
                        value={preferences.regions.join(', ')}
                        onChange={e => {
                          const val = e.target.value.split(',').map(r => r.trim()).filter(Boolean);
                          setPreferences(p => p ? { ...p, regions: val } : p);
                        }}
                        onBlur={e => {
                          const val = e.target.value.split(',').map(r => r.trim()).filter(Boolean);
                          contactPreferencesService.update(preferences.id, { regions: val });
                        }}
                        placeholder="Zona Sul, Centro..."
                        className="w-32 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 text-slate-900 dark:text-white text-right"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-xs">Quartos mín</span>
                      <input
                        type="number"
                        min={0}
                        value={preferences.bedroomsMin ?? ''}
                        onChange={e => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          setPreferences(p => p ? { ...p, bedroomsMin: val } : p);
                        }}
                        onBlur={e => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          contactPreferencesService.update(preferences.id, { bedroomsMin: val });
                        }}
                        placeholder="—"
                        className="w-14 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 text-slate-900 dark:text-white text-right"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-xs">Urgência</span>
                      <select
                        value={preferences.urgency || ''}
                        onChange={e => {
                          const val = (e.target.value || null) as PreferenceUrgency | null;
                          contactPreferencesService.update(preferences.id, { urgency: val });
                          setPreferences(p => p ? { ...p, urgency: val } : p);
                        }}
                        className="text-xs text-slate-900 dark:text-white bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                      >
                        <option value="">—</option>
                        <option value="IMMEDIATE">Imediato</option>
                        <option value="3_MONTHS">3 meses</option>
                        <option value="6_MONTHS">6 meses</option>
                        <option value="1_YEAR">1 ano</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Sem preferências cadastradas</p>
                )}
              </div>

              {/* DETALHES */}
              <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Detalhes</h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 text-xs">Tipo</span>
                    <select
                      value={deal.dealType || 'VENDA'}
                      onChange={e => updateDeal(deal.id, { dealType: e.target.value as 'VENDA' | 'LOCACAO' | 'PERMUTA' })}
                      className="text-xs text-slate-900 dark:text-white bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                    >
                      <option value="VENDA">Venda</option>
                      <option value="LOCACAO">Locação</option>
                      <option value="PERMUTA">Permuta</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 text-xs">Prev. Fech.</span>
                    <input
                      type="date"
                      value={deal.expectedCloseDate ? deal.expectedCloseDate.split('T')[0] : ''}
                      onChange={e => updateDeal(deal.id, { expectedCloseDate: e.target.value || undefined })}
                      className="text-xs text-slate-900 dark:text-white bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                    />
                  </div>
                  {/* Prioridade com badge colorido */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 text-xs">Prioridade</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      deal.priority === 'high' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                      deal.priority === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                    }`}>
                      {formatPriorityPtBr(deal.priority)}
                    </span>
                  </div>
                  {/* Probabilidade com barra visual */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 text-xs">Probabilidade</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                        <div
                          className={`h-full rounded-full transition-all ${
                            (deal.probability ?? 0) <= 30 ? 'bg-red-500' :
                            (deal.probability ?? 0) <= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, deal.probability ?? 0)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{deal.probability ?? 0}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 text-xs">Criado em</span>
                    <span className="text-slate-900 dark:text-white text-xs">
                      {PT_BR_DATE_FORMATTER.format(new Date(deal.createdAt))}
                    </span>
                  </div>
                  {estimatedCommission && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 text-xs">Comissão Est.</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs" title={`Taxa: ${estimatedCommission.rate}%`}>
                        {BRL_CURRENCY.format(estimatedCommission.estimated)}
                        <span className="text-[10px] text-slate-400 ml-1">({estimatedCommission.rate}%)</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* TAGS (read-only from contact) */}
              <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                  <TagIcon size={12} /> Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {(contact?.tags || []).length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Sem tags.</p>
                  ) : (
                    (contact?.tags || []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10"
                      >
                        {tag}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* CUSTOM FIELDS — only show fields that have values */}
              {(() => {
                const filledFields = customFieldDefinitions.filter(field => {
                  const val = contact?.customFields?.[field.key];
                  return val !== undefined && val !== null && val !== '';
                });
                if (filledFields.length === 0) return null;
                return (
                  <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">
                      Campos Personalizados
                    </h3>
                    <div className="space-y-1.5">
                      {filledFields.map(field => (
                        <div key={field.id} className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {field.label}
                          </span>
                          <span className="text-[11px] text-slate-700 dark:text-slate-200 truncate text-right">
                            {contact?.customFields?.[field.key]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right Content (Tabs & Timeline) */}
          <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-dark-card">
            <div className="h-14 border-b border-slate-200 dark:border-white/5 flex items-center px-6 shrink-0">
              <div className="flex gap-6">
                <Button
                  onClick={() => setActiveTab('timeline')}
                  className={`text-sm font-bold h-14 border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-primary-500 text-primary-600 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}
                >
                  Timeline
                </Button>
                <Button
                  onClick={() => setActiveTab('products')}
                  className={`text-sm font-bold h-14 border-b-2 transition-colors ${activeTab === 'products' ? 'border-primary-500 text-primary-600 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}
                >
                  Produtos
                </Button>
                <Button
                  onClick={() => setActiveTab('info')}
                  className={`text-sm font-bold h-14 border-b-2 transition-colors ${activeTab === 'info' ? 'border-primary-500 text-primary-600 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}
                >
                  IA Insights
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-black/10">
              {activeTab === 'timeline' && (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 shadow-sm">
                    <textarea
                      ref={noteTextareaRef}
                      className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none resize-none min-h-[80px]"
                      placeholder="Escreva uma nota..."
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                    ></textarea>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                      <div />
                      <Button
                        onClick={handleAddNote}
                        disabled={!newNote.trim()}
                        className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
                      >
                        <Check size={14} /> Enviar
                      </Button>
                    </div>
                  </div>

                  {/* Contact notes (pinned) */}
                  {contact?.notes && (
                    <div className="flex items-start gap-3 p-3 bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/30 rounded-xl">
                      <StickyNote size={16} className="text-amber-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Nota do contato</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{contact.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Unified timeline: activities + deal notes */}
                  <div className="space-y-3 pl-4 border-l border-slate-200 dark:border-slate-800">
                    {timelineFeed.length === 0 && !contact?.notes && (
                      <p className="text-sm text-slate-500 italic pl-4">
                        Nenhuma atividade ou nota registrada.
                      </p>
                    )}
                    {timelineFeed.map(item => {
                      if (item.kind === 'activity') {
                        const activity = item.data;
                        return (
                          <ActivityRow
                            key={`act-${activity.id}`}
                            activity={activity}
                            deal={deal}
                            onToggleComplete={id => {
                              const act = activitiesById.get(id);
                              if (act) updateActivity(id, { completed: !act.completed });
                            }}
                            onEdit={(activity) => {
                              const date = new Date(activity.date);
                              setEditingActivity(activity);
                              setActivityFormData({
                                title: activity.title,
                                type: activity.type,
                                date: date.toISOString().split('T')[0],
                                time: date.toTimeString().slice(0, 5),
                                description: activity.description || '',
                                dealId: activity.dealId,
                                recurrenceType: activity.recurrenceType || 'none',
                                recurrenceEndDate: activity.recurrenceEndDate || '',
                              });
                              setIsActivityFormOpen(true);
                            }}
                            onDelete={id => deleteActivity(id)}
                          />
                        );
                      }
                      // kind === 'note' (deal note)
                      const note = item.data;
                      return (
                        <div key={`note-${note.id}`} className="flex items-start gap-3 pl-4 py-2">
                          <MessageSquare size={14} className="text-primary-500 mt-1 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{note.content}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                              {new Date(note.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              {' '}
                              {new Date(note.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'products' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                      <Package size={16} /> Adicionar Produto/Serviço
                    </h3>
                    <div className="flex gap-3">
                      {/* Searchable product picker */}
                      <div className="flex-1 relative" ref={productPickerRef}>
                        <button
                          type="button"
                          className="w-full flex items-center justify-between gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-white/8 transition-colors"
                          onClick={() => setProductPickerOpen(!productPickerOpen)}
                        >
                          <span className={`truncate ${selectedProduct ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                            {selectedProduct ? selectedProduct.name : 'Selecione um item...'}
                          </span>
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                            {selectedProduct ? BRL_CURRENCY.format(selectedProduct.price) : ''}
                          </span>
                        </button>

                        {productPickerOpen && (
                          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/95 backdrop-blur-xl shadow-2xl shadow-slate-300/30 dark:shadow-black/40">
                            {/* Search */}
                            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/8 px-3 py-2">
                              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <input
                                ref={productSearchInputRef}
                                type="text"
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') { setProductPickerOpen(false); setProductSearch(''); }
                                }}
                                placeholder="Buscar produto..."
                                className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                              />
                              {productSearch && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-600">{filteredProducts.length}</span>
                              )}
                            </div>
                            {/* List */}
                            <div className="max-h-52 overflow-auto py-1">
                              {filteredProducts.length === 0 ? (
                                <div className="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-600">Nenhum produto encontrado</div>
                              ) : (
                                filteredProducts.map((p) => {
                                  const isCurrent = p.id === selectedProductId;
                                  return (
                                    <button
                                      key={p.id}
                                      type="button"
                                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                                        isCurrent ? 'bg-slate-100 dark:bg-white/6' : 'hover:bg-slate-50 dark:hover:bg-white/4'
                                      }`}
                                      onClick={() => {
                                        setSelectedProductId(p.id);
                                        setProductPickerOpen(false);
                                        setProductSearch('');
                                      }}
                                    >
                                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${isCurrent ? 'text-primary-600 dark:text-primary-400' : 'text-transparent'}`}>
                                        <Check className="h-3 w-3" />
                                      </div>
                                      <span className={`truncate text-sm ${isCurrent ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                        {p.name}
                                      </span>
                                      <span className="ml-auto shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400/70">
                                        {BRL_CURRENCY.format(p.price)}
                                      </span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                            {/* Footer */}
                            <div className="border-t border-slate-200 dark:border-white/8 px-3 py-1.5">
                              <span className="text-[10px] text-slate-400 dark:text-slate-600">{products.length} produtos no catálogo</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <input
                        type="number"
                        min="1"
                        className="w-20 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                        value={productQuantity}
                        onChange={e => setProductQuantity(parseInt(e.target.value))}
                      />
                      <Button
                        onClick={handleAddProduct}
                        disabled={!selectedProductId}
                        className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                      >
                        Adicionar
                      </Button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Produto depende do cliente? Use um item personalizado (não precisa estar no catálogo).
                      </div>
                      <Button
                        type="button"
                        onClick={() => setShowCustomItem(v => !v)}
                        className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {showCustomItem ? 'Fechar' : 'Adicionar item personalizado'}
                      </Button>
                    </div>

                    {showCustomItem && (
                      <div className="mt-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                          <div className="sm:col-span-6">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nome do item</label>
                            <input
                              value={customItemName}
                              onChange={e => setCustomItemName(e.target.value)}
                              placeholder="Ex.: Pacote personalizado, Procedimento X…"
                              className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Preço</label>
                            <input
                              value={customItemPrice}
                              onChange={e => setCustomItemPrice(e.target.value)}
                              inputMode="decimal"
                              className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Qtd</label>
                            <input
                              type="number"
                              min={1}
                              value={customItemQuantity}
                              onChange={e => setCustomItemQuantity(parseInt(e.target.value))}
                              className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                            />
                          </div>
                          <div className="sm:col-span-1">
                            <Button
                              type="button"
                              onClick={handleAddCustomItem}
                              className="w-full bg-primary-600 hover:bg-primary-500 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-black/20 border-b border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 font-medium">
                        <tr>
                          <th className="px-4 py-3">Item</th>
                          <th className="px-4 py-3 w-20 text-center">Qtd</th>
                          <th className="px-4 py-3 w-32 text-right">Preço Unit.</th>
                          <th className="px-4 py-3 w-32 text-right">Total</th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {!deal.items || deal.items.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">
                              Nenhum produto adicionado. O valor do negócio é manual.
                            </td>
                          </tr>
                        ) : (
                          deal.items.map(item => (
                            <tr key={item.id}>
                              <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">
                                {item.name}
                              </td>
                              <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">
                                {item.quantity}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                                {BRL_CURRENCY.format(item.price)}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                                {BRL_CURRENCY.format(item.price * item.quantity)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Button
                                  onClick={() => removeItemFromDeal(deal.id, item.id)}
                                  className="text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot className="bg-slate-50 dark:bg-black/20 border-t border-slate-200 dark:border-white/5">
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider"
                          >
                            Total do Pedido
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-primary-600 dark:text-primary-400 text-lg">
                            {BRL_CURRENCY.format(deal.value)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'info' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-linear-to-br from-primary-50 to-white dark:from-primary-900/10 dark:to-dark-card p-6 rounded-xl border border-primary-100 dark:border-primary-500/20">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-primary-100 dark:bg-primary-500/20 rounded-lg text-primary-600 dark:text-primary-400">
                        <BrainCircuit size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white font-display text-lg">
                          IA Insights
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Inteligência Artificial aplicada ao negócio
                        </p>
                      </div>
                    </div>

                    {/* STRATEGY CONTEXT BAR */}
                    {dealBoard?.agentPersona && (
                      <div className="mb-6 bg-slate-900/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                          <Bot size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded">
                              Atuando como
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                            {dealBoard.agentPersona?.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {dealBoard.agentPersona?.role} • Foco: {dealBoard.goal?.kpi || 'Geral'}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3 mb-5">
                      <Button
                        onClick={handleAnalyzeDeal}
                        disabled={isAnalyzing}
                        className="flex-1 py-2.5 bg-white dark:bg-white/5 text-slate-700 dark:text-white text-sm font-medium rounded-lg shadow-sm border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                      >
                        {isAnalyzing ? (
                          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          <BrainCircuit size={16} />
                        )}
                        Analisar Negócio
                      </Button>
                      <Button
                        onClick={handleDraftEmail}
                        disabled={isDrafting}
                        className="flex-1 py-2.5 bg-white dark:bg-white/5 text-slate-700 dark:text-white text-sm font-medium rounded-lg shadow-sm border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                      >
                        {isDrafting ? (
                          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          <Mail size={16} />
                        )}
                        Escrever Email
                      </Button>
                    </div>
                    {aiResult && (
                      <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md p-4 rounded-lg border border-primary-100 dark:border-primary-500/20 mb-4">
                        <div className="flex justify-between mb-2 border-b border-primary-100 dark:border-white/5 pb-2">
                          <span className="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wider">
                            Sugestão
                          </span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2 rounded">
                            {aiResult.score}% Chance
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                          {aiResult.suggestion}
                        </p>
                      </div>
                    )}
                    {emailDraft && (
                      <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md p-4 rounded-lg border border-primary-100 dark:border-primary-500/20">
                        <h4 className="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wider mb-2">
                          Rascunho de Email
                        </h4>
                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed italic">
                          "{emailDraft}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="bg-rose-50 dark:bg-rose-900/10 p-6 rounded-xl border border-rose-100 dark:border-rose-500/20">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-rose-100 dark:bg-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400">
                        <Sword size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white font-display text-lg">
                          Objection Killer
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          O cliente está difícil? A IA te ajuda a negociar.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        className="flex-1 bg-white dark:bg-white/5 border border-rose-200 dark:border-rose-500/20 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                        placeholder="Ex: 'Achamos o preço muito alto' ou 'Preciso falar com meu sócio'"
                        value={objection}
                        onChange={e => setObjection(e.target.value)}
                      />
                      <Button
                        onClick={handleObjection}
                        disabled={isGeneratingObjections || !objection.trim()}
                        className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        {isGeneratingObjections ? (
                          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          'Gerar Respostas'
                        )}
                      </Button>
                    </div>

                    {objectionResponses.length > 0 && (
                      <div className="space-y-3">
                        {objectionResponses.map((resp, idx) => (
                          <div
                            key={idx}
                            className="bg-white dark:bg-white/5 p-3 rounded-lg border border-rose-100 dark:border-rose-500/10 flex gap-3"
                          >
                            <div className="shrink-0 w-6 h-6 bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-xs">
                              {idx + 1}
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-200">{resp}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ActivityFormModal
        isOpen={isActivityFormOpen}
        onClose={() => {
          setIsActivityFormOpen(false);
          setEditingActivity(null);
        }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!editingActivity) return;
          const dateTime = new Date(`${activityFormData.date}T${activityFormData.time}`);
          updateActivity(editingActivity.id, {
            title: activityFormData.title,
            type: activityFormData.type,
            date: dateTime.toISOString(),
            description: activityFormData.description,
            dealId: activityFormData.dealId,
            recurrenceType: activityFormData.recurrenceType === 'none' ? undefined : activityFormData.recurrenceType,
            recurrenceEndDate: activityFormData.recurrenceEndDate || undefined,
          });
          setIsActivityFormOpen(false);
          setEditingActivity(null);
        }}
        formData={activityFormData}
        setFormData={setActivityFormData}
        editingActivity={editingActivity}
        deals={deals}
      />

      <ConfirmModal
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDeleteDeal}
        title="Excluir Negócio"
        message="Tem certeza que deseja excluir este negócio? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="danger"
      />

      <LossReasonModal
        isOpen={showLossReasonModal}
        onClose={() => {
          setShowLossReasonModal(false);
          setPendingLostStageId(null);
          setLossReasonOrigin('button');
        }}
        onConfirm={(reason) => {
          // Priority:
          // 0. Stay in stage flag (Archive)
          // 1. Pending Stage (if set via click or explicit button)
          // 2. Explicit Lost Stage on Board
          // 3. Stage linked to 'OTHER' lifecycle

          if (dealBoard?.lostStayInStage) {
            moveDeal(deal, deal.status, reason, false, true); // explicitLost = true
            setShowLossReasonModal(false);
            setPendingLostStageId(null);
            if (lossReasonOrigin === 'button') onClose();
            return;
          }

          let targetStageId = pendingLostStageId;

          if (!targetStageId && dealBoard?.lostStageId) {
            targetStageId = dealBoard.lostStageId;
          }

          if (!targetStageId) {
            targetStageId =
              dealBoard?.stages.find(s => s.linkedLifecycleStage === 'OTHER')?.id ?? null;
          }

          if (targetStageId) {
            moveDeal(deal, targetStageId, reason);
          } else {
            // Fallback: just mark as lost without moving
            updateDeal(deal.id, { isLost: true, isWon: false, closedAt: new Date().toISOString(), lossReason: reason });
          }
          setShowLossReasonModal(false);
          setPendingLostStageId(null);
          // Only close the deal modal if it was triggered via the "PERDIDO" button
          if (lossReasonOrigin === 'button') onClose();
        }}
        dealTitle={deal.title}
      />
    </>
  );

  if (isMobile) {
    return (
      <DealSheet isOpen={isOpen} onClose={onClose} ariaLabel={`Negócio: ${deal.title}`}>
        <div onKeyDown={handleKeyDown}>{inner}</div>
      </DealSheet>
    );
  }

  return (
    <FocusTrap active={isOpen} onEscape={onClose}>
      <div
        // Backdrop + positioning wrapper. Clicking outside the panel should close the modal.
        // No desktop, este modal não deve cobrir a sidebar de navegação.
        // Em md+ deslocamos o overlay pela largura da sidebar via `--app-sidebar-width`.
        className="fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onKeyDown={handleKeyDown}
        onClick={(e) => {
          // Only close when clicking the backdrop, not when clicking inside the panel.
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {inner}
      </div>
    </FocusTrap>
  );
};
