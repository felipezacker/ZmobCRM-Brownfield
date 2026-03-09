import React, { useState, useMemo, useCallback } from 'react'
import { Copy, Check, ChevronLeft, ChevronRight, AlertTriangle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/context/ToastContext'
import { parseScriptSections, substituteVariables, cleanUnresolvedVariables, buildContactVariables } from '@/features/prospecting/utils/scriptParser'
import type { ScriptSection } from '@/features/prospecting/utils/scriptParser'
import type { QuickScript } from '@/lib/supabase/quickScripts'
import type { ProspectingQueueItem } from '@/types'

const OBJECTIONS_BY_CATEGORY: Record<string, string[]> = {
  intro: ['Sem interesse', 'Já tem corretor', 'Não é o momento', 'Ligar depois'],
  followup: ['Sem interesse', 'Precisa pensar', 'Ligar depois', 'Precisa falar com cônjuge'],
  closing: ['Preço alto', 'Sem orçamento', 'Precisa pensar', 'Precisa falar com cônjuge'],
  objection: ['Preço alto', 'Já tem corretor', 'Sem orçamento', 'Não é o momento'],
  rescue: ['Sem interesse', 'Não é o momento', 'Ligar depois', 'Já tem corretor'],
  other: ['Sem interesse', 'Não é o momento', 'Precisa pensar', 'Ligar depois'],
}

export const ALL_OBJECTIONS = [
  'Sem interesse',
  'Já tem corretor',
  'Preço alto',
  'Não é o momento',
  'Precisa pensar',
  'Ligar depois',
  'Sem orçamento',
  'Precisa falar com cônjuge',
] as const

interface ProspectingScriptGuideProps {
  script: QuickScript
  contact: ProspectingQueueItem
  onObjectionsChange?: (objections: string[]) => void
  markedObjections?: string[]
}

export const ProspectingScriptGuide: React.FC<ProspectingScriptGuideProps> = ({
  script,
  contact,
  onObjectionsChange,
  markedObjections = [],
}) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const { addToast, showToast } = useToast()
  const toast = addToast || showToast

  const variables = useMemo(() => buildContactVariables(contact), [contact])

  const sections: ScriptSection[] = useMemo(() => {
    const processed = cleanUnresolvedVariables(substituteVariables(script.template, variables))
    return parseScriptSections(processed)
  }, [script.template, variables])

  const objections = useMemo(() => {
    const prioritized = OBJECTIONS_BY_CATEGORY[script.category] || []
    const remaining = ALL_OBJECTIONS.filter(o => !prioritized.includes(o))
    return [...prioritized, ...remaining]
  }, [script.category])

  const currentSection = sections[currentSectionIndex]

  const handleCopySection = useCallback(async (section: ScriptSection) => {
    try {
      await navigator.clipboard.writeText(section.content)
      setCopiedSection(section.id)
      setTimeout(() => setCopiedSection(null), 1500)
    } catch {
      toast('Não foi possível copiar o texto', 'error')
    }
  }, [toast])

  const handleToggleObjection = useCallback((objection: string) => {
    const updated = markedObjections.includes(objection)
      ? markedObjections.filter(o => o !== objection)
      : [...markedObjections, objection]
    onObjectionsChange?.(updated)
  }, [markedObjections, onObjectionsChange])

  const goToPrev = useCallback(() => {
    setCurrentSectionIndex(i => Math.max(0, i - 1))
  }, [])

  const goToNext = useCallback(() => {
    setCurrentSectionIndex(i => Math.min(sections.length - 1, i + 1))
  }, [sections.length])

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <FileText size={32} className="text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground dark:text-muted-foreground">
          Script vazio
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with section tabs */}
      <div className="shrink-0 border-b border-border dark:border-border/50 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {script.title}
          </h3>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {currentSectionIndex + 1}/{sections.length}
          </span>
        </div>

        {/* Section tabs */}
        {sections.length > 1 && (
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {sections.map((section, idx) => (
              <Button
                key={section.id}
                variant="unstyled"
                size="unstyled"
                onClick={() => setCurrentSectionIndex(idx)}
                className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full transition-colors ${
                  idx === currentSectionIndex
                    ? 'bg-primary-500 text-white font-medium'
                    : 'bg-muted dark:bg-card text-muted-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-accent'
                }`}
              >
                {section.title}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Section content */}
      <div className="flex-1 overflow-y-auto p-4">
        {currentSection && (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-medium text-foreground">
                {currentSection.title}
              </h4>
              <Button
                variant="unstyled"
                size="unstyled"
                onClick={() => handleCopySection(currentSection)}
                className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-primary-500 hover:bg-primary-500/10 transition-colors"
                title="Copiar trecho"
              >
                {copiedSection === currentSection.id ? (
                  <Check size={14} className="text-primary-500" />
                ) : (
                  <Copy size={14} />
                )}
              </Button>
            </div>

            <div className="text-sm text-secondary-foreground dark:text-muted-foreground whitespace-pre-wrap leading-relaxed bg-background dark:bg-card/50 rounded-lg p-3">
              {currentSection.content}
            </div>
          </div>
        )}

        {/* Objections section */}
        <div className="mt-4 pt-4 border-t border-border dark:border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-orange-400" />
            <h4 className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
              Objeções Ouvidas
            </h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {objections.map((objection, idx) => {
              const isMarked = markedObjections.includes(objection)
              const isPrioritized = idx < (OBJECTIONS_BY_CATEGORY[script.category]?.length || 0)
              return (
                <Button
                  key={objection}
                  variant="unstyled"
                  size="unstyled"
                  onClick={() => handleToggleObjection(objection)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    isMarked
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                      : isPrioritized
                        ? 'bg-muted dark:bg-card text-secondary-foreground dark:text-muted-foreground border-border dark:border-border hover:border-border dark:hover:border-border'
                        : 'bg-muted dark:bg-card text-muted-foreground dark:text-muted-foreground border-border dark:border-border hover:border-border dark:hover:border-border'
                  }`}
                >
                  {isMarked && <Check size={10} className="inline mr-1" />}
                  {objection}
                </Button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Navigation footer */}
      {sections.length > 1 && (
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-border dark:border-border/50">
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={goToPrev}
            disabled={currentSectionIndex === 0}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} />
            Anterior
          </Button>
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={goToNext}
            disabled={currentSectionIndex === sections.length - 1}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Próximo
            <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  )
}
