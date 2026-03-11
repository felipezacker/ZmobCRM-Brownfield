'use client'

import React, { useMemo, useState } from 'react'
import { PhoneOutgoing, Play, Square, Filter, Users, BarChart3, ListChecks, RotateCcw, BookmarkPlus, FileDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { CallQueue } from './components/CallQueue'
import { PowerDialer } from './components/PowerDialer'
import { SessionSummary } from './components/SessionSummary'
import { AddToQueueSearch } from './components/AddToQueueSearch'
import { ProspectingFilters } from './components/ProspectingFilters'
import { FilteredContactsList } from './components/FilteredContactsList'
import { MetricsCards } from './components/MetricsCards'
import { MetricsChart } from './components/MetricsChart'
import { ConversionFunnel } from './components/ConversionFunnel'
import { AutoInsights } from './components/AutoInsights'
import { CallDetailsTable } from './components/CallDetailsTable'
import { CorretorRanking } from './components/CorretorRanking'
import { DailyGoalCard } from './components/DailyGoalCard'
import { ConnectionHeatmap } from './components/ConnectionHeatmap'
import { NeglectedContactsAlert } from './components/NeglectedContactsAlert'
import { PerformanceComparison } from './components/PerformanceComparison'
import { TopObjections } from './components/TopObjections'
import { ProspectingErrorBoundary } from './components/ProspectingErrorBoundary'
import { GoalConfigModal } from './components/GoalConfigModal'
import { NoteTemplatesManager } from './components/NoteTemplatesManager'
import { SaveQueueModal } from './components/SaveQueueModal'
import { SavedQueuesList } from './components/SavedQueuesList'
import { useProspectingGoals } from './hooks/useProspectingGoals'
import { useSavedQueues } from './hooks/useSavedQueues'
import { useProspectingQueue } from './hooks/useProspectingQueue'
import { useProspectingFilteredContacts } from './hooks/useProspectingFilteredContacts'
import { useProspectingMetrics } from './hooks/useProspectingMetrics'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useTags } from '@/hooks/useTags'
import { supabase } from '@/lib/supabase/client'
import { SessionBriefing } from './components/SessionBriefing'
import { SessionHistory } from './components/SessionHistory'
import { listSessions, type ProspectingSession } from '@/lib/supabase/prospecting-sessions'
import { suggestBestTime } from './utils/suggestBestTime'
import { useProspectingPageState, type OrgProfile } from '@/features/prospecting/hooks/useProspectingPageState'
import { PROSPECTING_CONFIG } from '@/features/prospecting/prospecting-config'

