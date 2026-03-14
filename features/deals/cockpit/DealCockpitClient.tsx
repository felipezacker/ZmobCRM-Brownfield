'use client';

import React, { useState } from 'react';
import { Bug, Check, Monitor, Moon, Sun, X } from 'lucide-react';

import { useTheme } from '@/context/ThemeContext';
import { isDebugMode, enableDebugMode, disableDebugMode } from '@/lib/debug';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';
import { Button } from '@/components/ui/button';

import { CallModal } from '@/features/inbox/components/CallModal';
import { MessageComposerModal } from '@/features/inbox/components/MessageComposerModal';
import { ScheduleModal } from '@/features/inbox/components/ScheduleModal';

import { CockpitPipelineBar } from './CockpitPipelineBar';
import { CockpitActionPanel } from './CockpitActionPanel';
import { CockpitDataPanel } from './components';
import { CockpitTimeline } from './CockpitTimeline';
import { CockpitChecklist } from './CockpitChecklist';
import { CockpitRightRail } from './CockpitRightRail';
import { TemplatePickerModal } from './TemplatePickerModal';

import {
  buildSuggestedEmailBody,
  buildSuggestedWhatsAppMessage,
} from './cockpit-utils';

import { useDealCockpitState } from './hooks/useDealCockpitState';
import { useDealCockpitActions } from './hooks/useDealCockpitActions';
import { useDealCockpitSnapshot } from './hooks/useDealCockpitSnapshot';

