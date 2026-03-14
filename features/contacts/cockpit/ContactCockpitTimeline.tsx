'use client';

import React, { useMemo, useState } from 'react';
import {
  FileText,
  Phone,
  Mail,
  Calendar,
  ArrowRight,
  Search,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  MessageCircle,
} from 'lucide-react';
import { Chip } from '@/features/deals/cockpit/cockpit-ui';
import { formatAtISO, uid } from '@/features/deals/cockpit/cockpit-utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import type { Activity, Deal } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimelineEntry {
  id: string;
  type: Activity['type'] | 'SCORE_CHANGE';
  title: string;
  description?: string;
  date: string;
  dealTitle: string;
  dealId: string;
  scoreChange?: number;
  metadata?: Record<string, unknown>;
}

interface ContactCockpitTimelineProps {
  activities: TimelineEntry[];
  contactId: string;
  contactName: string;
  /** first linked deal id (for quick-note fallback) */
  firstDealId: string | null;
  firstDealTitle: string | null;
  onNoteCreated: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OUTCOME_BADGES: Record<string, { label: string; className: string }> = {
  connected: { label: 'Atendeu', className: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' },
  no_answer: { label: 'Não atendeu', className: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
  voicemail: { label: 'Caixa postal', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' },
  busy: { label: 'Ocupado', className: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' },
};

type ActivityFilter = 'all' | 'CALL' | 'NOTE' | 'EMAIL' | 'MEETING' | 'TASK' | 'WHATSAPP';

const FILTER_OPTIONS: { value: ActivityFilter; label: string }[] = [
  { value: 'all', label: 'Tudo' },
  { value: 'CALL', label: 'Ligações' },
  { value: 'NOTE', label: 'Notas' },
  { value: 'EMAIL', label: 'Emails' },
  { value: 'MEETING', label: 'Reuniões' },
  { value: 'TASK', label: 'Tarefas' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
];

// ---------------------------------------------------------------------------
// Icon helper
// ---------------------------------------------------------------------------

function typeIcon(type: string, scoreChange?: number) {
  switch (type) {
    case 'NOTE':
      return <FileText className="h-3.5 w-3.5 text-cyan-400" />;
    case 'CALL':
      return <Phone className="h-3.5 w-3.5 text-green-400" />;
    case 'EMAIL':
      return <Mail className="h-3.5 w-3.5 text-amber-400" />;
    case 'MEETING':
      return <Calendar className="h-3.5 w-3.5 text-violet-400" />;
    case 'STATUS_CHANGE':
      return <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />;
    case 'TASK':
      return <ClipboardList className="h-3.5 w-3.5 text-blue-400" />;
    case 'WHATSAPP':
      return <MessageCircle className="h-3.5 w-3.5 text-green-400" />;
    case 'SCORE_CHANGE':
      return (scoreChange ?? 0) > 0
        ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
        : <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
    default:
      return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function typeLabel(type: string) {
  switch (type) {
    case 'NOTE': return 'Nota';
    case 'CALL': return 'Ligação';
    case 'EMAIL': return 'Email';
    case 'MEETING': return 'Reunião';
    case 'STATUS_CHANGE': return 'Mudança';
    case 'TASK': return 'Tarefa';
    case 'WHATSAPP': return 'WhatsApp';
    case 'SCORE_CHANGE': return 'Score';
    default: return type;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContactCockpitTimeline({
  activities,
  contactId,
  contactName,
  firstDealId,
  firstDealTitle,
  onNoteCreated,
}: ContactCockpitTimelineProps) {
  const [query, setQuery] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // ---- Filter counts ----
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: activities.length };
    for (const a of activities) {
      counts[a.type] = (counts[a.type] || 0) + 1;
    }
    return counts;
  }, [activities]);

  // ---- Combined filtering (type + text search) ----
  const filtered = useMemo(() => {
    let result = activities;
    if (activeFilter !== 'all') {
      result = result.filter((a) => a.type === activeFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (a) =>
          (a.title || '').toLowerCase().includes(q) ||
          (a.description || '').toLowerCase().includes(q) ||
          (a.dealTitle || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [activities, activeFilter, query]);

  // ---- Expand/collapse toggle ----
  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSaveNote = async () => {
    const text = noteDraft.trim();
    if (!text || !supabase) return;

    setSaving(true);
    setSaveError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSaveError('Usuario nao autenticado.');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      const orgId = (profile as Record<string, unknown>)?.organization_id as string | undefined;
      if (!orgId) {
        setSaveError('Organizacao nao encontrada.');
        return;
      }

      const { error } = await supabase.from('activities').insert({
        deal_id: firstDealId || null,
        contact_id: contactId,
        type: 'NOTE',
        title: 'Nota',
        description: text,
        date: new Date().toISOString(),
        completed: true,
        organization_id: orgId,
        owner_id: user.id,
      });

      if (error) {
        setSaveError('Erro ao salvar nota. Tente novamente.');
        return;
      }

      setNoteDraft('');
      onNoteCreated();
    } catch (e) {
      console.error('Failed to save note:', e);
      setSaveError('Erro ao salvar nota. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Header + search */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-foreground dark:text-muted-foreground">Timeline Unificada</div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background dark:bg-white/[0.03] px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar atividades..."
            className="w-44 bg-transparent text-xs text-foreground dark:text-muted-foreground outline-none placeholder:text-muted-foreground dark:placeholder:text-secondary-foreground"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTER_OPTIONS.map((opt) => {
          const count = filterCounts[opt.value] || 0;
          const isActive = activeFilter === opt.value;
          const isDisabled = opt.value !== 'all' && count === 0;
          return (
            <Button
              key={opt.value}
              type="button"
              onClick={() => !isDisabled && setActiveFilter(opt.value)}
              disabled={isDisabled}
              aria-label={`Filtrar por ${opt.label} (${count})`}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-1xs font-semibold transition-colors ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-500/20'
                  : isDisabled
                    ? 'bg-accent/30 dark:bg-white/[0.03] text-muted-foreground/50 cursor-not-allowed opacity-50'
                    : 'bg-accent/60 dark:bg-white/[0.06] text-secondary-foreground dark:text-muted-foreground ring-1 ring-ring dark:ring-white/10 hover:bg-accent dark:hover:bg-white/10 cursor-pointer'
              }`}
            >
              {opt.label}
              <span className={`text-3xs ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-muted-foreground'}`}>
                {count}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Timeline list */}
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-background dark:bg-white/[0.03]">
        <div className="flex-1 min-h-0 overflow-auto divide-y divide-border dark:divide-white/10">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="text-sm font-semibold text-secondary-foreground dark:text-muted-foreground">
                {activities.length === 0 ? 'Sem atividades ainda' : 'Sem resultados'}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {activities.length === 0
                  ? 'Atividades dos deals e do contato aparecerão aqui.'
                  : 'Tente ajustar a busca ou o filtro.'}
              </div>
            </div>
          ) : (
            filtered.map((a) => {
              const isExpanded = expandedIds.has(a.id);
              const isProspecting = a.metadata?.source === 'prospecting';
              const outcome = a.type === 'CALL' && a.metadata?.outcome
                ? OUTCOME_BADGES[a.metadata.outcome as string]
                : null;

              return (
                <div key={a.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-0.5 shrink-0">{typeIcon(a.type, a.scoreChange)}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold ${
                            a.type === 'SCORE_CHANGE'
                              ? (a.scoreChange ?? 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                              : 'text-foreground dark:text-muted-foreground'
                          }`}>
                            {a.title || typeLabel(a.type)}
                          </span>
                          {a.dealTitle && (
                            <Chip tone="neutral">{a.dealTitle}</Chip>
                          )}
                          {isProspecting && (
                            <span
                              className="inline-flex items-center rounded-full bg-indigo-500/15 px-2 py-0.5 text-2xs font-semibold text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20"
                              aria-label="Atividade de prospecção"
                            >
                              Prospecção
                            </span>
                          )}
                          {outcome && (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium ${outcome.className}`}
                              aria-label={`Resultado: ${outcome.label}`}
                            >
                              {outcome.label}
                            </span>
                          )}
                        </div>
                        {a.description && (
                          <Button
                            type="button"
                            variant="unstyled"
                            size="unstyled"
                            onClick={() => toggleExpanded(a.id)}
                            className="mt-0.5 text-left group block cursor-pointer"
                            aria-label={isExpanded ? 'Recolher descrição' : 'Expandir descrição'}
                          >
                            <div className={`text-1xs text-muted-foreground ${isExpanded ? '' : 'line-clamp-2'}`}>
                              {a.description}
                            </div>
                            <span className="text-2xs text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              {isExpanded ? 'ver menos' : 'ver mais'}
                            </span>
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-1xs text-muted-foreground whitespace-nowrap">
                      {formatAtISO(a.date)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick note input */}
      <div className="flex min-h-0 flex-col rounded-2xl border border-border bg-background dark:bg-white/[0.03] p-4">
        <label className="block text-xs font-semibold text-muted-foreground dark:text-muted-foreground">
          Nota rapida
        </label>
        <textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          className="mt-2 min-h-[60px] w-full resize-none rounded-xl border border-border bg-white dark:bg-white/[0.02] p-3 text-sm text-foreground dark:text-muted-foreground outline-none placeholder:text-muted-foreground dark:placeholder:text-secondary-foreground"
          placeholder="Escreva uma nota sobre este contato..."
        />
        {saveError && (
          <p className="mt-1 text-xs text-red-400">{saveError}</p>
        )}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="text-1xs text-muted-foreground">
            {firstDealId
              ? `Salva como nota no deal "${firstDealTitle || 'Principal'}"`
              : 'Salva como nota do contato'}
          </div>
          <Button
            type="button"
            className="rounded-xl bg-primary-600 dark:bg-white px-4 py-2 text-xs font-semibold text-white dark:text-gray-900 hover:bg-primary-500 dark:hover:bg-muted disabled:opacity-50"
            onClick={handleSaveNote}
            disabled={saving || !noteDraft.trim()}
          >
            {saving ? 'Salvando...' : 'Adicionar nota'}
          </Button>
        </div>
      </div>
    </div>
  );
}
