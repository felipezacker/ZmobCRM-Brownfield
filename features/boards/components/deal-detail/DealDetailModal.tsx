import React, { useId } from 'react';
import { useFocusReturn } from '@/lib/a11y';
import { FocusTrap } from '@/lib/a11y';
import { MODAL_OVERLAY_CLASS } from '@/components/ui/modalStyles';
import { DealSheet } from '@/features/boards/components/DealSheet';
import { Button } from '@/components/ui/button';
import { contactPreferencesService } from '@/lib/supabase/contact-preferences';

import type { DealDetailModalProps } from '@/features/boards/components/deal-detail/types';
import { DealDetailHeader } from '@/features/boards/components/deal-detail/deal-detail-header';
import { DealDetailSidebar } from '@/features/boards/components/deal-detail/deal-detail-sidebar';
import { DealDetailTimeline } from '@/features/boards/components/deal-detail/deal-detail-timeline';
import { DealDetailProducts } from '@/features/boards/components/deal-detail/deal-detail-products';
import { DealDetailAIInsights } from '@/features/boards/components/deal-detail/deal-detail-ai-insights';
import { DealDetailModals } from '@/features/boards/components/deal-detail/deal-detail-modals';
import { useDealDetail } from '@/features/boards/components/deal-detail/useDealDetail';