export default function DealCockpitClient({ dealId }: { dealId?: string }) {
  const state = useDealCockpitState(dealId);
  const actions = useDealCockpitActions({
    selectedDeal: state.selectedDeal,
    selectedContact: state.selectedContact,
    selectedBoard: state.selectedBoard,
    stages: state.stages,
    actor: state.actor,
    nextBestAction: state.nextBestAction,
    addActivity: state.addActivity,
    updateDeal: state.updateDeal,
    updateContact: state.updateContact,
    moveDeal: state.moveDeal,
    applyVariables: state.applyVariables,
    templateVariables: state.templateVariables,
    preferences: state.preferences,
    setPreferences: state.setPreferences,
    profile: state.profile,
    addItemToDeal: state.addItemToDeal,
    removeItemFromDeal: state.removeItemFromDeal,
  });

  const cockpitSnapshot = useDealCockpitSnapshot({
    selectedDeal: state.selectedDeal,
    selectedContact: state.selectedContact,
    selectedBoard: state.selectedBoard,
    activeStage: state.activeStage,
    dealActivities: state.dealActivities,
    notes: state.notes,
    files: state.files,
    scripts: state.scripts,
    nextBestAction: state.nextBestAction,
    aiAnalysis: state.aiAnalysis,
    aiLoading: state.aiLoading,
    isNotesLoading: state.isNotesLoading,
    isFilesLoading: state.isFilesLoading,
    isScriptsLoading: state.isScriptsLoading,
  });

  const { themeMode, cycleTheme } = useTheme();
  const [debugEnabled, setDebugEnabled] = useState(() => isDebugMode());

  // --- Render ---

  if (state.crmError) {
    return (
      <div className="h-dvh bg-background dark:bg-background text-foreground dark:text-muted-foreground flex items-center justify-center p-8">
        <div className="max-w-xl w-full rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold">Cockpit</div>
            <div className="text-xs text-secondary-foreground dark:text-muted-foreground">/deals/[dealId]/cockpit</div>
          </div>
          <div className="mt-3 text-sm">Não foi possível carregar os dados do CRM.</div>
          <div className="mt-2 text-xs text-rose-700 dark:text-rose-100/80 break-words">{state.crmError}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted" onClick={() => void state.refreshCRM()}>Recarregar</Button>
            <Button type="button" className="rounded-xl border border-border bg-muted dark:bg-white/5 px-4 py-2 text-xs font-semibold hover:bg-accent dark:hover:bg-white/8" onClick={() => actions.router.push('/boards')}>Ir para Boards</Button>
          </div>
        </div>
      </div>
    );
  }

  if (state.crmLoading && (!state.deals || state.deals.length === 0)) {
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

  if (!state.selectedDeal || !state.selectedBoard) {
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
            <Button type="button" className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted" onClick={() => void state.refreshCRM()}>Recarregar</Button>
            <Button type="button" className="rounded-xl border border-border bg-muted dark:bg-white/5 px-4 py-2 text-xs font-semibold hover:bg-accent dark:hover:bg-white/8" onClick={() => actions.router.push('/boards')}>Ir para Boards</Button>
          </div>
        </div>
      </div>
    );
  }

  const deal = state.selectedDeal;
  const board = state.selectedBoard;
  const contact = state.selectedContact;

  return (
    <div className="fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-50 flex flex-col overflow-hidden bg-background dark:bg-background text-foreground dark:text-muted-foreground">
      {actions.toast ? (
        <div className="fixed right-6 top-6 z-50">
          <div
            className={actions.toast.tone ==='success'
                ? 'flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-100 shadow-xl shadow-border/30 dark:shadow-black/30'
                : actions.toast.tone === 'danger'
                  ? 'flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/15 px-4 py-3 text-sm text-rose-700 dark:text-rose-100 shadow-xl shadow-border/30 dark:shadow-black/30'
                  : 'flex items-center gap-2 rounded-2xl border border-border  bg-muted dark:bg-white/8 px-4 py-3 text-sm shadow-xl shadow-border/30 dark:shadow-black/30'
            }
            role="status"
            aria-live="polite"
          >
            {actions.toast.tone === 'success' ? <Check className="h-4 w-4" /> : actions.toast.tone === 'danger' ? <X className="h-4 w-4" /> : null}
            <div className="min-w-0 truncate">{actions.toast.message}</div>
          </div>
        </div>
      ) : null}

      <CockpitPipelineBar
        deal={deal}
        boardName={board.name ?? 'Pipeline'}
        sortedDeals={state.sortedDeals}
        stages={state.stages}
        stageIndex={state.stageIndex}
        activeStage={state.activeStage}
        crmLoading={state.crmLoading}
        onDealChange={actions.setDealInUrl}
        onStageChange={(id) => void actions.handleStageChange(id)}
        onBack={() => actions.router.push('/boards')}
        onWin={() => void actions.handleWin()}
        onLoss={() => void actions.handleLoss()}
        isWon={deal.isWon ?? false}
        isLost={deal.isLost ?? false}
        onReopen={() => void actions.handleReopen()}
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
              onClick={cycleTheme}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 transition-colors"
              title="Alternar tema"
            >
              {themeMode === 'system' ? <Monitor className="h-3.5 w-3.5" /> : themeMode === 'light' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
          </div>
        }
      />

      <div className="flex-1 min-h-0 w-full overflow-hidden px-6 py-4 2xl:px-10">
        <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[340px_1fr_400px] overflow-hidden">
          {/* Left rail */}
          <div className="flex min-h-0 flex-col gap-3 overflow-auto pr-1">
            <CockpitActionPanel
              health={state.health}
              aiLoading={state.aiLoading}
              onRefetchAI={() => void state.refetchAI()}
              nextBestAction={state.nextBestAction}
              onExecuteNext={() => void actions.handleExecuteNext()}
              onCall={actions.handleCall}
              onOpenMessageComposer={actions.openMessageComposer}
              onOpenScheduleModal={actions.openScheduleModal}
              onOpenTemplatePicker={actions.openTemplatePicker}
              buildWhatsAppMessage={() =>
                buildSuggestedWhatsAppMessage({ contact: contact ?? undefined, deal, actionType: state.nextBestAction.actionType, action: state.nextBestAction.action, reason: state.nextBestAction.reason })
              }
              buildEmailBody={() =>
                buildSuggestedEmailBody({ contact: contact ?? undefined, deal, actionType: state.nextBestAction.actionType, action: state.nextBestAction.action, reason: state.nextBestAction.reason })
              }
              dealTitle={deal.title}
              isScriptsLoading={state.isScriptsLoading}
              scriptsCount={state.scripts.length}
            />
            <CockpitDataPanel
              deal={deal}
              contact={contact}
              phoneE164={actions.phoneE164}
              onCopy={(label, text) => void actions.copyToClipboard(label, text)}
              estimatedCommission={state.estimatedCommission}
              preferences={state.preferences}
              customFieldDefinitions={state.customFieldDefinitions}
              products={state.products}
              onUpdateDeal={actions.handleUpdateDeal}
              onUpdateContact={actions.handleUpdateContact}
              onUpdatePreferences={actions.handleUpdatePreferences}
              onCreatePreferences={actions.handleCreatePreferences}
              onAddItem={actions.handleAddItem}
              onRemoveItem={actions.handleRemoveItem}
            />
          </div>

          {/* Center */}
          <div className="flex min-h-0 flex-col gap-4 overflow-auto">
            <CockpitTimeline
              timelineItems={state.timelineItems}
              actor={state.actor}
              dealId={deal.id}
              dealTitle={deal.title}
              addActivity={state.addActivity}
              pushToast={actions.pushToast}
              notes={state.notes}
              isNotesLoading={state.isNotesLoading}
            />

            <CockpitChecklist
              checklist={actions.checklist}
              onPersistChecklist={(next) => void actions.persistChecklist(next)}
              onReload={actions.loadChecklistFromDeal}
            />
          </div>

          {/* Right rail */}
          <CockpitRightRail
            dealId={deal.id}
            dealTitle={deal.title}
            boardId={board.id}
            contactId={contact?.id}
            cockpitSnapshot={cockpitSnapshot}
            notes={state.notes}
            isNotesLoading={state.isNotesLoading}
            createNote={state.createNote}
            deleteNote={state.deleteNote}
            files={state.files}
            isFilesLoading={state.isFilesLoading}
            uploadFile={state.uploadFile}
            deleteFile={state.deleteFile}
            downloadFile={state.downloadFile}
            formatFileSize={state.formatFileSize}
            scripts={state.scripts}
            isScriptsLoading={state.isScriptsLoading}
            applyVariables={state.applyVariables}
            getCategoryInfo={state.getCategoryInfo}
            templateVariables={state.templateVariables}
            contactNotes={contact?.notes ?? null}
            onUpdateContactNotes={(notes) => { if (contact?.id) state.updateContact(contact.id, { notes } as Parameters<typeof state.updateContact>[1]); }}
            crmLoading={state.crmLoading}
            onRefreshCRM={() => void state.refreshCRM()}
            onCopy={(label, text) => void actions.copyToClipboard(label, text)}
            pushToast={actions.pushToast}
          />
        </div>
      </div>

      <CallModal
        isOpen={actions.isCallModalOpen}
        onClose={() => actions.setIsCallModalOpen(false)}
        onSave={actions.handleCallLogSave}
        contactName={contact?.name || 'Contato'}
        contactPhone={contact?.phone || ''}
        suggestedTitle={actions.callSuggestedTitle}
      />

      <TemplatePickerModal
        isOpen={actions.isTemplatePickerOpen}
        onClose={() => actions.setIsTemplatePickerOpen(false)}
        mode={actions.templatePickerMode}
        scripts={state.scripts}
        isLoading={state.isScriptsLoading}
        variables={state.templateVariables}
        applyVariables={state.applyVariables}
        getCategoryInfo={state.getCategoryInfo}
        onPick={actions.handlePickTemplate}
      />

      <MessageComposerModal
        isOpen={actions.isMessageModalOpen}
        onClose={() => { actions.setIsMessageModalOpen(false); actions.setMessagePrefill(null); actions.setMessageLogContext(null); }}
        channel={actions.messageChannel}
        contactName={contact?.name || 'Contato'}
        contactEmail={contact?.email}
        contactPhone={contact?.phone}
        initialSubject={actions.messagePrefill?.subject}
        initialMessage={actions.messagePrefill?.message}
        onExecuted={(ev) => void actions.handleMessageExecuted(ev)}
        aiContext={{
          cockpitSnapshot,
          nextBestAction: { action: state.nextBestAction.action, reason: state.nextBestAction.reason, actionType: state.nextBestAction.actionType as 'CALL' | 'MEETING' | 'EMAIL' | 'TASK' | 'WHATSAPP', urgency: state.nextBestAction.urgency as 'low' | 'medium' | 'high' },
        }}
      />

      <ScheduleModal
        isOpen={actions.isScheduleModalOpen}
        onClose={() => { actions.setIsScheduleModalOpen(false); actions.setScheduleInitial(null); }}
        onSave={(data) => void actions.handleScheduleSave(data)}
        contactName={contact?.name || 'Contato'}
        initialType={actions.scheduleInitial?.type}
        initialTitle={actions.scheduleInitial?.title}
        initialDescription={actions.scheduleInitial?.description}
      />
    </div>
  );
}
