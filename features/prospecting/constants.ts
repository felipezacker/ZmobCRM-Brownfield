export const OUTCOME_LABELS: Record<string, { label: string; color: string }> = {
  connected: { label: 'Atendeu', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
  no_answer: { label: 'Não Atendeu', color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
  voicemail: { label: 'Correio de Voz', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
  busy: { label: 'Ocupado', color: 'bg-muted text-secondary-foreground dark:bg-accent/20 dark:text-muted-foreground' },
}

export function getOutcomeBadge(outcome?: string) {
  const info = outcome ? OUTCOME_LABELS[outcome] : null
  const label = info?.label || outcome || 'Desconhecido'
  const color = info?.color || 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400'
  return { label, color }
}

export type DrilldownCardType = 'totalCalls' | 'connected' | 'noAnswer' | 'voicemail' | 'avgDuration' | 'uniqueContacts'

export const DRILLDOWN_TITLES: Record<DrilldownCardType, string> = {
  totalCalls: 'Ligações Discadas',
  connected: 'Atendidas',
  noAnswer: 'Sem Resposta',
  voicemail: 'Correio de Voz',
  avgDuration: 'Tempo Médio — Por Duração',
  uniqueContacts: 'Contatos Prospectados',
}
