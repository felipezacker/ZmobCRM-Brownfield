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
import {
  analyzeLead,
  generateEmailDraft,
  generateObjectionResponse,
} from '@/lib/ai/tasksClient';
import { useRouter } from 'next/navigation';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { supabase } from '@/lib/supabase/client';
import { calculateEstimatedCommission } from '@/lib/supabase';
import { contactPreferencesService } from '@/lib/supabase/contact-preferences';
import type { ContactPreference } from '@/types';
import type { TimelineItem } from '@/features/boards/components/deal-detail/types';

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
    if (isOpen && deal) {
      setEditValue(deal.value.toString());
      setPropertyRef(deal.propertyRef || '');
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

  // ---------- Handlers ----------
  const handleAnalyzeDeal = async () => {
    if (!deal) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeLead(deal, stageLabel);
      setAiResult({ suggestion: result.suggestion, score: result.probabilityScore });
      updateDeal(deal.id, { aiSummary: result.suggestion, probability: result.probabilityScore });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Falha ao analisar deal com IA.';
      console.error('[DealDetailModal] analyzeLead failed:', error);
      addToast(msg, 'warning');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDraftEmail = async () => {
    if (!deal) return;
    setIsDrafting(true);
    try {
      const draft = await generateEmailDraft(deal, stageLabel);
      setEmailDraft(draft);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Falha ao gerar e-mail com IA.';
      console.error('[DealDetailModal] generateEmailDraft failed:', error);
      addToast(msg, 'warning');
    } finally {
      setIsDrafting(false);
    }
  };

  const handleObjection = async () => {
    if (!deal || !objection.trim()) return;
    setIsGeneratingObjections(true);
    try {
      const responses = await generateObjectionResponse(deal, objection);
      setObjectionResponses(responses);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Falha ao gerar respostas.';
      console.error('[DealDetailModal] generateObjectionResponse failed:', error);
      addToast(msg, 'warning');
    } finally {
      setIsGeneratingObjections(false);
    }
  };

  const handleAddNote = async () => {
    if (!deal || !newNote.trim()) return;
    const orgId = profile?.organization_id;
    const { error } = await dealNotesService.createNote(deal.id, newNote.trim(), orgId ?? undefined);
    if (error) {
      console.error('[DealDetailModal] Erro ao salvar nota:', error);
      addToast('Falha ao salvar nota. Tente novamente.', 'warning');
      return;
    }
    setNewNote('');
    fetchDealNotes();
    addToast('Nota salva', 'success');
  };

  const handleAddProduct = async () => {
    if (!deal || !selectedProductId) return;
    const product = productsById.get(selectedProductId);
    if (!product) return;
    const result = await addItemToDeal(deal.id, {
      productId: product.id, name: product.name, price: product.price, quantity: productQuantity,
    });
    if (!result) { addToast('Erro ao adicionar produto.', 'warning'); return; }
    addToast(`${product.name} adicionado`, 'success');
    setSelectedProductId('');
    setProductSearch('');
    setProductPickerOpen(false);
    setProductQuantity(1);
  };

  const handleAddCustomItem = async () => {
    if (!deal) return;
    const name = customItemName.trim();
    const price = Number(customItemPrice);
    const qty = Number(customItemQuantity);
    if (!name) { addToast('Digite o nome do item.', 'warning'); return; }
    if (!Number.isFinite(price) || price < 0) { addToast('Preco invalido.', 'warning'); return; }
    if (!Number.isFinite(qty) || qty < 1) { addToast('Quantidade invalida.', 'warning'); return; }
    const result = await addItemToDeal(deal.id, { productId: '', name, price, quantity: qty });
    if (!result) { addToast('Erro ao adicionar item.', 'warning'); return; }
    addToast(`${name} adicionado`, 'success');
    setCustomItemName('');
    setCustomItemPrice('0');
    setCustomItemQuantity(1);
    setShowCustomItem(false);
  };

  const confirmDeleteDeal = () => {
    if (deleteId) {
      deleteDeal(deleteId);
      addToast('Negocio excluido com sucesso', 'success');
      setDeleteId(null);
      onClose();
    }
  };

  const saveValue = () => {
    if (deal && editValue) {
      updateDeal(deal.id, { value: Number(editValue) });
      setIsEditingValue(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isEditingValue) onClose();
  };

  const handleCreatePreferences = async () => {
    const orgId = profile?.organization_id;
    if (!contact || !orgId) return;
    const { data } = await contactPreferencesService.create({
      contactId: contact.id, propertyTypes: [], purpose: null,
      priceMin: null, priceMax: null, regions: [], bedroomsMin: null,
      parkingMin: null, areaMin: null, acceptsFinancing: null,
      acceptsFgts: null, urgency: null, notes: null, organizationId: orgId,
    });
    if (data) setPreferences(data);
  };

  const handleOwnerChange = (newOwnerId: string) => {
    if (!deal) return;
    const member = orgMembers.find(m => m.id === newOwnerId);
    updateDeal(deal.id, {
      ownerId: newOwnerId,
      owner: member
        ? { name: member.name, avatar: member.avatar_url || '' }
        : { name: 'Sem Dono', avatar: '' },
    });
  };

  const handleWin = () => {
    if (!deal) return;
    if (dealBoard?.wonStayInStage) { moveDeal(deal, deal.status, undefined, true, false); onClose(); return; }
    if (dealBoard?.wonStageId) { moveDeal(deal, dealBoard.wonStageId); onClose(); return; }
    const successStage = dealBoard?.stages.find(s => s.linkedLifecycleStage === 'CUSTOMER')
      || dealBoard?.stages.find(s => s.linkedLifecycleStage === 'MQL')
      || dealBoard?.stages.find(s => s.linkedLifecycleStage === 'SALES_QUALIFIED');
    if (successStage) { moveDeal(deal, successStage.id); }
    else { updateDeal(deal.id, { isWon: true, isLost: false, closedAt: new Date().toISOString() }); }
    onClose();
  };

  const handleLose = () => {
    if (dealBoard?.lostStageId) { setPendingLostStageId(dealBoard.lostStageId); }
    setLossReasonOrigin('button');
    setShowLossReasonModal(true);
  };

  const handleReopen = () => {
    if (!deal) return;
    const firstRegularStage = dealBoard?.stages.find(
      s => s.linkedLifecycleStage !== 'CUSTOMER' && s.linkedLifecycleStage !== 'OTHER'
    );
    if (firstRegularStage) { moveDeal(deal, firstRegularStage.id); }
    else { updateDeal(deal.id, { isWon: false, isLost: false, closedAt: undefined }); }
  };

  const handleStageClick = (stageId: string) => {
    if (!deal) return;
    const targetStage = dealBoard?.stages.find(s => s.id === stageId);
    const isLostStage = dealBoard?.lostStageId === stageId || targetStage?.linkedLifecycleStage === 'OTHER';
    if (isLostStage) {
      setPendingLostStageId(stageId);
      setLossReasonOrigin('stage');
      setShowLossReasonModal(true);
    } else {
      moveDeal(deal, stageId);
    }
  };

  const handleToggleActivity = (id: string) => {
    const act = activitiesById.get(id);
    if (act) updateActivity(id, { completed: !act.completed });
  };

  const handleEditActivity = (activity: Activity) => {
    const date = new Date(activity.date);
    setEditingActivity(activity);
    setActivityFormData({
      title: activity.title, type: activity.type,
      date: date.toISOString().split('T')[0], time: date.toTimeString().slice(0, 5),
      description: activity.description || '', dealId: activity.dealId || '',
      recurrenceType: activity.recurrenceType || 'none', recurrenceEndDate: activity.recurrenceEndDate || '',
    });
    setIsActivityFormOpen(true);
  };

  const handleSubmitActivityForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;
    const dateTime = new Date(`${activityFormData.date}T${activityFormData.time}`);
    updateActivity(editingActivity.id, {
      title: activityFormData.title, type: activityFormData.type,
      date: dateTime.toISOString(), description: activityFormData.description,
      dealId: activityFormData.dealId,
      recurrenceType: activityFormData.recurrenceType === 'none' ? undefined : activityFormData.recurrenceType,
      recurrenceEndDate: activityFormData.recurrenceEndDate || undefined,
    });
    setIsActivityFormOpen(false);
    setEditingActivity(null);
  };

  const handleSelectProduct = (id: string) => {
    setSelectedProductId(id);
    setProductPickerOpen(false);
    setProductSearch('');
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone).catch(() => {});
    addToast('Telefone copiado', 'success');
  };

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
    handleAnalyzeDeal, handleDraftEmail, handleObjection, handleAddNote,
    handleAddProduct, handleAddCustomItem, confirmDeleteDeal, saveValue,
    handleKeyDown, handleCreatePreferences, handleOwnerChange, handleWin,
    handleLose, handleReopen, handleStageClick, handleToggleActivity,
    handleEditActivity, handleSubmitActivityForm, handleSelectProduct,
    handleCopyPhone,
    // Context actions
    updateContact, updateDeal, removeItemFromDeal, deleteActivity, moveDeal,
    router, onClose,
  };
}
