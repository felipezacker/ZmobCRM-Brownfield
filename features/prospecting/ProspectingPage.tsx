'use client'

import React, { useState, useCallback } from 'react'
import { PhoneOutgoing, Play, Square } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { CallQueue } from './components/CallQueue'
import { PowerDialer } from './components/PowerDialer'
import { SessionSummary } from './components/SessionSummary'
import { AddToQueueSearch } from './components/AddToQueueSearch'
import { useProspectingQueue } from './hooks/useProspectingQueue'

export type SessionStats = {
  total: number
  completed: number
  skipped: number
  connected: number
  noAnswer: number
}

export const ProspectingPage: React.FC = () => {
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

  const [showSummary, setShowSummary] = useState(false)
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    total: 0,
    completed: 0,
    skipped: 0,
    connected: 0,
    noAnswer: 0,
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
    }))
    markCompleted(outcome)
  }, [markCompleted])

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
          />
        ) : (
          <div className="space-y-4">
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
