import { useState, useRef, useEffect, useMemo } from 'react';
import { useCRMActions } from '@/hooks/useCRMActions';
import { useContacts } from '@/context/contacts/ContactsContext';
import { useContact as useContactQuery } from '@/lib/query/hooks/useContactsQuery';
import { useDeals } from '@/context/deals/DealsContext';
import { useActivities } from '@/context/activities/ActivitiesContext';
import { useBoards } from '@/context/boards/BoardsContext';
import { useSettings } from '@/context/settings/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { dealNotesService, type DealNote } from '@/lib/supabase/dealNotes';
import { useMoveDealSimple } from '@/lib/query/hooks';
import { Activity } from '@/types';
import { useResponsiveMode } from '@/hooks/useResponsiveMode';
import { useRouter } from 'next/navigation';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { supabase } from '@/lib/supabase/client';
import { calculateEstimatedCommission } from '@/lib/supabase';
import { contactPreferencesService } from '@/lib/supabase/contact-preferences';
import type { ContactPreference } from '@/types';
import type { TimelineItem } from '@/features/boards/components/deal-detail/types';
import { createDealDetailHandlers } from './useDealDetailHandlers';

export function useDealDetail(dealId: string | null, isOpen: boolean, onClose: () => void) {
  const { mode } = useResponsiveMode();
  const isMobile = mode === 'mobile';

  const { deals } = useCRMActions();
  const { contacts, updateContact } = useContacts();
  const { updateDeal, deleteDeal, addItemToDeal, removeItemFromDeal } = useDeals();
  const { activities, updateActivity, deleteActivity } = useActivities();
  const { activeBoard, boards } = useBoards();
  const { products, customFieldDefinitions, lifecycleStages } = useSettings();
  const { profile } = useAuth();
  const { members: orgMembers } = useOrganizationMembers();
  const { addToast } = useToast();
  const router = useRouter();

  const dealsById = useMemo(() => new Map(deals.map((d) => [d.id, d])), [deals]);
  const contactsById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const boardsById = useMemo(() => new Map(boards.map((b) => [b.id, b])), [boards]);
  const lifecycleStageById = useMemo(() => new Map(lifecycleStages.map((s) => [s.id, s])), [lifecycleStages]);
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const activitiesById = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities]);

  const deal = dealId ? dealsById.get(dealId) : undefined;
  // Keep a ref to the current deal so effects that should only run on dealId change
  // can read the latest deal data without depending on the deal object identity.
  const dealRef = useRef(deal);
  dealRef.current = deal;
  const { data: contactDirect } = useContactQuery(deal?.contactId || undefined);
  const contact = contactDirect ?? contactsById.get(deal?.contactId ?? '') ?? null;
  const resolvedContactName = contact?.name || deal?.contactName || 'Sem contato';

  const dealBoardOrNull = deal ? (boardsById.get(deal.boardId) ?? activeBoard) : activeBoard;
  const dealBoard = dealBoardOrNull ?? undefined;
  const { moveDeal } = useMoveDealSimple(dealBoardOrNull, lifecycleStages);

  // ---------- State ----------
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [propertyRef, setPropertyRef] = useState('');
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
  const [dealNotes, setDealNotes] = useState<DealNote[]>([]);
  const [preferences, setPreferences] = useState<ContactPreference | null>(null);
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
  const [brokerCommissionRate, setBrokerCommissionRate] = useState<number | null>(null);

  // ---------- Memos ----------
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return productsById.get(selectedProductId) ?? null;
  }, [selectedProductId, productsById]);

  const stageLabel = useMemo(() => {
    if (!dealBoard) return undefined;
    const stage = dealBoard.stages.find((s) => s.id === deal?.status);
    return stage?.label;
  }, [deal?.status, dealBoard]);

  const dealActivities = useMemo(() => {
    if (!deal) return [] as Activity[];
    return activities.filter((a) => a.dealId === deal.id);
  }, [activities, deal]);

  const timelineFeed = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    for (const a of dealActivities) items.push({ kind: 'activity', data: a, date: a.date });
    for (const n of dealNotes) items.push({ kind: 'note', data: n, date: n.created_at });
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
  }, [dealActivities, dealNotes]);

  const estimatedCommission = useMemo(() => {
    if (!deal) return null;
    return calculateEstimatedCommission(deal.value, deal.commissionRate, brokerCommissionRate);
  }, [deal, brokerCommissionRate]);

  // ---------- Effects ----------
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

  useEffect(() => {
    if (!contact?.id) { setPreferences(null); return; }
    let cancelled = false;
    contactPreferencesService.getByContactId(contact.id).then(({ data }) => {
      if (!cancelled) setPreferences(data?.[0] ?? null);
    }).catch(err => console.error('[DealDetailModal] fetch preferences failed:', err));
    return () => { cancelled = true; };
  }, [contact?.id]);

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

  useEffect(() => {
    const currentDeal = dealRef.current;
    if (isOpen && currentDeal) {
      setEditValue(currentDeal.value.toString());
      setPropertyRef(currentDeal.propertyRef || '');
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
  }, [isOpen, dealId]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab !== 'products') return;
    const defaultId = dealBoard?.defaultProductId;
    if (!defaultId) return;
    if (selectedProductId) return;
    const p = productsById.get(defaultId);
    if (!p || p.active === false) return;
    setSelectedProductId(defaultId);
    setProductQuantity(1);
  }, [activeTab, dealBoard?.defaultProductId, isOpen, productsById, selectedProductId]);

  // ---------- Handlers (extracted) ----------
  const handlers = createDealDetailHandlers({
    deal, contact, dealBoard, profile, orgMembers, productsById, activitiesById, stageLabel,
    updateDeal, deleteDeal, addItemToDeal, removeItemFromDeal, updateContact, updateActivity,
    moveDeal, addToast, onClose,
    setIsAnalyzing, setAiResult, setIsDrafting, setEmailDraft,
    setIsGeneratingObjections, setObjectionResponses, setNewNote, setDealNotes,
    setSelectedProductId, setProductSearch, setProductPickerOpen, setProductQuantity,
    setShowCustomItem, setCustomItemName, setCustomItemPrice, setCustomItemQuantity,
    setPreferences, setDeleteId, setIsEditingValue, setEditingActivity,
    setIsActivityFormOpen, setActivityFormData, setShowLossReasonModal,
    setPendingLostStageId, setLossReasonOrigin,
    editValue, isEditingValue, newNote, objection, selectedProductId, productQuantity,
    customItemName, customItemPrice, customItemQuantity, deleteId,
    editingActivity, activityFormData, fetchDealNotes,
  });

  return {
    // Data
    deal, contact, resolvedContactName, dealBoard, deals, isMobile,
    products, productsById, customFieldDefinitions, lifecycleStageById,
    activitiesById, estimatedCommission, timelineFeed, filteredProducts, selectedProduct,
    // State
    isEditingValue, editValue, propertyRef, isAnalyzing, isDrafting,
    aiResult, emailDraft, newNote, activeTab, objection, objectionResponses,
    isGeneratingObjections, selectedProductId, productSearch, productPickerOpen,
    productQuantity, showCustomItem, customItemName, customItemPrice, customItemQuantity,
    dealNotes, preferences, editingActivity, isActivityFormOpen, activityFormData,
    deleteId, showLossReasonModal, pendingLostStageId, lossReasonOrigin, brokerCommissionRate,
    // Refs
    noteTextareaRef, productPickerRef, productSearchInputRef,
    // Setters
    setActiveTab, setNewNote, setObjection, setProductQuantity, setProductSearch,
    setProductPickerOpen, setShowCustomItem, setCustomItemName, setCustomItemPrice,
    setCustomItemQuantity, setPreferences, setActivityFormData, setDeleteId,
    setEditValue, setIsEditingValue, setShowLossReasonModal, setPendingLostStageId,
    setLossReasonOrigin, setIsActivityFormOpen, setEditingActivity,
    onPropertyRefChange: setPropertyRef,
    // Handlers
    ...handlers,
    // Context actions
    updateContact, updateDeal, removeItemFromDeal, deleteActivity, moveDeal,
    router, onClose,
  };
}
