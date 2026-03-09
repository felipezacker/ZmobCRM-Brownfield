import type { Activity, Deal, DealView, Contact, Board, Product } from '@/types';
import type { ContactPreference } from '@/types';
import type { DealNote } from '@/lib/supabase/dealNotes';
import {
  analyzeLead,
  generateEmailDraft,
  generateObjectionResponse,
} from '@/lib/ai/tasksClient';
import { dealNotesService } from '@/lib/supabase/dealNotes';
import { contactPreferencesService } from '@/lib/supabase/contact-preferences';

/** Dependencies injected from the main hook — uses real project types */
export interface DealDetailHandlerDeps {
  deal: Deal | DealView | undefined;
  contact: Contact | null;
  dealBoard: Board | undefined;
  profile: ReturnType<typeof import('@/context/AuthContext').useAuth>['profile'];
  orgMembers: { id: string; name: string; avatar_url?: string | null }[];
  productsById: Map<string, Product>;
  activitiesById: Map<string, Activity>;
  stageLabel: string | undefined;
  updateDeal: (id: string, data: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;
  addItemToDeal: (dealId: string, item: { productId: string; name: string; price: number; quantity: number }) => Promise<unknown>;
  removeItemFromDeal?: (dealId: string, itemId: string) => void;
  updateContact: (id: string, data: Partial<Contact>) => void;
  updateActivity: (id: string, data: Partial<Activity>) => void;
  moveDeal: (...args: Parameters<ReturnType<typeof import('@/lib/query/hooks').useMoveDealSimple>['moveDeal']>) => unknown;
  addToast: ReturnType<typeof import('@/context/ToastContext').useToast>['addToast'];
  onClose: () => void;
  // State setters
  setIsAnalyzing: (v: boolean) => void;
  setAiResult: (v: { suggestion: string; score: number } | null) => void;
  setIsDrafting: (v: boolean) => void;
  setEmailDraft: (v: string | null) => void;
  setIsGeneratingObjections: (v: boolean) => void;
  setObjectionResponses: (v: string[]) => void;
  setNewNote: (v: string) => void;
  setDealNotes: (v: DealNote[]) => void;
  setSelectedProductId: (v: string) => void;
  setProductSearch: (v: string) => void;
  setProductPickerOpen: (v: boolean) => void;
  setProductQuantity: (v: number) => void;
  setShowCustomItem: (v: boolean) => void;
  setCustomItemName: (v: string) => void;
  setCustomItemPrice: (v: string) => void;
  setCustomItemQuantity: (v: number) => void;
  setPreferences: (v: ContactPreference | null) => void;
  setDeleteId: (v: string | null) => void;
  setIsEditingValue: (v: boolean) => void;
  setEditingActivity: (v: Activity | null) => void;
  setIsActivityFormOpen: (v: boolean) => void;
  setActivityFormData: (v: { title: string; type: Activity['type']; date: string; time: string; description: string; dealId: string; recurrenceType: 'none' | 'daily' | 'weekly' | 'monthly'; recurrenceEndDate: string }) => void;
  setShowLossReasonModal: (v: boolean) => void;
  setPendingLostStageId: (v: string | null) => void;
  setLossReasonOrigin: (v: 'button' | 'stage') => void;
  editValue: string; isEditingValue: boolean; newNote: string; objection: string;
  selectedProductId: string; productQuantity: number;
  customItemName: string; customItemPrice: string; customItemQuantity: number;
  deleteId: string | null; editingActivity: Activity | null; fetchDealNotes: () => void;
  activityFormData: { title: string; type: Activity['type']; date: string; time: string; description: string; dealId: string; recurrenceType: 'none' | 'daily' | 'weekly' | 'monthly'; recurrenceEndDate: string };
}

export function createDealDetailHandlers(d: DealDetailHandlerDeps) {
  const handleAnalyzeDeal = async () => {
    if (!d.deal) return;
    d.setIsAnalyzing(true);
    try {
      const result = await analyzeLead(d.deal, d.stageLabel);
      d.setAiResult({ suggestion: result.suggestion, score: result.probabilityScore });
      d.updateDeal(d.deal.id, { aiSummary: result.suggestion, probability: result.probabilityScore });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Falha ao analisar deal com IA.';
      console.error('[DealDetailModal] analyzeLead failed:', error);
      d.addToast(msg, 'warning');
    } finally {
      d.setIsAnalyzing(false);
    }
  };

  const handleDraftEmail = async () => {
    if (!d.deal) return;
    d.setIsDrafting(true);
    try {
      const draft = await generateEmailDraft(d.deal, d.stageLabel);
      d.setEmailDraft(draft);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Falha ao gerar e-mail com IA.';
      console.error('[DealDetailModal] generateEmailDraft failed:', error);
      d.addToast(msg, 'warning');
    } finally {
      d.setIsDrafting(false);
    }
  };

  const handleObjection = async () => {
    if (!d.deal || !d.objection.trim()) return;
    d.setIsGeneratingObjections(true);
    try {
      const responses = await generateObjectionResponse(d.deal, d.objection);
      d.setObjectionResponses(responses);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Falha ao gerar respostas.';
      console.error('[DealDetailModal] generateObjectionResponse failed:', error);
      d.addToast(msg, 'warning');
    } finally {
      d.setIsGeneratingObjections(false);
    }
  };

  const handleAddNote = async () => {
    if (!d.deal || !d.newNote.trim()) return;
    const orgId = d.profile?.organization_id;
    const { error } = await dealNotesService.createNote(d.deal.id, d.newNote.trim(), orgId ?? undefined);
    if (error) {
      console.error('[DealDetailModal] Erro ao salvar nota:', error);
      d.addToast('Falha ao salvar nota. Tente novamente.', 'warning');
      return;
    }
    d.setNewNote('');
    d.fetchDealNotes();
    d.addToast('Nota salva', 'success');
  };

  const handleAddProduct = async () => {
    if (!d.deal || !d.selectedProductId) return;
    const product = d.productsById.get(d.selectedProductId);
    if (!product) return;
    const result = await d.addItemToDeal(d.deal.id, {
      productId: product.id, name: product.name, price: product.price, quantity: d.productQuantity,
    });
    if (!result) { d.addToast('Erro ao adicionar produto.', 'warning'); return; }
    d.addToast(`${product.name} adicionado`, 'success');
    d.setSelectedProductId('');
    d.setProductSearch('');
    d.setProductPickerOpen(false);
    d.setProductQuantity(1);
  };

  const handleAddCustomItem = async () => {
    if (!d.deal) return;
    const name = d.customItemName.trim();
    const price = Number(d.customItemPrice);
    const qty = Number(d.customItemQuantity);
    if (!name) { d.addToast('Digite o nome do item.', 'warning'); return; }
    if (!Number.isFinite(price) || price < 0) { d.addToast('Preco invalido.', 'warning'); return; }
    if (!Number.isFinite(qty) || qty < 1) { d.addToast('Quantidade invalida.', 'warning'); return; }
    const result = await d.addItemToDeal(d.deal.id, { productId: '', name, price, quantity: qty });
    if (!result) { d.addToast('Erro ao adicionar item.', 'warning'); return; }
    d.addToast(`${name} adicionado`, 'success');
    d.setCustomItemName('');
    d.setCustomItemPrice('0');
    d.setCustomItemQuantity(1);
    d.setShowCustomItem(false);
  };

  const confirmDeleteDeal = () => {
    if (d.deleteId) {
      d.deleteDeal(d.deleteId);
      d.addToast('Negocio excluido com sucesso', 'success');
      d.setDeleteId(null);
      d.onClose();
    }
  };

  const saveValue = () => {
    if (d.deal && d.editValue) {
      d.updateDeal(d.deal.id, { value: Number(d.editValue) });
      d.setIsEditingValue(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !d.isEditingValue) d.onClose();
  };

  const handleCreatePreferences = async () => {
    const orgId = d.profile?.organization_id;
    if (!d.contact || !orgId) return;
    const { data } = await contactPreferencesService.create({
      contactId: d.contact.id, propertyTypes: [], purpose: null,
      priceMin: null, priceMax: null, regions: [], bedroomsMin: null,
      parkingMin: null, areaMin: null, acceptsFinancing: null,
      acceptsFgts: null, urgency: null, notes: null, organizationId: orgId,
    });
    if (data) d.setPreferences(data);
  };

  const handleOwnerChange = (newOwnerId: string) => {
    if (!d.deal) return;
    const member = d.orgMembers.find(m => m.id === newOwnerId);
    d.updateDeal(d.deal.id, {
      ownerId: newOwnerId,
      owner: member
        ? { name: member.name, avatar: member.avatar_url || '' }
        : { name: 'Sem Dono', avatar: '' },
    });
  };

  const handleWin = () => {
    if (!d.deal) return;
    if (d.dealBoard?.wonStayInStage) { d.moveDeal(d.deal, d.deal.status, undefined, true, false); d.onClose(); return; }
    if (d.dealBoard?.wonStageId) { d.moveDeal(d.deal, d.dealBoard.wonStageId); d.onClose(); return; }
    const successStage = d.dealBoard?.stages.find(s => s.linkedLifecycleStage === 'CUSTOMER')
      || d.dealBoard?.stages.find(s => s.linkedLifecycleStage === 'MQL')
      || d.dealBoard?.stages.find(s => s.linkedLifecycleStage === 'SALES_QUALIFIED');
    if (successStage) { d.moveDeal(d.deal, successStage.id); }
    else { d.updateDeal(d.deal.id, { isWon: true, isLost: false, closedAt: new Date().toISOString() }); }
    d.onClose();
  };

  const handleLose = () => {
    if (d.dealBoard?.lostStageId) { d.setPendingLostStageId(d.dealBoard.lostStageId); }
    d.setLossReasonOrigin('button');
    d.setShowLossReasonModal(true);
  };

  const handleReopen = () => {
    if (!d.deal) return;
    const firstRegularStage = d.dealBoard?.stages.find(
      s => s.linkedLifecycleStage !== 'CUSTOMER' && s.linkedLifecycleStage !== 'OTHER'
    );
    if (firstRegularStage) { d.moveDeal(d.deal, firstRegularStage.id); }
    else { d.updateDeal(d.deal.id, { isWon: false, isLost: false, closedAt: undefined }); }
  };

  const handleStageClick = (stageId: string) => {
    if (!d.deal) return;
    const targetStage = d.dealBoard?.stages.find(s => s.id === stageId);
    const isLostStage = d.dealBoard?.lostStageId === stageId || targetStage?.linkedLifecycleStage === 'OTHER';
    if (isLostStage) {
      d.setPendingLostStageId(stageId);
      d.setLossReasonOrigin('stage');
      d.setShowLossReasonModal(true);
    } else {
      d.moveDeal(d.deal, stageId);
    }
  };

  const handleToggleActivity = (id: string) => {
    const act = d.activitiesById.get(id);
    if (act) d.updateActivity(id, { completed: !act.completed });
  };

  const handleEditActivity = (activity: Activity) => {
    const date = new Date(activity.date);
    d.setEditingActivity(activity);
    d.setActivityFormData({
      title: activity.title, type: activity.type,
      date: date.toISOString().split('T')[0], time: date.toTimeString().slice(0, 5),
      description: activity.description || '', dealId: activity.dealId || '',
      recurrenceType: activity.recurrenceType || 'none', recurrenceEndDate: activity.recurrenceEndDate || '',
    });
    d.setIsActivityFormOpen(true);
  };

  const handleSubmitActivityForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.editingActivity) return;
    const dateTime = new Date(`${d.activityFormData.date}T${d.activityFormData.time}`);
    d.updateActivity(d.editingActivity.id, {
      title: d.activityFormData.title, type: d.activityFormData.type,
      date: dateTime.toISOString(), description: d.activityFormData.description,
      dealId: d.activityFormData.dealId,
      recurrenceType: d.activityFormData.recurrenceType === 'none' ? undefined : d.activityFormData.recurrenceType,
      recurrenceEndDate: d.activityFormData.recurrenceEndDate || undefined,
    });
    d.setIsActivityFormOpen(false);
    d.setEditingActivity(null);
  };

  const handleSelectProduct = (id: string) => {
    d.setSelectedProductId(id);
    d.setProductPickerOpen(false);
    d.setProductSearch('');
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone).catch(() => {});
    d.addToast('Telefone copiado', 'success');
  };

  return {
    handleAnalyzeDeal, handleDraftEmail, handleObjection, handleAddNote,
    handleAddProduct, handleAddCustomItem, confirmDeleteDeal, saveValue,
    handleKeyDown, handleCreatePreferences, handleOwnerChange, handleWin,
    handleLose, handleReopen, handleStageClick, handleToggleActivity,
    handleEditActivity, handleSubmitActivityForm, handleSelectProduct,
    handleCopyPhone,
  };
}
