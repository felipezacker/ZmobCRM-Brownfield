/**
 * Orchestration hook for ProspectingPage state management.
 *
 * Extracts 14 useState + useCallback handlers from ProspectingPage
 * into a single composable hook. External feature hooks remain in the
 * component; their results are synced via refs so handlers always
 * read the latest values without triggering re-renders.
 *
 * State managed here: activeTab, metricsPeriod, customRange,
 * metricsFilterOwnerId, showSaveQueueModal, isGeneratingPdf,
 * viewQueueOwnerId, showFilters, filters, assignToOwnerId,
 * showSummary, selectedScript, sessionStats, sessionStartTime
 */

import { useState, useCallback, useMemo, useRef } from 'react'
import { useAddBatchToProspectingQueue, useQueueContactIds } from '@/lib/query/hooks/useProspectingQueueQuery'
import { INITIAL_FILTERS, type ProspectingFiltersState } from '@/features/prospecting/components/ProspectingFilters'
import type { QuickScript } from '@/lib/supabase/quickScripts'
import type { MetricsPeriod, PeriodRange, ProspectingMetrics, CallActivity } from '@/features/prospecting/hooks/useProspectingMetrics'
import type { SavedQueue } from '@/lib/supabase/prospecting-saved-queues'

export type SessionStats = {
  total: number
  completed: number
  skipped: number
  connected: number
  noAnswer: number
  voicemail: number
  busy: number
}

export interface OrgProfile {
  id: string
  name: string
  avatar?: string
  role: string
}

/** Subset of useProspectingQueue return needed by handlers */
export interface QueueDeps {
  queue: { status: string; contactId: string }[]
  startSession: () => Promise<unknown>
  endSession: () => void
  markCompleted: (outcome: string) => void
  clearQueue: () => Promise<unknown>
  refetch: () => void
}

/** Subset of useProspectingMetrics return needed by handlers */
export interface MetricsDeps {
  metrics: ProspectingMetrics | null
  activities: CallActivity[]
  range: PeriodRange
  isAdminOrDirector: boolean
  invalidateMetrics: () => void
}

/** Subset of useProspectingFilteredContacts return needed by handlers */
export interface FilteredContactsDeps {
  applyFilters: (filters: ProspectingFiltersState) => void
}

/** Subset of useSavedQueues return needed by handlers */
export interface SavedQueuesDeps {
  getContactIdsFromSaved: (savedQueue: SavedQueue) => string[]
  getFiltersFromSaved: (savedQueue: SavedQueue) => ProspectingFiltersState
}

export interface PageDeps {
  toast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void
  profiles: OrgProfile[]
  resolvedViewOwnerId: string | undefined
  queueDeps: QueueDeps
  metricsDeps: MetricsDeps
  filteredContacts: FilteredContactsDeps
  savedQueuesDeps: SavedQueuesDeps
}

const INITIAL_SESSION_STATS: SessionStats = {
  total: 0,
  completed: 0,
  skipped: 0,
  connected: 0,
  noAnswer: 0,
  voicemail: 0,
  busy: 0,
}