export type { SessionStats } from '@/features/prospecting/hooks/useProspectingPageState'

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

  // --- Page state hook (all useState + handlers) ---
  const pageState = useProspectingPageState(profile?.id, profile?.organization_id)

  const {
    setDeps,
    activeTab, setActiveTab,
    metricsPeriod, setMetricsPeriod,
    customRange, setCustomRange,
    metricsFilterOwnerId, setMetricsFilterOwnerId,
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
    handleResumeSession,
    handleDismissActiveSession,
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

  // --- External feature hooks (use state values from pageState) ---

  // CP-1.4: Metrics
  const metricsHook = useProspectingMetrics(metricsPeriod, customRange, profiles, metricsFilterOwnerId || undefined)
  const { invalidateMetrics, isAdminOrDirector } = metricsHook

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

  const queueHook = useProspectingQueue({ viewOwnerId: resolvedViewOwnerId })

  const {
    queue,
    exhaustedItems,
    currentIndex,
    sessionActive,
    isLoading,
    isClearingQueue,
    removingId,
    retryInterval,
    setRetryInterval,
    retryOutcomes,
    setRetryOutcomes,
    skip,
    addToQueue,
    removeFromQueue,
    clearQueue,
    resetExhaustedItem,
  } = queueHook

  // CP-1.3: Filtered contacts
  const filteredContactsHook = useProspectingFilteredContacts()

  // --- Sync deps to pageState ref (runs every render, no-op cost) ---
  setDeps({
    toast,
    profiles,
    resolvedViewOwnerId,
    queueDeps: queueHook,
    metricsDeps: metricsHook,
    filteredContacts: filteredContactsHook,
    savedQueuesDeps: savedQueuesHook,
  })

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
                {/* CP-2.1: Retry interval selector */}
                <div className="flex items-center gap-1.5">
                  <RotateCcw size={13} className="text-muted-foreground dark:text-muted-foreground" />
                  <select
                    value={retryInterval}
                    onChange={(e) => setRetryInterval(Number(e.target.value))}
                    className="bg-muted dark:bg-white/10 border-0 rounded-lg px-2 py-1.5 text-xs font-medium text-secondary-foreground dark:text-muted-foreground outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                  >
                    <option value={3}>Retry: 3 dias</option>
                    <option value={5}>Retry: 5 dias</option>
                    <option value={7}>Retry: 7 dias</option>
                  </select>
                </div>

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

        {/* Team queue selector — horizontal pills */}
        {isAdminOrDirector && !sessionActive && !showSummary && activeTab === 'queue' && (
          <div className="flex items-center gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => setViewQueueOwnerId('')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                !viewQueueOwnerId
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-muted dark:bg-white/10 text-secondary-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-white/15'
              }`}
            >
              Minha fila
            </Button>
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => setViewQueueOwnerId('__all__')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                isViewingAll
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-muted dark:bg-white/10 text-secondary-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-white/15'
              }`}
            >
              <Users size={12} />
              Todos
            </Button>
            <div className="w-px h-4 bg-accent dark:bg-accent shrink-0 mx-0.5" />
            {profiles.map(p => (
              <Button
                key={p.id}
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={() => setViewQueueOwnerId(p.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                  viewQueueOwnerId === p.id
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-muted dark:bg-white/10 text-secondary-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-white/15'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                  viewQueueOwnerId === p.id
                    ? 'bg-white/20 text-white'
                    : 'bg-accent dark:bg-accent text-muted-foreground dark:text-muted-foreground'
                }`}>
                  {p.name.charAt(0).toUpperCase()}
                </span>
                {p.name.split(' ')[0]}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* CP-3.4: Active session resume prompt (AC3) */}
        {pendingActiveSession && !sessionActive && !showSummary && (
          <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
            <PhoneOutgoing size={16} className="text-amber-600 shrink-0" />
            <span className="text-sm text-amber-700 dark:text-amber-300 flex-1">
              Sessao ativa encontrada (iniciada em {new Date(pendingActiveSession.startedAt).toLocaleString('pt-BR')}). Deseja retomar?
            </span>
            <Button
              variant="unstyled"
              size="unstyled"
              onClick={handleResumeSession}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors"
            >
              Retomar
            </Button>
            <Button
              variant="unstyled"
              size="unstyled"
              onClick={handleDismissActiveSession}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-accent text-secondary-foreground dark:bg-white/10 dark:text-muted-foreground dark:hover:bg-white/15 transition-colors"
            >
              Encerrar
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

            {/* CP-2.4: PDF export button */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-secondary-foreground dark:text-muted-foreground">Dashboard de Métricas</span>
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

            {/* Filters: period + broker */}
            <div className="flex flex-wrap items-center gap-2">
              {([
                { key: 'today', label: 'Hoje' },
                { key: '7d', label: '7 dias' },
                { key: '30d', label: '30 dias' },
              ] as const).map(({ key, label }) => (
                <Button
                  variant="unstyled"
                  size="unstyled"
                  key={key}
                  onClick={() => { setMetricsPeriod(key); setCustomRange(undefined) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    metricsPeriod === key && !customRange
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300'
                      : 'bg-muted text-secondary-foreground hover:bg-accent dark:bg-white/10 dark:text-muted-foreground dark:hover:bg-white/15'
                  }`}
                >
                  {label}
                </Button>
              ))}
              <div className="flex items-center gap-1.5 ml-1">
                <input
                  type="date"
                  className="px-2 py-1 text-xs border border-border dark:border-border rounded-lg bg-white dark:bg-white/5 outline-none focus:ring-2 focus:ring-primary-500"
                  onChange={(e) => {
                    if (e.target.value) {
                      const newStart = e.target.value
                      setCustomRange(prev => {
                        const next = { start: newStart, end: prev?.end || '' }
                        if (next.start && next.end) setMetricsPeriod('custom')
                        return next
                      })
                    }
                  }}
                  value={customRange?.start || ''}
                />
                <span className="text-muted-foreground text-xs">-</span>
                <input
                  type="date"
                  className="px-2 py-1 text-xs border border-border dark:border-border rounded-lg bg-white dark:bg-white/5 outline-none focus:ring-2 focus:ring-primary-500"
                  onChange={(e) => {
                    if (e.target.value) {
                      const newEnd = e.target.value
                      setCustomRange(prev => {
                        const next = { start: prev?.start || '', end: newEnd }
                        if (next.start && next.end) setMetricsPeriod('custom')
                        return next
                      })
                    }
                  }}
                  value={customRange?.end || ''}
                />
              </div>
              {metricsHook.isFetching && !metricsHook.isLoading && (
                <span className="text-xs text-muted-foreground dark:text-muted-foreground animate-pulse">Atualizando...</span>
              )}
            </div>

            {/* Broker filter pills */}
            {isAdminOrDirector && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                <Button
                  variant="unstyled"
                  size="unstyled"
                  type="button"
                  onClick={() => setMetricsFilterOwnerId('')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                    !metricsFilterOwnerId
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-muted dark:bg-white/10 text-secondary-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-white/15'
                  }`}
                >
                  <Users size={12} />
                  Todos
                </Button>
                {profiles.map(p => (
                  <Button
                    key={p.id}
                    variant="unstyled"
                    size="unstyled"
                    type="button"
                    onClick={() => setMetricsFilterOwnerId(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                      metricsFilterOwnerId === p.id
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'bg-muted dark:bg-white/10 text-secondary-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-white/15'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                      metricsFilterOwnerId === p.id
                        ? 'bg-white/20 text-white'
                        : 'bg-accent dark:bg-accent text-muted-foreground dark:text-muted-foreground'
                    }`}>
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    {p.name.split(' ')[0]}
                  </Button>
                ))}
              </div>
            )}

            {/* CP-2.3: Daily goal card */}
            <DailyGoalCard
              progress={goalsHook.progress}
              isLoading={goalsHook.isLoading}
              isAdminOrDirector={goalsHook.isAdminOrDirector}
              onConfigureClick={() => goalsHook.setShowGoalModal(true)}
            />

            {/* CP-3.6: PerformanceComparison — corretores only, below DailyGoalCard */}
            <PerformanceComparison
              userMetrics={userMetrics}
              teamAverage={teamAverage}
              isAdminOrDirector={isAdminOrDirector}
              periodDays={periodDays}
            />

            {/* CP-3.6: NeglectedContactsAlert — above MetricsCards */}
            <NeglectedContactsAlert
              onAddAllToQueue={handleAddBatchToQueue}
              onError={() => toast('Erro ao buscar contatos negligenciados', 'error')}
            />

            <ProspectingErrorBoundary section="Métricas">
              <MetricsCards metrics={metricsHook.metrics} isLoading={metricsHook.isLoading} />

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

            {/* CP-2.3: Connection heatmap */}
            <ProspectingErrorBoundary section="Heatmap">
              <ConnectionHeatmap
                activities={metricsHook.activities}
                isLoading={metricsHook.isLoading}
              />
            </ProspectingErrorBoundary>

            <AutoInsights metrics={metricsHook.metrics} isLoading={metricsHook.isLoading} />

            {/* CP-3.6: Top objections widget */}
            <TopObjections activities={metricsHook.activities} isLoading={metricsHook.isLoading} />

            {/* CP-3.4: Session history */}
            <ProspectingErrorBoundary section="Historico de Sessoes">
              <SessionHistory
                sessions={sessionHistory}
                isLoading={isLoadingSessions}
              />
            </ProspectingErrorBoundary>

            {isAdminOrDirector && !metricsFilterOwnerId && (
              <CorretorRanking
                brokers={metricsHook.metrics?.byBroker || []}
                isLoading={metricsHook.isLoading}
              />
            )}

            <CallDetailsTable
              activities={metricsHook.activities}
              profiles={profiles}
              isLoading={metricsHook.isLoading}
            />
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
                  availableTags={availableTags}
                  showOwnerFilter={isAdminOrDirector}
                  onApply={handleApplyFilters}
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
    </div>
  )
}

export default ProspectingPage
