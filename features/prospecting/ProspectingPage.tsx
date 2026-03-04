'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { PhoneOutgoing, Play, Square, Filter, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/app/components/ui/Button'
import { CallQueue } from './components/CallQueue'
import { PowerDialer } from './components/PowerDialer'
import { SessionSummary } from './components/SessionSummary'
import { AddToQueueSearch } from './components/AddToQueueSearch'
import { ScriptSelector } from './components/ScriptSelector'
import { ProspectingFilters, INITIAL_FILTERS, type ProspectingFiltersState } from './components/ProspectingFilters'
import { FilteredContactsList } from './components/FilteredContactsList'
import { useProspectingQueue } from './hooks/useProspectingQueue'
import { useProspectingFilteredContacts } from './hooks/useProspectingFilteredContacts'
import { useAddBatchToProspectingQueue, useQueueContactIds } from '@/lib/query/hooks/useProspectingQueueQuery'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
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

export const ProspectingPage: React.FC = () => {
  const { profile } = useAuth()
  const { addToast, showToast } = useToast()
  const toast = addToast || showToast

  const isAdminOrDirector = profile?.role === 'admin' || profile?.role === 'diretor'

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

  // Org profiles for owner filter + director assignment
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
        name: (p as any).name || (p as any).first_name || 'Sem nome',
        avatar: (p as any).avatar_url || undefined,
        role: (p as any).role as string,
      }))
    },
    staleTime: 5 * 60 * 1000,
  })

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
  }, [markCompleted])

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
          {!sessionActive && !showSummary && (
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
          />
        ) : (
          <div className="space-y-4">
            <ScriptSelector
              selectedScript={selectedScript}
              onSelect={setSelectedScript}
            />

            {/* CP-1.3: Mass filter panel */}
            {showFilters && (
              <div className="space-y-4">
                <ProspectingFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  profiles={profiles}
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
