'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { PhoneOutgoing, Play, Square, Filter, Users, BarChart3, ListChecks } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/app/components/ui/Button'
import { CallQueue } from './components/CallQueue'
import { PowerDialer } from './components/PowerDialer'
import { SessionSummary } from './components/SessionSummary'
import { AddToQueueSearch } from './components/AddToQueueSearch'
import { ProspectingFilters, INITIAL_FILTERS, type ProspectingFiltersState } from './components/ProspectingFilters'
import { FilteredContactsList } from './components/FilteredContactsList'
import { MetricsCards } from './components/MetricsCards'
import { MetricsChart } from './components/MetricsChart'
import { CorretorRanking } from './components/CorretorRanking'
import { useProspectingQueue } from './hooks/useProspectingQueue'
import { useProspectingFilteredContacts } from './hooks/useProspectingFilteredContacts'
import { useProspectingMetrics, type MetricsPeriod, type PeriodRange } from './hooks/useProspectingMetrics'
import { useAddBatchToProspectingQueue, useQueueContactIds } from '@/lib/query/hooks/useProspectingQueueQuery'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useTags } from '@/hooks/useTags'
import { supabase } from '@/lib/supabase/client'
import type { QuickScript } from '@/lib/supabase/quickScripts'

export type SessionStats = {
  total: number
  completed: number
  skipped: number
  connected: number
  noAnswer: number
  voicemail: number
  busy: number
}

type PageTab = 'queue' | 'metrics'

