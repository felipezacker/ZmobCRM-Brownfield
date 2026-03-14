'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { PhoneOutgoing, Play, Square, Filter, Users, BarChart3, ListChecks, BookmarkPlus, FileDown, Upload, Eye, Search, Trophy, TrendingUp, Clock, RefreshCw, Calendar } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { CallQueue } from './components/CallQueue'
import { PowerDialer } from './components/PowerDialer'
import { SessionSummary } from './components/SessionSummary'
import { AddToQueueSearch } from './components/AddToQueueSearch'
import { ProspectingFilters } from './components/ProspectingFilters'
import { useContactLists } from '@/lib/query/hooks/useContactListsQuery'
import { FilteredContactsList } from './components/FilteredContactsList'
import { BrokerFilterDropdown } from './components/BrokerFilterDropdown'
import { MetricsCards } from './components/MetricsCards'
import { MetricsDrilldownModal } from './components/MetricsDrilldownModal'
import { LiveOperationsPanel } from './components/LiveOperationsPanel'
import { MetricsChart } from './components/MetricsChart'
import { ConversionFunnel } from './components/ConversionFunnel'
import { AutoInsights } from './components/AutoInsights'
import { CallDetailsTable } from './components/CallDetailsTable'
import { ProspectingImpactSection } from './components/ProspectingImpactSection'
import { BrokerSummaryCard } from './components/BrokerSummaryCard'
import { CorretorRanking } from './components/CorretorRanking'
import { DailyGoalCard } from './components/DailyGoalCard'
import { ConnectionHeatmap } from './components/ConnectionHeatmap'
import { NeglectedContactsAlert } from './components/NeglectedContactsAlert'
import { PerformanceComparison } from './components/PerformanceComparison'
import { TopObjections } from './components/TopObjections'
import { SkipReasonsChart } from './components/SkipReasonsChart'
import { RetryEffectiveness } from './components/RetryEffectiveness'
import { QueueThroughput } from './components/QueueThroughput'
import { MetricsSection } from './components/MetricsSection'
import { ProspectingErrorBoundary } from './components/ProspectingErrorBoundary'
import { GoalConfigModal } from './components/GoalConfigModal'
import { NoteTemplatesManager } from './components/NoteTemplatesManager'
import { SaveQueueModal } from './components/SaveQueueModal'
import { SavedQueuesList } from './components/SavedQueuesList'
import { ImportListModal } from './components/ImportListModal'
import { useProspectingGoals } from './hooks/useProspectingGoals'
import { useSavedQueues } from './hooks/useSavedQueues'
import { useProspectingQueue } from './hooks/useProspectingQueue'
import { useProspectingFilteredContacts } from './hooks/useProspectingFilteredContacts'
import { useProspectingMetrics } from './hooks/useProspectingMetrics'
import { useProspectingImpact } from './hooks/useProspectingImpact'
import { useLiveOperations } from './hooks/useLiveOperations'
import { useSkipReasons } from './hooks/useSkipReasons'
import { useRetryEffectiveness } from './hooks/useRetryEffectiveness'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useTags } from '@/hooks/useTags'
import { supabase } from '@/lib/supabase/client'
import { SessionBriefing } from './components/SessionBriefing'
import { SessionHistory } from './components/SessionHistory'
import { ContactDetailModal } from '@/features/contacts/components/ContactDetailModal'
import { listSessions, type ProspectingSession } from '@/lib/supabase/prospecting-sessions'
import { suggestBestTime } from './utils/suggestBestTime'
import { useProspectingPageState, type OrgProfile } from '@/features/prospecting/hooks/useProspectingPageState'
import { PROSPECTING_CONFIG } from '@/features/prospecting/prospecting-config'
import type { DrilldownCardType } from '@/features/prospecting/constants'

export type { SessionStats } from '@/features/prospecting/hooks/useProspectingPageState'

function formatTimeAgo(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000)
  if (diff < 10) return 'agora'
  if (diff < 60) return `há ${diff}s`
  const mins = Math.floor(diff / 60)
  if (mins < 60) return `há ${mins} min`
  const hours = Math.floor(mins / 60)
  return `há ${hours}h`
}

