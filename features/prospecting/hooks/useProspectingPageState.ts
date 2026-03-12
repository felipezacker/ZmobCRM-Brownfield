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

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useAddBatchToProspectingQueue, useQueueContactIds } from '@/lib/query/hooks/useProspectingQueueQuery'
import { INITIAL_FILTERS, migrateFilters, type ProspectingFiltersState } from '@/features/prospecting/components/ProspectingFilters'
import type { QuickScript } from '@/lib/supabase/quickScripts'
import type { MetricsPeriod, PeriodRange, ProspectingMetrics, CallActivity } from '@/features/prospecting/hooks/useProspectingMetrics'
import type { SavedQueue } from '@/lib/supabase/prospecting-saved-queues'
import {
  startProspectingSession,
  endProspectingSession,
  updateSessionProgress,
  getActiveSessions,
  type ProspectingSessionStats,
  type ProspectingSession,
} from '@/lib/supabase/prospecting-sessions'

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
  jumpToIndex: (index: number) => void
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

export interface PendingActiveSession {
  id: string
  startedAt: string
  stats?: ProspectingSessionStats | Record<string, never>
}

/** Validates that DB stats are usable (not legacy empty object, not inconsistent) */
function isValidSessionStats(stats: unknown): stats is ProspectingSessionStats {
  if (typeof stats !== 'object' || stats === null) return false
  const s = stats as ProspectingSessionStats
  return (
    typeof s.total === 'number' &&
    typeof s.completed === 'number' &&
    s.completed <= s.total
  )
}

const FILTERS_STORAGE_KEY = 'prospecting_filters'