export function useProspectingPageState() {
  // --- Tab & metrics filter state ---
  const [activeTab, setActiveTab] = useState<'queue' | 'metrics'>('queue')
  const [metricsPeriod, setMetricsPeriod] = useState<MetricsPeriod>('7d')
  const [customRange, setCustomRange] = useState<PeriodRange | undefined>()
  const [metricsFilterOwnerId, setMetricsFilterOwnerId] = useState<string>('')

  // --- Save queue modal ---
  const [showSaveQueueModal, setShowSaveQueueModal] = useState(false)

  // --- PDF export ---
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  // --- Queue owner view ---
  const [viewQueueOwnerId, setViewQueueOwnerId] = useState<string>('')
  const isViewingAll = viewQueueOwnerId === '__all__'

  // --- Filter panel state ---
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<ProspectingFiltersState>(INITIAL_FILTERS)

  // --- Director assignment ---
  const [assignToOwnerId, setAssignToOwnerId] = useState<string>('')

  // --- Queue contact IDs (duplicate detection) ---
  const effectiveOwnerId = assignToOwnerId || undefined
  const { data: queueContactIds = [] } = useQueueContactIds(effectiveOwnerId)
  const queueContactIdsSet = useMemo(() => new Set(queueContactIds), [queueContactIds])

  // --- Session state ---
  const [showSummary, setShowSummary] = useState(false)
  const [selectedScript, setSelectedScript] = useState<QuickScript | null>(null)
  const [sessionStats, setSessionStats] = useState<SessionStats>(INITIAL_SESSION_STATS)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)

  // --- Batch mutation ---
  const addBatchMutation = useAddBatchToProspectingQueue()

  // --- Deps ref (synced by component via setDeps) ---
  const depsRef = useRef<PageDeps | null>(null)

  const setDeps = useCallback((deps: PageDeps) => {
    depsRef.current = deps
  }, [])

  // =====================
  // Handlers (read deps from ref at call-time)
  // =====================

  const handleStartSession = useCallback(async () => {
    const deps = depsRef.current
    if (!deps) return
    await deps.queueDeps.startSession()
    setSessionStartTime(new Date())
    setShowSummary(false)
    setSessionStats({
      total: deps.queueDeps.queue.length,
      completed: 0,
      skipped: 0,
      connected: 0,
      noAnswer: 0,
      voicemail: 0,
      busy: 0,
    })
  }, [])

  const handleEndSession = useCallback(() => {
    const deps = depsRef.current
    if (!deps) return
    const { queue } = deps.queueDeps
    const completed = queue.filter(q => q.status === 'completed').length
    const skipped = queue.filter(q => q.status === 'skipped').length
    setSessionStats(prev => ({
      ...prev,
      total: queue.length,
      completed,
      skipped,
    }))
    deps.queueDeps.endSession()
    setShowSummary(true)
  }, [])

  const handleCallComplete = useCallback((outcome: string) => {
    const deps = depsRef.current
    if (!deps) return
    setSessionStats(prev => ({
      ...prev,
      completed: prev.completed + 1,
      connected: outcome === 'connected' ? prev.connected + 1 : prev.connected,
      noAnswer: outcome === 'no_answer' ? prev.noAnswer + 1 : prev.noAnswer,
      voicemail: outcome === 'voicemail' ? prev.voicemail + 1 : prev.voicemail,
      busy: outcome === 'busy' ? prev.busy + 1 : prev.busy,
    }))
    deps.queueDeps.markCompleted(outcome)
    deps.metricsDeps.invalidateMetrics()
  }, [])

  const handleApplyFilters = useCallback(() => {
    const deps = depsRef.current
    if (!deps) return
    deps.filteredContacts.applyFilters(filters)
  }, [filters])

  const handleAddBatchToQueue = useCallback(async (contactIds: string[]) => {
    const deps = depsRef.current
    if (!deps) return
    try {
      const result = await addBatchMutation.mutateAsync({
        contactIds,
        targetOwnerId: assignToOwnerId || undefined,
      })
      const assigneeName = assignToOwnerId
        ? deps.profiles.find(p => p.id === assignToOwnerId)?.name
        : undefined
      const msg = assigneeName
        ? `${result.added} contato(s) adicionados \u00e0 fila de ${assigneeName}`
        : `${result.added} contato(s) adicionados \u00e0 fila`
      if (result.skipped > 0) {
        deps.toast(`${msg} (${result.skipped} j\u00e1 estavam na fila)`, 'success')
      } else {
        deps.toast(msg, 'success')
      }
      deps.queueDeps.refetch()
    } catch {
      deps.toast('Erro ao adicionar contatos \u00e0 fila', 'error')
    }
  }, [addBatchMutation, assignToOwnerId])

  const handleLoadSavedQueue = useCallback(async (savedQueue: SavedQueue) => {
    const deps = depsRef.current
    if (!deps) return
    const contactIds = deps.savedQueuesDeps.getContactIdsFromSaved(savedQueue)

    if (contactIds.length > 0) {
      const targetOwner = deps.resolvedViewOwnerId === '__all__' ? undefined : deps.resolvedViewOwnerId
      try {
        await deps.queueDeps.clearQueue()
        const result = await addBatchMutation.mutateAsync({
          contactIds,
          targetOwnerId: targetOwner,
        })
        const filtered = contactIds.length - result.added - result.skipped
        deps.queueDeps.refetch()
        if (filtered > 0) {
          deps.toast(`Fila "${savedQueue.name}" carregada (${result.added} contatos, ${filtered} removidos desde o save)`, 'success')
        } else {
          deps.toast(`Fila "${savedQueue.name}" carregada (${result.added} contatos)`, 'success')
        }
      } catch {
        deps.queueDeps.refetch()
        deps.toast('Erro ao restaurar contatos da fila salva', 'error')
      }
    } else {
      const restored = deps.savedQueuesDeps.getFiltersFromSaved(savedQueue)
      setFilters(restored)
      setShowFilters(true)
      deps.filteredContacts.applyFilters(restored)
      deps.toast(`Fila "${savedQueue.name}" carregada (filtros)`, 'success')
    }
  }, [addBatchMutation])

  const handleExportPdf = useCallback(async () => {
    const deps = depsRef.current
    if (!deps) return
    setIsGeneratingPdf(true)
    try {
      const { generateMetricsPDF } = await import('@/features/prospecting/utils/generateMetricsPDF')
      await generateMetricsPDF({
        metrics: deps.metricsDeps.metrics,
        activities: deps.metricsDeps.activities,
        brokers: deps.metricsDeps.metrics?.byBroker || [],
        range: deps.metricsDeps.range,
        isAdminOrDirector: deps.metricsDeps.isAdminOrDirector,
        organizationName: 'ZmobCRM',
      })
      deps.toast('PDF exportado com sucesso', 'success')
    } catch {
      deps.toast('Erro ao gerar PDF', 'error')
    } finally {
      setIsGeneratingPdf(false)
    }
  }, [])

  return {
    // Deps sync
    setDeps,

    // Tab state
    activeTab,
    setActiveTab,

    // Metrics filters
    metricsPeriod,
    setMetricsPeriod,
    customRange,
    setCustomRange,
    metricsFilterOwnerId,
    setMetricsFilterOwnerId,

    // Save queue modal
    showSaveQueueModal,
    setShowSaveQueueModal,

    // PDF
    isGeneratingPdf,

    // Queue owner view
    viewQueueOwnerId,
    setViewQueueOwnerId,
    isViewingAll,

    // Filters
    showFilters,
    setShowFilters,
    filters,
    setFilters,

    // Director assignment
    assignToOwnerId,
    setAssignToOwnerId,

    // Queue contact IDs
    queueContactIdsSet,
    effectiveOwnerId,

    // Session
    showSummary,
    setShowSummary,
    selectedScript,
    setSelectedScript,
    sessionStats,
    sessionStartTime,

    // Handlers
    handleStartSession,
    handleEndSession,
    handleCallComplete,
    handleApplyFilters,
    handleAddBatchToQueue,
    handleLoadSavedQueue,
    handleExportPdf,
  }
}