export const DealDetailModal: React.FC<DealDetailModalProps> = ({ dealId, isOpen, onClose }) => {
  const headingId = useId();
  useFocusReturn({ enabled: isOpen });

  const s = useDealDetail(dealId, isOpen, onClose);

  if (!isOpen || !s.deal) return null;

  const deal = s.deal;

  const inner = (
    <>
      <div
        className={s.isMobile
 ?'bg-white dark:bg-dark-card border border-border  w-full h-[100dvh] flex flex-col overflow-hidden pb-[var(--app-safe-area-bottom,0px)]'
            : 'bg-white dark:bg-dark-card border border-border  rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200'
        }
      >
        <DealDetailHeader
          deal={deal}
          dealBoard={s.dealBoard}
          resolvedContactName={s.resolvedContactName}
          headingId={headingId}
          isEditingValue={s.isEditingValue}
          editValue={s.editValue}
          isMobile={s.isMobile}
          estimatedCommission={s.estimatedCommission}
          onClose={onClose}
          onDelete={() => s.setDeleteId(deal.id)}
          onOpenCockpit={() => { onClose(); s.router.push(`/deals/${deal.id}/cockpit`); }}
          onEditValueStart={() => { s.setEditValue(deal.value.toString()); s.setIsEditingValue(true); }}
          onEditValueChange={s.setEditValue}
          onSaveValue={s.saveValue}
          onOwnerChange={s.handleOwnerChange}
          onWin={s.handleWin}
          onLose={s.handleLose}
          onReopen={s.handleReopen}
          onStageClick={s.handleStageClick}
        />

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-border p-4 sm:p-5 overflow-y-auto bg-white dark:bg-dark-card max-h-[38vh] md:max-h-none">
            <DealDetailSidebar
              deal={deal}
              contact={s.contact}
              resolvedContactName={s.resolvedContactName}
              preferences={s.preferences}
              propertyRef={s.propertyRef}
              customFieldDefinitions={s.customFieldDefinitions}
              lifecycleStageById={s.lifecycleStageById}
              estimatedCommission={s.estimatedCommission}
              onUpdateContact={(id, data) => s.updateContact(id, data)}
              onUpdateDeal={(id, data) => s.updateDeal(id, data)}
              onPropertyRefChange={s.onPropertyRefChange}
              onSetPreferences={s.setPreferences}
              onCreatePreferences={s.handleCreatePreferences}
              onUpdatePreference={(id, data) => contactPreferencesService.update(id, data)}
              onCopyPhone={s.handleCopyPhone}
            />
          </div>

          <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-dark-card">
            <div className="h-14 border-b border-border flex items-center px-6 shrink-0">
              <div className="flex gap-6">
                {(['timeline', 'products', 'info'] as const).map(tab => (
                  <Button
                    key={tab}
                    onClick={() => s.setActiveTab(tab)}
                    className={`text-sm font-bold h-14 border-b-2 transition-colors ${s.activeTab === tab ? 'border-primary-500 text-primary-600 ' : 'border-transparent text-muted-foreground hover:text-secondary-foreground dark:hover:text-white'}`}
                  >
                    {tab === 'timeline' ? 'Timeline' : tab === 'products' ? 'Produtos' : 'IA Insights'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-background/30 dark:bg-black/10">
              {s.activeTab === 'timeline' && (
                <DealDetailTimeline
                  deal={deal}
                  contact={s.contact}
                  timelineFeed={s.timelineFeed}
                  newNote={s.newNote}
                  noteTextareaRef={s.noteTextareaRef}
                  activitiesById={s.activitiesById}
                  onNewNoteChange={s.setNewNote}
                  onAddNote={s.handleAddNote}
                  onToggleActivity={s.handleToggleActivity}
                  onEditActivity={s.handleEditActivity}
                  onDeleteActivity={s.deleteActivity}
                />
              )}

              {s.activeTab === 'products' && (
                <DealDetailProducts
                  deal={deal}
                  products={s.products}
                  productsById={s.productsById}
                  selectedProductId={s.selectedProductId}
                  productQuantity={s.productQuantity}
                  productSearch={s.productSearch}
                  productPickerOpen={s.productPickerOpen}
                  filteredProducts={s.filteredProducts}
                  selectedProduct={s.selectedProduct}
                  showCustomItem={s.showCustomItem}
                  customItemName={s.customItemName}
                  customItemPrice={s.customItemPrice}
                  customItemQuantity={s.customItemQuantity}
                  productPickerRef={s.productPickerRef}
                  productSearchInputRef={s.productSearchInputRef}
                  onSelectProduct={s.handleSelectProduct}
                  onProductQuantityChange={s.setProductQuantity}
                  onProductSearchChange={s.setProductSearch}
                  onToggleProductPicker={() => s.setProductPickerOpen(!s.productPickerOpen)}
                  onCloseProductPicker={() => { s.setProductPickerOpen(false); s.setProductSearch(''); }}
                  onAddProduct={s.handleAddProduct}
                  onRemoveItem={s.removeItemFromDeal}
                  onToggleCustomItem={() => s.setShowCustomItem(v => !v)}
                  onCustomItemNameChange={s.setCustomItemName}
                  onCustomItemPriceChange={s.setCustomItemPrice}
                  onCustomItemQuantityChange={s.setCustomItemQuantity}
                  onAddCustomItem={s.handleAddCustomItem}
                />
              )}

              {s.activeTab === 'info' && (
                <DealDetailAIInsights
                  deal={deal}
                  dealBoard={s.dealBoard}
                  isAnalyzing={s.isAnalyzing}
                  isDrafting={s.isDrafting}
                  aiResult={s.aiResult}
                  emailDraft={s.emailDraft}
                  objection={s.objection}
                  objectionResponses={s.objectionResponses}
                  isGeneratingObjections={s.isGeneratingObjections}
                  onAnalyze={s.handleAnalyzeDeal}
                  onDraftEmail={s.handleDraftEmail}
                  onObjectionChange={s.setObjection}
                  onGenerateObjections={s.handleObjection}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <DealDetailModals
        deal={deal}
        deals={s.deals}
        dealBoard={s.dealBoard}
        deleteId={s.deleteId}
        showLossReasonModal={s.showLossReasonModal}
        lossReasonOrigin={s.lossReasonOrigin}
        pendingLostStageId={s.pendingLostStageId}
        isActivityFormOpen={s.isActivityFormOpen}
        editingActivity={s.editingActivity}
        activityFormData={s.activityFormData}
        onCloseDelete={() => s.setDeleteId(null)}
        onConfirmDelete={s.confirmDeleteDeal}
        onCloseLossReason={() => {
          s.setShowLossReasonModal(false);
          s.setPendingLostStageId(null);
          s.setLossReasonOrigin('button');
        }}
        onConfirmLossReason={() => {}}
        onCloseActivityForm={() => {
          s.setIsActivityFormOpen(false);
          s.setEditingActivity(null);
        }}
        onSubmitActivityForm={s.handleSubmitActivityForm}
        onSetActivityFormData={s.setActivityFormData}
        onClose={onClose}
        moveDeal={s.moveDeal}
        updateDeal={(id, data) => s.updateDeal(id, data)}
      />
    </>
  );

  if (s.isMobile) {
    return (
      <DealSheet isOpen={isOpen} onClose={onClose} ariaLabel={`Negocio: ${deal.title}`}>
        <div onKeyDown={s.handleKeyDown}>{inner}</div>
      </DealSheet>
    );
  }

  return (
    <FocusTrap active={isOpen} onEscape={onClose}>
      <div
        className={MODAL_OVERLAY_CLASS}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onKeyDown={s.handleKeyDown}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {inner}
      </div>
    </FocusTrap>
  );
};