export function useProspectingPageState(userId?: string, organizationId?: string) {
  // --- Session persistence (CP-3.4) ---
  const [dbSessionId, setDbSessionId] = useState<string | null>(null)
  const [pendingActiveSession, setPendingActiveSession] = useState<PendingActiveSession | null>(null)
  const [allActiveSessions, setAllActiveSessions] = useState<ProspectingSession[]>([])

  // Check for active sessions on mount (AC3)
  const hasCheckedActive = useRef(false)
  useEffect(() => {
    if (!userId || hasCheckedActive.current) return
    hasCheckedActive.current = true
    getActiveSessions(userId).then(sessions => {
      if (sessions.length > 0) {
        setAllActiveSessions(sessions)
        setPendingActiveSession({
          id: sessions[0].id,
          startedAt: sessions[0].startedAt,
          stats: sessions[0].stats,
        })
      }
    }).catch(() => {})
  }, [userId])

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
  const [filters, setFilters] = useState<ProspectingFiltersState>(() => {
    try {
      if (typeof window === 'undefined') return INITIAL_FILTERS
      const stored = localStorage.getItem(FILTERS_STORAGE_KEY)
      if (!stored) return INITIAL_FILTERS
      // Migrate old format (source→sources, ownerId removed, dealOwnerId→dealOwnerIds)
      return migrateFilters(JSON.parse(stored))
    } catch {
      return INITIAL_FILTERS
    }
  })

  // --- Persist filters to localStorage ---
  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
    } catch {
      // Ignore storage errors (e.g. private browsing)
    }
  }, [filters])

  // --- Director assignment ---
  const [assignToOwnerId, setAssignToOwnerId] = useState<string>('')

  // --- Queue contact IDs (duplicate detection) ---
  const effectiveOwnerId = assignToOwnerId || undefined
  const { data: queueContactIds = [] } = useQueueContactIds(effectiveOwnerId)
  const queueContactIdsSet = useMemo(() => new Set(queueContactIds), [queueContactIds])

  // --- Briefing state (CP-4.1) ---
  const [showBriefing, setShowBriefing] = useState(false)

  // --- Session state ---
  const [showSummary, setShowSummary] = useState(false)
  const [selectedScript, setSelectedScript] = useState<QuickScript | null>(null)
  const [sessionStats, setSessionStats] = useState<SessionStats>(INITIAL_SESSION_STATS)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)

  // --- Debounced session progress flush (stats + currentIndex) ---
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionStatsRef = useRef<SessionStats>(INITIAL_SESSION_STATS)
  const currentIndexRef = useRef<number>(0)
  const dbSessionIdRef = useRef<string | null>(null)

  // Keep refs in sync with state
  useEffect(() => { sessionStatsRef.current = sessionStats }, [sessionStats])
  useEffect(() => { dbSessionIdRef.current = dbSessionId }, [dbSessionId])

  /** Expose a setter so the queue hook can push currentIndex updates */
  const syncCurrentIndex = useCallback((index: number) => {
    currentIndexRef.current = index
  }, [])

  const flushProgress = useCallback(() => {
    const sid = dbSessionIdRef.current
    if (!sid) return
    const stats = sessionStatsRef.current
    const durationSeconds = sessionStartTime
      ? Math.floor((Date.now() - sessionStartTime.getTime()) / 1000)
      : 0
    updateSessionProgress(sid, {
      ...stats,
      duration_seconds: durationSeconds,
      current_index: currentIndexRef.current,
    }).catch(() => {})
  }, [sessionStartTime])

  const scheduleFlush = useCallback(() => {
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current)
    progressTimerRef.current = setTimeout(flushProgress, 2000)
  }, [flushProgress])

  // --- beforeunload: warn + flush on page close ---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dbSessionIdRef.current) return
      // Flush stats synchronously via sendBeacon
      const sid = dbSessionIdRef.current
      const stats = sessionStatsRef.current
      const durationSeconds = sessionStartTime
        ? Math.floor((Date.now() - sessionStartTime.getTime()) / 1000)
        : 0
      const payload = JSON.stringify({
        session_id: sid,
        stats: {
          ...stats,
          duration_seconds: durationSeconds,
          current_index: currentIndexRef.current,
        },
      })
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon?.('/api/prospecting-session-progress', blob)
      // Show browser warning
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [sessionStartTime])

  // --- Batch mutation ---
  const addBatchMutation = useAddBatchToProspectingQueue()
  const [batchAddCount, setBatchAddCount] = useState(0)

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
    // CP-3.4: Persist session to DB
    if (userId && organizationId) {
      startProspectingSession(userId, organizationId)
        .then(id => setDbSessionId(id))
        .catch(() => {
          const d = depsRef.current
          d?.toast('Erro ao salvar sessao no banco — sessao continua localmente', 'warning')
        })
    }
  }, [userId, organizationId])

  const handleEndSession = useCallback(() => {
    const deps = depsRef.current
    if (!deps) return
    // Clear pending debounce timer to avoid stale flush after session ends
    if (progressTimerRef.current) { clearTimeout(progressTimerRef.current); progressTimerRef.current = null }
    const { queue } = deps.queueDeps
    const completed = queue.filter(q => q.status === 'completed').length
    const skipped = queue.filter(q => q.status === 'skipped').length
    setSessionStats(prev => {
      const finalStats = {
        ...prev,
        total: queue.length,
        completed,
        skipped,
      }
      // CP-3.4: Persist session stats to DB
      if (dbSessionId) {
        const durationSeconds = sessionStartTime
          ? Math.floor((Date.now() - sessionStartTime.getTime()) / 1000)
          : 0
        endProspectingSession(dbSessionId, {
          ...finalStats,
          duration_seconds: durationSeconds,
        }).catch(() => {
          const d = depsRef.current
          d?.toast('Erro ao salvar stats da sessao — dados podem nao ter sido salvos', 'warning')
        })
        setDbSessionId(null)
      }
      return finalStats
    })
    deps.queueDeps.endSession()
    setShowSummary(true)
  }, [dbSessionId, sessionStartTime])

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
    // Flush stats + position to DB (debounced 2s)
    scheduleFlush()
  }, [scheduleFlush])

  const handleApplyFilters = useCallback(() => {
    const deps = depsRef.current
    if (!deps) return
    deps.filteredContacts.applyFilters(filters)
  }, [filters])

  const handleAddBatchToQueue = useCallback(async (contactIds: string[]) => {
    const deps = depsRef.current
    if (!deps) return
    setBatchAddCount(contactIds.length)
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
    } finally {
      setBatchAddCount(0)
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

  // CP-3.4 + CP-4.8: Resume the most recent active session, end all others
  const handleResumeSession = useCallback(async () => {
    if (!pendingActiveSession) return
    const deps = depsRef.current
    if (!deps) return
    // CP-4.8: End all other active sessions with zero stats
    const othersToEnd = allActiveSessions.filter(s => s.id !== pendingActiveSession.id)
    if (othersToEnd.length > 0) {
      const zeroStats: ProspectingSessionStats = {
        total: 0, completed: 0, skipped: 0, connected: 0,
        noAnswer: 0, voicemail: 0, busy: 0, duration_seconds: 0,
      }
      const results = await Promise.allSettled(
        othersToEnd.map(s => endProspectingSession(s.id, zeroStats))
      )
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) {
        deps.toast(`${failed} sessao(oes) nao puderam ser encerradas`, 'warning')
      }
    }
    setDbSessionId(pendingActiveSession.id)
    setSessionStartTime(new Date(pendingActiveSession.startedAt))
    setPendingActiveSession(null)
    setAllActiveSessions([])
    await deps.queueDeps.startSession()
    // CP-4.9: Load stats from DB if valid, otherwise fallback to zeros
    const dbStats = pendingActiveSession.stats as (ProspectingSessionStats & { current_index?: number }) | Record<string, never>
    if (isValidSessionStats(dbStats)) {
      setSessionStats({
        total: dbStats.total,
        completed: dbStats.completed,
        skipped: dbStats.skipped ?? 0,
        connected: dbStats.connected ?? 0,
        noAnswer: dbStats.noAnswer ?? 0,
        voicemail: dbStats.voicemail ?? 0,
        busy: dbStats.busy ?? 0,
      })
      // Restore queue position from DB (ref + queue hook state)
      if (typeof dbStats.current_index === 'number' && dbStats.current_index >= 0) {
        currentIndexRef.current = dbStats.current_index
        deps.queueDeps.jumpToIndex(dbStats.current_index)
      }
    } else {
      // Legacy session or empty stats — start from zero
      setSessionStats({
        total: deps.queueDeps.queue.length,
        completed: 0,
        skipped: 0,
        connected: 0,
        noAnswer: 0,
        voicemail: 0,
        busy: 0,
      })
    }
  }, [pendingActiveSession, allActiveSessions])

  // CP-3.4: Dismiss (end) abandoned session (single)
  const handleDismissActiveSession = useCallback(async () => {
    if (!pendingActiveSession) return
    endProspectingSession(pendingActiveSession.id, {
      total: 0, completed: 0, skipped: 0, connected: 0,
      noAnswer: 0, voicemail: 0, busy: 0, duration_seconds: 0,
    }).catch(() => {})
    setPendingActiveSession(null)
    setAllActiveSessions([])
  }, [pendingActiveSession])

  // CP-4.8: Dismiss (end) ALL active sessions at once
  const handleDismissAllSessions = useCallback(async () => {
    if (allActiveSessions.length === 0) return
    const zeroStats: ProspectingSessionStats = {
      total: 0, completed: 0, skipped: 0, connected: 0,
      noAnswer: 0, voicemail: 0, busy: 0, duration_seconds: 0,
    }
    const results = await Promise.allSettled(
      allActiveSessions.map(s => endProspectingSession(s.id, zeroStats))
    )
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed > 0) {
      const deps = depsRef.current
      deps?.toast(`${failed} sessao(oes) nao puderam ser encerradas`, 'warning')
    }
    setPendingActiveSession(null)
    setAllActiveSessions([])
  }, [allActiveSessions])

  // CP-3.4: Ignore active session banner (don't end in DB)
  const handleIgnoreActiveSession = useCallback(() => {
    setPendingActiveSession(null)
    setAllActiveSessions([])
  }, [])

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

  // CP-4.1: Confirm start — executes original handleStartSession and closes briefing
  const handleConfirmStart = useCallback(async () => {
    setShowBriefing(false)
    await handleStartSession()
  }, [handleStartSession])

  // CP-4.1: Cancel briefing — closes without starting session
  const handleCancelBriefing = useCallback(() => {
    setShowBriefing(false)
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

    // CP-4.1: Briefing
    showBriefing,
    setShowBriefing,
    handleConfirmStart,
    handleCancelBriefing,

    // Session
    showSummary,
    setShowSummary,
    selectedScript,
    setSelectedScript,
    sessionStats,
    sessionStartTime,

    // CP-3.4 + CP-4.8: Session persistence
    pendingActiveSession,
    allActiveSessions,
    activeSessionCount: allActiveSessions.length,
    handleResumeSession,
    handleDismissActiveSession,
    handleDismissAllSessions,
    handleIgnoreActiveSession,

    // Session progress sync
    syncCurrentIndex,
    currentIndexRef,
    scheduleFlush,

    // Batch progress
    isBatchAdding: addBatchMutation.isPending,
    batchAddCount,

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
