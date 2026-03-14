import type { Activity, Deal, Board, Contact, Product, CustomFieldDefinition, LifecycleStage } from '@/types';
import type { DealNote } from '@/lib/supabase/dealNotes';
import type { ContactPreference, ContactTemperature, ContactClassification, PreferenceUrgency, PreferencePurpose, PropertyType } from '@/types';

export type TimelineItem =
  | { kind: 'activity'; data: Activity; date: string }
  | { kind: 'note'; data: DealNote; date: string };

export interface DealDetailModalProps {
  dealId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export interface DealDetailHeaderProps {
  deal: Deal;
  dealBoard: Board | undefined;
  resolvedContactName: string;
  headingId: string;
  isEditingValue: boolean;
  editValue: string;
  isMobile: boolean;
  estimatedCommission: { estimated: number; rate: number } | null;
  onClose: () => void;
  onDelete: () => void;
  onOpenCockpit: () => void;
  onEditValueStart: () => void;
  onEditValueChange: (value: string) => void;
  onSaveValue: () => void;
  onOwnerChange: (newOwnerId: string) => void;
  onWin: () => void;
  onLose: () => void;
  onReopen: () => void;
  onStageClick: (stageId: string) => void;
}

export interface DealDetailSidebarProps {
  deal: Deal;
  contact: Contact | null;
  resolvedContactName: string;
  preferences: ContactPreference | null;
  propertyRef: string;
  customFieldDefinitions: CustomFieldDefinition[];
  lifecycleStageById: Map<string, LifecycleStage>;
  estimatedCommission: { estimated: number; rate: number } | null;
  onUpdateContact: (id: string, data: Record<string, unknown>) => void;
  onUpdateDeal: (id: string, data: Record<string, unknown>) => void;
  onPropertyRefChange: (value: string) => void;
  onSetPreferences: (p: ContactPreference | null) => void;
  onCreatePreferences: () => void;
  onUpdatePreference: (id: string, data: Record<string, unknown>) => void;
  onCopyPhone: (phone: string) => void;
}

export interface DealDetailTimelineProps {
  deal: Deal;
  contact: Contact | null;
  timelineFeed: TimelineItem[];
  newNote: string;
  noteTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  activitiesById: Map<string, Activity>;
  onNewNoteChange: (value: string) => void;
  onAddNote: () => void;
  onNewActivity: () => void;
  onToggleActivity: (id: string) => void;
  onEditActivity: (activity: Activity) => void;
  onDeleteActivity: (id: string) => void;
}

export interface DealDetailProductsProps {
  deal: Deal;
  products: Product[];
  productsById: Map<string, Product>;
  selectedProductId: string;
  productQuantity: number;
  productSearch: string;
  productPickerOpen: boolean;
  filteredProducts: Product[];
  selectedProduct: Product | null;
  showCustomItem: boolean;
  customItemName: string;
  customItemPrice: string;
  customItemQuantity: number;
  productPickerRef: React.RefObject<HTMLDivElement | null>;
  productSearchInputRef: React.RefObject<HTMLInputElement | null>;
  onSelectProduct: (id: string) => void;
  onProductQuantityChange: (qty: number) => void;
  onProductSearchChange: (value: string) => void;
  onToggleProductPicker: () => void;
  onCloseProductPicker: () => void;
  onAddProduct: () => void;
  onRemoveItem: (dealId: string, itemId: string) => void;
  onToggleCustomItem: () => void;
  onCustomItemNameChange: (value: string) => void;
  onCustomItemPriceChange: (value: string) => void;
  onCustomItemQuantityChange: (qty: number) => void;
  onAddCustomItem: () => void;
}

export interface DealDetailAIInsightsProps {
  deal: Deal;
  dealBoard: Board | undefined;
  isAnalyzing: boolean;
  isDrafting: boolean;
  aiResult: { suggestion: string; score: number } | null;
  emailDraft: string | null;
  objection: string;
  objectionResponses: string[];
  isGeneratingObjections: boolean;
  onAnalyze: () => void;
  onDraftEmail: () => void;
  onObjectionChange: (value: string) => void;
  onGenerateObjections: () => void;
}

export interface DealDetailModalsProps {
  deal: Deal;
  deals: Deal[];
  dealBoard: Board | undefined;
  deleteId: string | null;
  showLossReasonModal: boolean;
  lossReasonOrigin: 'button' | 'stage';
  pendingLostStageId: string | null;
  isActivityFormOpen: boolean;
  editingActivity: Activity | null;
  activityFormData: {
    title: string;
    type: Activity['type'];
    date: string;
    time: string;
    description: string;
    dealId: string;
    recurrenceType: 'none' | 'daily' | 'weekly' | 'monthly';
    recurrenceEndDate: string;
  };
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  onCloseLossReason: () => void;
  onConfirmLossReason: (reason: string) => void;
  onCloseActivityForm: () => void;
  onSubmitActivityForm: (e: React.FormEvent) => void;
  onSetActivityFormData: React.Dispatch<React.SetStateAction<{
    title: string;
    type: Activity['type'];
    date: string;
    time: string;
    description: string;
    dealId: string;
    recurrenceType: 'none' | 'daily' | 'weekly' | 'monthly';
    recurrenceEndDate: string;
  }>>;
  onClose: () => void;
  moveDeal: (deal: Deal, stageId: string, reason?: string, isWon?: boolean, isLost?: boolean) => void;
  updateDeal: (id: string, data: Record<string, unknown>) => void;
}

// Re-export types used by consumers
export type {
  ContactPreference,
  ContactTemperature,
  ContactClassification,
  PreferenceUrgency,
  PreferencePurpose,
  PropertyType,
};