export const ProspectingPage: React.FC = () => {
  const { profile } = useAuth()
  const { addToast, showToast } = useToast()
  const toast = addToast || showToast

  // isAdminOrDirector comes from metricsHook (single source of truth)
  const { tags: availableTags } = useTags()

  // Org profiles for owner filter + director assignment + metrics ranking
  const { data: profiles = [] } = useQuery<OrgProfile[]>({
    queryKey: ['profiles'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase
        .from('profiles')
        .select('id, name, first_name, avatar_url, role')
        .order('name')
      return (data || []).map(p => ({
        id: p.id,
        name: p.name || p.first_name || 'Sem nome',
        avatar: p.avatar_url || undefined,
        role: p.role as string,
      }))
    },
    staleTime: 5 * 60 * 1000,
  })

  // CL-1: Contact lists for filter dropdown
  const { data: contactLists = [] } = useContactLists()

  // Products for filter dropdown
  const { data: activeProducts = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['productsActive'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase
        .from('products')
        .select('id, name')
        .eq('active', true)
        .order('name')
      return (data || []).map(p => ({ id: p.id, name: p.name }))
    },
    staleTime: 5 * 60 * 1000,
  })

  // --- Page state hook (all useState + handlers) ---
  const pageState = useProspectingPageState(profile?.id, profile?.organization_id)

  const {
    setDeps,
    activeTab, setActiveTab,
    metricsPeriod, setMetricsPeriod,
    customRange, setCustomRange,
    metricsFilterOwnerId, setMetricsFilterOwnerId,
    comparisonMode, setComparisonMode,
    showSaveQueueModal, setShowSaveQueueModal,
    isGeneratingPdf,
    viewQueueOwnerId, setViewQueueOwnerId,
    isViewingAll,
    showFilters, setShowFilters,
    filters, setFilters,
    assignToOwnerId, setAssignToOwnerId,
    queueContactIdsSet,
    showBriefing, setShowBriefing,
    handleConfirmStart,
    handleCancelBriefing,
    showSummary, setShowSummary,
    selectedScript, setSelectedScript,
    sessionStats,
    sessionStartTime,
    pendingActiveSession,
    activeSessionCount,
    handleResumeSession,
    handleDismissActiveSession,
    handleDismissAllSessions,
    handleIgnoreActiveSession,
    handleStartSession,
    handleEndSession,
    handleCallComplete,
    handleApplyFilters,
    handleAddBatchToQueue,
    handleLoadSavedQueue,
    handleExportPdf,
    isBatchAdding,
    batchAddCount,
  } = pageState

  // CP-3.2: Note templates manager modal
  const [showTemplatesManager, setShowTemplatesManager] = useState(false)
  // CP-IMP-1: Import list modal
  const [showImportModal, setShowImportModal] = useState(false)
  const [contactModalId, setContactModalId] = useState<string | null>(null)

  // CP-5.4: Drilldown modal state
  const [drilldownCard, setDrilldownCard] = useState<DrilldownCardType | null>(null)

  // --- External feature hooks (use state values from pageState) ---

  // CP-1.4: Metrics (CP-6.4: comparison support)
  const metricsHook = useProspectingMetrics(metricsPeriod, customRange, profiles, metricsFilterOwnerId || undefined, comparisonMode === 'previous')
  const { invalidateMetrics, isAdminOrDirector } = metricsHook

  // CP-5.3: Prospecting impact metrics
  const impactHook = useProspectingImpact(metricsPeriod, customRange, metricsFilterOwnerId || undefined)

  // CP-5.6: Live operations (admin/director only)
  const liveOps = useLiveOperations(profile?.organization_id, profiles, isAdminOrDirector)

  // New metrics: skip reasons + retry effectiveness
  const skipReasonsQuery = useSkipReasons({ filterOwnerId: metricsFilterOwnerId || undefined })
  const retryQuery = useRetryEffectiveness(metricsFilterOwnerId || undefined)

  // CP-3.6: Team average + user metrics for PerformanceComparison
  const teamAverage = useMemo(() => {
    const brokers = metricsHook.metrics?.byBroker || []
    const active = brokers.filter(b => b.totalCalls > 0)
    if (active.length === 0) return null
    const n = active.length
    return {
      ownerId: '',
      ownerName: 'Time',
      totalCalls: active.reduce((s, b) => s + b.totalCalls, 0) / n,
      connectedCalls: active.reduce((s, b) => s + b.connectedCalls, 0) / n,
      connectionRate: active.reduce((s, b) => s + b.connectionRate, 0) / n,
      avgDuration: active.reduce((s, b) => s + b.avgDuration, 0) / n,
      uniqueContacts: active.reduce((s, b) => s + b.uniqueContacts, 0) / n,
    }
  }, [metricsHook.metrics?.byBroker])

  const userMetrics = useMemo(() => {
    if (!profile?.id || !metricsHook.metrics?.byBroker) return null
    return metricsHook.metrics.byBroker.find(b => b.ownerId === profile.id) || null
  }, [profile?.id, metricsHook.metrics?.byBroker])

  const periodDays = useMemo(() => {
    const start = new Date(metricsHook.range.start)
    const end = new Date(metricsHook.range.end)
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
  }, [metricsHook.range])

  // CP-2.3 + QV-1.7 Bug #9: Daily goals + heatmap
  const goalsHook = useProspectingGoals(metricsHook.activities, metricsFilterOwnerId || undefined)

  // CP-2.4: Saved queues + PDF export
  const savedQueuesHook = useSavedQueues()

  // CP-3.4: Session history
  const { data: sessionHistory = [], isLoading: isLoadingSessions } = useQuery<ProspectingSession[]>({
    queryKey: ['prospecting-sessions', profile?.organization_id, metricsFilterOwnerId],
    queryFn: () => listSessions(
      metricsFilterOwnerId || profile?.id,
      profile?.organization_id || '',
      PROSPECTING_CONFIG.SESSION_HISTORY_LIMIT,
    ),
    enabled: !!profile?.organization_id,
    staleTime: 30 * 1000,
  })

  // Queue owner view: resolvedViewOwnerId computed here (needs isAdminOrDirector)
  const resolvedViewOwnerId = useMemo(() => {
    if (isViewingAll) return '__all__'
    if (viewQueueOwnerId) return viewQueueOwnerId
    if (isAdminOrDirector && profile?.id) return profile.id
    return undefined
  }, [viewQueueOwnerId, isViewingAll, isAdminOrDirector, profile?.id])

  const queueHook = useProspectingQueue({
    viewOwnerId: resolvedViewOwnerId,
    onCurrentIndexChange: pageState.syncCurrentIndex,
    initialCurrentIndex: pageState.currentIndexRef.current,
  })

  const {
    queue,
    exhaustedItems,
    currentIndex,
    sessionActive,
    isLoading,
    isClearingQueue,
    removingId,
    retryOutcomes,
    setRetryOutcomes,
    skip,
    addToQueue,
    removeFromQueue,
    clearQueue,
    resetExhaustedItem,
    removeBatchItems,
    reorderQueue,
    isReordering,
    moveToTop,
  } = queueHook

  // CP-1.3: Filtered contacts
  const filteredContactsHook = useProspectingFilteredContacts()

  // --- Sync deps to pageState ref ---
  useEffect(() => {
    setDeps({
      toast,
      profiles,
      resolvedViewOwnerId,
      queueDeps: queueHook,
      metricsDeps: metricsHook,
      filteredContacts: filteredContactsHook,
      savedQueuesDeps: savedQueuesHook,
    })
  }, [setDeps, toast, profiles, resolvedViewOwnerId, queueHook, metricsHook, filteredContactsHook, savedQueuesHook])

  // CP-3.4: Compute suggested return time from heatmap data (AC6-AC8)
  const suggestedReturnTime = useMemo(
    () => suggestBestTime(metricsHook.activities),
    [metricsHook.activities],
  )

  const currentContact = sessionActive && queue[currentIndex] ? queue[currentIndex] : null
  const pendingCount = queue.filter(q => q.status === 'pending').length
  const skippedCount = queue.filter(q => q.status === 'skipped').length
  const canStartSession = pendingCount + skippedCount > 0

  const viewingOwnerProfile = viewQueueOwnerId && !isViewingAll ? profiles.find(p => p.id === viewQueueOwnerId) : null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border dark:border-border/50 shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/10 rounded-xl">
              <PhoneOutgoing size={20} className="text-primary-500" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Prospecção</h1>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                {queue.length} contato{queue.length !== 1 ? 's' : ''} na fila
                {sessionActive && ` · ${pendingCount} pendente${pendingCount !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!sessionActive && !showSummary && (
              <div className="flex items-center bg-muted dark:bg-white/10 rounded-lg p-0.5 mr-1">
                <Button
                  variant="unstyled"
                  size="unstyled"
                  onClick={() => setActiveTab('queue')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === 'queue'
                      ? 'bg-white dark:bg-white/15 text-foreground  shadow-sm'
                      : 'text-muted-foreground dark:text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground'
                  }`}
                >
                  <ListChecks size={13} />
                  Fila
                </Button>
                <Button
                  variant="unstyled"
                  size="unstyled"
                  onClick={() => setActiveTab('metrics')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === 'metrics'
                      ? 'bg-white dark:bg-white/15 text-foreground  shadow-sm'
                      : 'text-muted-foreground dark:text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground'
                  }`}
                >
                  <BarChart3 size={13} />
                  Métricas
                </Button>
              </div>
            )}

            {!sessionActive && !showSummary && activeTab === 'queue' && (
              <>
                {/* CP-IMP-1: Import list button */}
                <Button
                  variant="unstyled"
                  size="unstyled"
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-muted text-secondary-foreground hover:bg-accent dark:bg-white/10 dark:text-muted-foreground dark:hover:bg-white/15 transition-colors"
                >
                  <Upload size={14} />
                  Importar Lista
                </Button>
                <Button
                  variant="unstyled"
                  size="unstyled"
                  onClick={() => setShowFilters(prev => !prev)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showFilters
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300'
                      : 'bg-muted text-secondary-foreground hover:bg-accent dark:bg-white/10 dark:text-muted-foreground dark:hover:bg-white/15'
                  }`}
                >
                  <Filter size={14} />
                  Filtros em Massa
                </Button>
                {/* CP-2.4: Save queue button (visible when filters are applied) */}
                {showFilters && filteredContactsHook.hasResults && (
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    onClick={() => setShowSaveQueueModal(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 transition-colors"
                  >
                    <BookmarkPlus size={14} />
                    Salvar Fila
                  </Button>
                )}
                {/* CP-2.4: Saved queues dropdown */}
                <SavedQueuesList
                  savedQueues={savedQueuesHook.savedQueues}
                  isLoading={savedQueuesHook.isLoading}
                  isDeleting={savedQueuesHook.isDeleting}
                  currentUserId={profile?.id || ''}
                  onLoad={handleLoadSavedQueue}
                  onDelete={savedQueuesHook.deleteQueue}
                />
                <Button
                  variant="unstyled"
                  size="unstyled"
                  onClick={() => setShowBriefing(true)}
                  disabled={!canStartSession}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play size={16} />
                  Iniciar Sessão
                </Button>
              </>
            )}
            {sessionActive && (
              <Button
                variant="unstyled"
                size="unstyled"
                onClick={handleEndSession}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
              >
                <Square size={16} />
                Encerrar Sessão
              </Button>
            )}
          </div>
        </div>

        {/* Team queue selector — Popover dropdown (same pattern as boards) */}
        {isAdminOrDirector && !sessionActive && !showSummary && activeTab === 'queue' && (
          <div className="px-4 pb-3">
            <BrokerFilterDropdown
              profiles={profiles}
              selectedId={viewQueueOwnerId}
              onSelect={setViewQueueOwnerId}
              showMineOption
              allLabel="Todos os Corretores"
              mineLabel="Minha Fila"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* CP-3.4 + CP-4.8: Active session resume prompt */}
        {pendingActiveSession && !sessionActive && !showSummary && (
          <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
            <PhoneOutgoing size={16} className="text-amber-600 shrink-0" />
            <span className="text-sm text-amber-700 dark:text-amber-300 flex-1">
              {activeSessionCount >= 2
                ? `${activeSessionCount} sessoes ativas encontradas. Deseja retomar a mais recente ou encerrar todas?`
                : `Sessao ativa encontrada (iniciada em ${new Date(pendingActiveSession.startedAt).toLocaleString('pt-BR')}). Deseja retomar?`
              }
            </span>
            <Button
              variant="unstyled"
              size="unstyled"
              onClick={handleResumeSession}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors"
            >
              {activeSessionCount >= 2 ? 'Retomar mais recente' : 'Retomar'}
            </Button>
            <Button
              variant="unstyled"
              size="unstyled"
              onClick={activeSessionCount >= 2 ? handleDismissAllSessions : handleDismissActiveSession}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-accent text-secondary-foreground dark:bg-white/10 dark:text-muted-foreground dark:hover:bg-white/15 transition-colors"
            >
              {activeSessionCount >= 2 ? 'Encerrar todas' : 'Encerrar'}
            </Button>
            <Button
              variant="unstyled"
              size="unstyled"
              onClick={handleIgnoreActiveSession}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-secondary-foreground transition-colors"
            >
              Ignorar
            </Button>
          </div>
        )}

        {showSummary ? (
          <SessionSummary
            stats={sessionStats}
            startTime={sessionStartTime}
            onClose={() => setShowSummary(false)}
          />
        ) : sessionActive && currentContact ? (
          <ProspectingErrorBoundary section="Power Dialer">
            <PowerDialer
              contact={currentContact}
              currentIndex={currentIndex}
              totalCount={queue.length}
              onCallComplete={handleCallComplete}
              onSkip={skip}
              onEnd={handleEndSession}
              selectedScript={selectedScript}
              onScriptChange={setSelectedScript}
              sessionStats={sessionStats}
              isAdminOrDirector={isAdminOrDirector}
              onManageTemplates={() => setShowTemplatesManager(true)}
              suggestedReturnTime={suggestedReturnTime}
              goalProgress={goalsHook.progress}
            />
          </ProspectingErrorBoundary>
        ) : activeTab === 'metrics' ? (
          <div className="space-y-4">
            {metricsHook.error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">
                <span>Erro ao carregar métricas. Tente novamente.</span>
                <Button
                  variant="unstyled"
                  size="unstyled"
                  onClick={() => invalidateMetrics()}
                  className="ml-auto px-3 py-1 rounded-lg bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 text-red-700 dark:text-red-300 text-xs font-medium transition-colors"
                >
                  Tentar novamente
                </Button>
              </div>
            )}
            {metricsHook.isDataTruncated && (
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                Exibindo as 5.000 ligações mais recentes. Reduza o período para dados completos.
              </div>
            )}

            {/* CP-5.6: Live operations panel (admin/director only) */}
            {isAdminOrDirector && (
              <ProspectingErrorBoundary section="Operação Ao Vivo">
                <LiveOperationsPanel
                  sessions={liveOps.sessions}
                  activeCount={liveOps.activeCount}
                  isLoading={liveOps.isLoading}
                />
              </ProspectingErrorBoundary>
            )}

            {/* Dashboard header with dynamic title + actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-secondary-foreground dark:text-muted-foreground">
                  Métricas — {metricsPeriod === 'today' ? 'Hoje' : metricsPeriod === 'yesterday' ? 'Ontem' : metricsPeriod === '7d' ? 'Últimos 7 dias' : metricsPeriod === '30d' ? 'Últimos 30 dias' : 'Período personalizado'}
                </span>
                {metricsHook.dataUpdatedAt > 0 && (
                  <span className="text-2xs text-muted-foreground">
                    Atualizado {formatTimeAgo(metricsHook.dataUpdatedAt)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isAdminOrDirector && (
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    onClick={() => invalidateMetrics()}
                    disabled={metricsHook.isLoading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-muted text-secondary-foreground hover:bg-accent dark:bg-white/10 dark:text-muted-foreground dark:hover:bg-white/15 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={metricsHook.isLoading ? 'animate-spin' : ''} />
                    Atualizar
                  </Button>
                )}
                <Button
                  variant="unstyled"
                  size="unstyled"
                  onClick={handleExportPdf}
                  disabled={isGeneratingPdf || metricsHook.isLoading || !metricsHook.metrics}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-muted text-secondary-foreground hover:bg-accent dark:bg-white/10 dark:text-muted-foreground dark:hover:bg-white/15 transition-colors disabled:opacity-50"
                >
                  <FileDown size={14} />
                  {isGeneratingPdf ? 'Gerando PDF...' : 'Exportar PDF'}
                </Button>
              </div>
            </div>

            {/* Filters: period select + DateRangePicker + comparison toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-muted-foreground shrink-0" />
                <select
                  aria-label="Período"
                  value={metricsPeriod}
                  onChange={(e) => {
                    const val = e.target.value as typeof metricsPeriod
                    setMetricsPeriod(val)
                    if (val !== 'custom') setCustomRange(undefined)
                  }}
                  className="px-3 py-2 bg-white dark:bg-card border border-border dark:border-border rounded-lg text-sm font-medium text-secondary-foreground dark:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="today">Hoje</option>
                  <option value="yesterday">Ontem</option>
                  <option value="7d">Últimos 7 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                  <option value="custom">Personalizado</option>
                </select>
                {metricsPeriod === 'custom' && (
                  <DateRangePicker
                    from={customRange?.start || ''}
                    to={customRange?.end || ''}
                    onChangeFrom={(date) => {
                      setCustomRange(prev => ({ start: date, end: prev?.end || '' }))
                    }}
                    onChangeTo={(date) => {
                      setCustomRange(prev => ({ start: prev?.start || '', end: date }))
                    }}
                  />
                )}
              </div>

              {/* CP-6.4: Comparison toggle */}
              <Button
                variant="unstyled"
                size="unstyled"
                onClick={() => setComparisonMode(comparisonMode === 'none' ? 'previous' : 'none')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  comparisonMode === 'previous'
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300'
                    : 'bg-muted text-secondary-foreground hover:bg-accent dark:bg-white/10 dark:text-muted-foreground dark:hover:bg-white/15'
                }`}
              >
                vs Anterior
              </Button>

              {metricsHook.isFetching && !metricsHook.isLoading && (
                <span className="text-xs text-muted-foreground animate-pulse">Atualizando...</span>
              )}
            </div>

            {/* Broker filter dropdown (admin/director only) */}
            {isAdminOrDirector && profiles.length > 0 && (
              <BrokerFilterDropdown
                profiles={profiles}
                selectedId={metricsFilterOwnerId}
                onSelect={setMetricsFilterOwnerId}
              />
            )}

            {/* ═══ SECTION: Visao Geral ═══ */}
            <MetricsSection title="Visao Geral" icon={Eye} iconColor="text-blue-500">
              {/* CP-2.3: Daily goal card */}
              <DailyGoalCard
                progress={goalsHook.progress}
                isLoading={goalsHook.isLoading}
                isAdminOrDirector={goalsHook.isAdminOrDirector}
                onConfigureClick={() => goalsHook.setShowGoalModal(true)}
              />

              {/* CP-3.6: PerformanceComparison — corretores only */}
              <PerformanceComparison
                userMetrics={userMetrics}
                teamAverage={teamAverage}
                isAdminOrDirector={isAdminOrDirector}
                periodDays={periodDays}
              />

              {/* CP-3.6: NeglectedContactsAlert */}
              <NeglectedContactsAlert
                onAddAllToQueue={handleAddBatchToQueue}
                onError={() => toast('Erro ao buscar contatos negligenciados', 'error')}
              />

              {/* CP-5.5: Broker summary card when filtering by corretor */}
              {metricsFilterOwnerId && metricsHook.metrics && (
                <BrokerSummaryCard
                  brokerName={profiles.find(p => p.id === metricsFilterOwnerId)?.name || 'Corretor'}
                  metrics={metricsHook.metrics}
                  impact={impactHook.impact}
                />
              )}

              <ProspectingErrorBoundary section="Metricas">
                <MetricsCards
                  metrics={metricsHook.metrics}
                  isLoading={metricsHook.isLoading}
                  onCardClick={setDrilldownCard}
                  comparisonMetrics={metricsHook.comparisonMetrics}
                  isComparisonLoading={metricsHook.isComparisonLoading}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                  <ConversionFunnel metrics={metricsHook.metrics} isLoading={metricsHook.isLoading} />
                  <MetricsChart
                    data={metricsHook.metrics?.byDay || []}
                    isLoading={metricsHook.isLoading}
                    periodStart={metricsHook.range.start}
                    periodEnd={metricsHook.range.end}
                  />
                </div>
              </ProspectingErrorBoundary>
            </MetricsSection>

            {/* ═══ SECTION: Analise Detalhada ═══ */}
            <MetricsSection title="Analise Detalhada" icon={Search} iconColor="text-violet-500">
              <ProspectingErrorBoundary section="Heatmap">
                <ConnectionHeatmap
                  activities={metricsHook.activities}
                  isLoading={metricsHook.isLoading}
                />
              </ProspectingErrorBoundary>

              <AutoInsights metrics={metricsHook.metrics} isLoading={metricsHook.isLoading} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TopObjections activities={metricsHook.activities} isLoading={metricsHook.isLoading} />
                <SkipReasonsChart data={skipReasonsQuery.data || []} isLoading={skipReasonsQuery.isLoading} />
              </div>

              <RetryEffectiveness data={retryQuery.data} isLoading={retryQuery.isLoading} />
            </MetricsSection>

            {/* ═══ SECTION: Fila ═══ */}
            <MetricsSection title="Fila" icon={ListChecks} iconColor="text-amber-500">
              <QueueThroughput
                queue={queue}
                exhaustedItems={exhaustedItems}
                isLoading={isLoading}
              />
            </MetricsSection>

            {/* ═══ SECTION: Equipe ═══ */}
            {isAdminOrDirector && !metricsFilterOwnerId && (
              <MetricsSection title="Equipe" icon={Trophy} iconColor="text-amber-500">
                <CorretorRanking
                  brokers={metricsHook.metrics?.byBroker || []}
                  isLoading={metricsHook.isLoading}
                />
              </MetricsSection>
            )}

            {/* ═══ SECTION: Pipeline ═══ */}
            <MetricsSection title="Pipeline" icon={TrendingUp} iconColor="text-emerald-500" defaultOpen={false}>
              <ProspectingErrorBoundary section="Impacto">
                <ProspectingImpactSection
                  impact={impactHook.impact}
                  isLoading={impactHook.isLoading}
                />
              </ProspectingErrorBoundary>
            </MetricsSection>

            {/* ═══ SECTION: Sessoes ═══ */}
            <MetricsSection title="Sessoes" icon={Clock} iconColor="text-gray-500" defaultOpen={false}>
              <ProspectingErrorBoundary section="Historico de Sessoes">
                <SessionHistory
                  sessions={sessionHistory}
                  isLoading={isLoadingSessions}
                />
              </ProspectingErrorBoundary>

              <CallDetailsTable
                activities={metricsHook.activities}
                profiles={profiles}
                isLoading={metricsHook.isLoading}
              />
            </MetricsSection>
          </div>
        ) : (
          <div className="space-y-4">
            {/* CP-1.3: Mass filter panel */}
            {showFilters && (
              <div className="space-y-4">
                <ProspectingFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  profiles={profiles}
                  contactLists={contactLists}
                  products={activeProducts}
                  availableTags={availableTags}
                  showCorretorFilter={isAdminOrDirector}
                  onApply={handleApplyFilters}
                  onClose={() => setShowFilters(false)}
                />

                {/* Director: assign queue to corretor */}
                {isAdminOrDirector && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl">
                    <Users size={16} className="text-blue-500 shrink-0" />
                    <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                      Atribuir fila para:
                    </span>
                    <select
                      className="bg-white dark:bg-black/20 border border-blue-200 dark:border-blue-500/20 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={assignToOwnerId}
                      onChange={(e) => setAssignToOwnerId(e.target.value)}
                    >
                      <option value="">Minha fila</option>
                      {profiles.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Filtered results */}
                {filteredContactsHook.hasResults && (
                  <FilteredContactsList
                    contacts={filteredContactsHook.contacts}
                    totalCount={filteredContactsHook.totalCount}
                    page={filteredContactsHook.page}
                    totalPages={filteredContactsHook.totalPages}
                    onPageChange={filteredContactsHook.goToPage}
                    isLoading={filteredContactsHook.isLoading}
                    isFetching={filteredContactsHook.isFetching}
                    existingQueueContactIds={queueContactIdsSet}
                    currentQueueSize={queue.length}
                    onAddToQueue={handleAddBatchToQueue}
                    onSelectAllFiltered={filteredContactsHook.getAllFilteredIds}
                  />
                )}
              </div>
            )}

            {isBatchAdding && (
              <span role="status" aria-live="polite" className="text-xs text-muted-foreground animate-pulse">
                Adicionando {batchAddCount} contatos...
              </span>
            )}
            <AddToQueueSearch onAdd={addToQueue} />
            <ProspectingErrorBoundary section="Fila">
              <CallQueue
                items={queue}
                exhaustedItems={exhaustedItems}
                isLoading={isLoading}
                onRemove={removeFromQueue}
                onClearAll={isViewingAll ? undefined : clearQueue}
                onResetExhausted={resetExhaustedItem}
                isClearing={isClearingQueue}
                removingId={removingId}
                ownerName={isViewingAll ? 'Todos' : viewingOwnerProfile?.name}
                isSessionActive={sessionActive}
                onBatchRemove={removeBatchItems}
                onBatchMoveToTop={moveToTop}
                onReorder={reorderQueue}
                isReordering={isReordering}
                onOpenContact={setContactModalId}
              />
            </ProspectingErrorBoundary>
          </div>
        )}
      </div>

      {/* CP-4.1: Session briefing modal */}
      {showBriefing && (
        <SessionBriefing
          pendingCount={pendingCount}
          skippedCount={skippedCount}
          onConfirm={handleConfirmStart}
          onCancel={handleCancelBriefing}
          goalProgress={goalsHook.progress}
        />
      )}

      {/* CP-2.4: Save queue modal */}
      <SaveQueueModal
        isOpen={showSaveQueueModal}
        onClose={() => setShowSaveQueueModal(false)}
        onSave={async (name, isShared) => {
          const contactIds = queue.map(item => item.contactId)
          await savedQueuesHook.saveQueue(name, filters, isShared, contactIds)
        }}
        isSaving={savedQueuesHook.isSaving}
        isAdminOrDirector={isAdminOrDirector}
      />

      {/* CP-2.3: Goal config modal */}
      <GoalConfigModal
        isOpen={goalsHook.showGoalModal}
        onClose={() => goalsHook.setShowGoalModal(false)}
        currentTarget={goalsHook.progress.target}
        isAdminOrDirector={goalsHook.isAdminOrDirector}
        teamGoals={goalsHook.teamGoals}
        profiles={profiles}
        currentUserId={profile?.id || ''}
        onSave={goalsHook.updateGoal}
        isSaving={goalsHook.isUpdating}
        retryOutcomes={retryOutcomes}
        onRetryOutcomesChange={setRetryOutcomes}
      />

      {/* CP-3.2: Note templates manager modal */}
      <NoteTemplatesManager
        isOpen={showTemplatesManager}
        onClose={() => setShowTemplatesManager(false)}
      />

      {/* CP-5.4: Metrics drilldown modal */}
      {drilldownCard && (
        <MetricsDrilldownModal
          isOpen={!!drilldownCard}
          onClose={() => setDrilldownCard(null)}
          cardType={drilldownCard}
          activities={metricsHook.activities}
          profiles={profiles}
        />
      )}

      {/* CP-IMP-1: Import list modal */}
      <ImportListModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        currentQueueSize={queue.length}
        onAddBatchToQueue={handleAddBatchToQueue}
      />

      {/* Contact detail modal (from queue item expand) */}
      <ContactDetailModal
        contactId={contactModalId}
        isOpen={!!contactModalId}
        onClose={() => setContactModalId(null)}
      />
    </div>
  )
}

export default ProspectingPage