export const ProspectingPage: React.FC = () => {
  const { profile } = useAuth()
  const { addToast, showToast } = useToast()
  const toast = addToast || showToast

  // isAdminOrDirector comes from metricsHook (single source of truth)
  const { tags: availableTags } = useTags()

  // Org profiles for owner filter + director assignment + metrics ranking
  const { data: profiles = [] } = useQuery({
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

  // CP-1.4: Tab state + metrics
  const [activeTab, setActiveTab] = useState<PageTab>('queue')
  const [metricsPeriod, setMetricsPeriod] = useState<MetricsPeriod>('7d')
  const [customRange, setCustomRange] = useState<PeriodRange | undefined>()
  // CP-1.4: Metrics hook receives profiles to avoid duplicate query (M2 fix)
  // invalidateMetrics is stable via useCallback inside hook (H1 fix)
  const metricsHook = useProspectingMetrics(metricsPeriod, customRange, profiles)
  const { invalidateMetrics, isAdminOrDirector } = metricsHook

  const {
    queue,
    currentIndex,
    sessionActive,
    isLoading,
    startSession,
    endSession,
    next,
    skip,
    markCompleted,
    addToQueue,
    removeFromQueue,
    refetch,
  } = useProspectingQueue()

  // CP-1.3: Filtered contacts
  const filteredContacts = useProspectingFilteredContacts()
  const addBatchMutation = useAddBatchToProspectingQueue()

  // CP-1.3: Filter panel state
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<ProspectingFiltersState>(INITIAL_FILTERS)

  // CP-1.3: Director assignment
  const [assignToOwnerId, setAssignToOwnerId] = useState<string>('')

  // Queue contact IDs to detect duplicates
  const effectiveOwnerId = assignToOwnerId || undefined
  const { data: queueContactIds = [] } = useQueueContactIds(effectiveOwnerId)
  const queueContactIdsSet = useMemo(() => new Set(queueContactIds), [queueContactIds])

  const [showSummary, setShowSummary] = useState(false)
  const [selectedScript, setSelectedScript] = useState<QuickScript | null>(null)
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    total: 0,
    completed: 0,
    skipped: 0,
    connected: 0,
    noAnswer: 0,
    voicemail: 0,
    busy: 0,
  })
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)

  const handleStartSession = useCallback(async () => {
    await startSession()
    setSessionStartTime(new Date())
    setShowSummary(false)
    setSessionStats({
      total: queue.length,
      completed: 0,
      skipped: 0,
      connected: 0,
      noAnswer: 0,
      voicemail: 0,
      busy: 0,
    })
  }, [startSession, queue.length])

  const handleEndSession = useCallback(() => {
    const completed = queue.filter(q => q.status === 'completed').length
    const skipped = queue.filter(q => q.status === 'skipped').length
    setSessionStats(prev => ({
      ...prev,
      total: queue.length,
      completed,
      skipped,
    }))
    endSession()
    setShowSummary(true)
  }, [endSession, queue])

  const handleCallComplete = useCallback((outcome: string) => {
    setSessionStats(prev => ({
      ...prev,
      completed: prev.completed + 1,
      connected: outcome === 'connected' ? prev.connected + 1 : prev.connected,
      noAnswer: outcome === 'no_answer' ? prev.noAnswer + 1 : prev.noAnswer,
      voicemail: outcome === 'voicemail' ? prev.voicemail + 1 : prev.voicemail,
      busy: outcome === 'busy' ? prev.busy + 1 : prev.busy,
    }))
    markCompleted(outcome)
    // CP-1.4: Invalidate metrics after call registered
    invalidateMetrics()
  }, [markCompleted, invalidateMetrics])

  // CP-1.3: Apply filters handler
  const handleApplyFilters = useCallback(() => {
    filteredContacts.applyFilters(filters)
  }, [filteredContacts, filters])

  // CP-1.3: Batch add to queue handler
  const handleAddBatchToQueue = useCallback(async (contactIds: string[]) => {
    try {
      const result = await addBatchMutation.mutateAsync({
        contactIds,
        targetOwnerId: assignToOwnerId || undefined,
      })
      const assigneeName = assignToOwnerId
        ? profiles.find(p => p.id === assignToOwnerId)?.name
        : undefined
      const msg = assigneeName
        ? `${result.added} contato(s) adicionados à fila de ${assigneeName}`
        : `${result.added} contato(s) adicionados à fila`
      if (result.skipped > 0) {
        toast(`${msg} (${result.skipped} já estavam na fila)`, 'success')
      } else {
        toast(msg, 'success')
      }
      refetch()
    } catch {
      toast('Erro ao adicionar contatos à fila', 'error')
    }
  }, [addBatchMutation, assignToOwnerId, profiles, toast, refetch])

  const currentContact = sessionActive && queue[currentIndex] ? queue[currentIndex] : null
  const pendingCount = queue.filter(q => q.status === 'pending').length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 rounded-xl">
            <PhoneOutgoing size={20} className="text-teal-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Prospecção</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {queue.length} contato{queue.length !== 1 ? 's' : ''} na fila
              {sessionActive && ` · ${pendingCount} pendente${pendingCount !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* CP-1.4: Tab toggle (only when not in session) */}
          {!sessionActive && !showSummary && (
            <div className="flex items-center bg-slate-100 dark:bg-white/10 rounded-lg p-0.5 mr-1">
              <button
                onClick={() => setActiveTab('queue')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'queue'
                    ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <ListChecks size={13} />
                Fila
              </button>
              <button
                onClick={() => setActiveTab('metrics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'metrics'
                    ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <BarChart3 size={13} />
                Métricas
              </button>
            </div>
          )}

          {!sessionActive && !showSummary && activeTab === 'queue' && (
            <>
              <Button
                variant="unstyled"
                size="unstyled"
                onClick={() => setShowFilters(prev => !prev)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showFilters
                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-400 dark:hover:bg-white/15'
                }`}
              >
                <Filter size={14} />
                Filtros em Massa
              </Button>
              <Button
                variant="unstyled"
                size="unstyled"
                onClick={handleStartSession}
                disabled={pendingCount === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-teal-500 hover:bg-teal-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {showSummary ? (
          <SessionSummary
            stats={sessionStats}
            startTime={sessionStartTime}
            onClose={() => setShowSummary(false)}
          />
        ) : sessionActive && currentContact ? (
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
          />
        ) : activeTab === 'metrics' ? (
          /* CP-1.4: Metrics view */
          <div className="space-y-4">
            {/* Error state */}
            {metricsHook.error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">
                <span>Erro ao carregar métricas. Tente novamente.</span>
                <button
                  onClick={() => invalidateMetrics()}
                  className="ml-auto px-3 py-1 rounded-lg bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 text-red-700 dark:text-red-300 text-xs font-medium transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            )}
            {/* Truncation warning */}
            {metricsHook.isDataTruncated && (
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                Exibindo as 5.000 ligações mais recentes. Reduza o período para dados completos.
              </div>
            )}
            {/* Period filter */}
            <div className="flex flex-wrap items-center gap-2">
              {([
                { key: 'today', label: 'Hoje' },
                { key: '7d', label: '7 dias' },
                { key: '30d', label: '30 dias' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setMetricsPeriod(key); setCustomRange(undefined) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    metricsPeriod === key && !customRange
                      ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-400 dark:hover:bg-white/15'
                  }`}
                >
                  {label}
                </button>
              ))}
              <div className="flex items-center gap-1.5 ml-1">
                <input
                  type="date"
                  className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-white/5 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
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
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="date"
                  className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-white/5 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
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
                <span className="text-xs text-slate-400 dark:text-slate-500 animate-pulse">Atualizando...</span>
              )}
            </div>

            <MetricsCards metrics={metricsHook.metrics} isLoading={metricsHook.isLoading} />

            <MetricsChart
              data={metricsHook.metrics?.byDay || []}
              isLoading={metricsHook.isLoading}
            />

            {isAdminOrDirector && (
              <CorretorRanking
                brokers={metricsHook.metrics?.byBroker || []}
                isLoading={metricsHook.isLoading}
              />
            )}
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
                      className="bg-white dark:bg-black/20 border border-blue-200 dark:border-blue-500/20 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
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
                {filteredContacts.hasResults && (
                  <FilteredContactsList
                    contacts={filteredContacts.contacts}
                    totalCount={filteredContacts.totalCount}
                    page={filteredContacts.page}
                    totalPages={filteredContacts.totalPages}
                    onPageChange={filteredContacts.goToPage}
                    isLoading={filteredContacts.isLoading}
                    isFetching={filteredContacts.isFetching}
                    existingQueueContactIds={queueContactIdsSet}
                    currentQueueSize={queue.length}
                    onAddToQueue={handleAddBatchToQueue}
                    onSelectAllFiltered={filteredContacts.getAllFilteredIds}
                  />
                )}
              </div>
            )}

            <AddToQueueSearch onAdd={addToQueue} />
            <CallQueue
              items={queue}
              isLoading={isLoading}
              onRemove={removeFromQueue}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default ProspectingPage
