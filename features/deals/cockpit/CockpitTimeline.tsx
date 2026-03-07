'use client';

import React, { useState } from 'react';
import {
  Activity as ActivityIcon,
  CalendarClock,
  Inbox,
  MessageCircle,
  Phone,
  Search,
  StickyNote,
} from 'lucide-react';
import { Chip } from './cockpit-ui';
import type { TimelineItem, Actor } from './cockpit-types';
import type { Activity } from '@/types';
import { buildExecutionHeader, errorMessage, formatAtISO } from './cockpit-utils';
import { Button } from '@/components/ui/button';

interface CockpitTimelineProps {
  timelineItems: TimelineItem[];
  actor: Actor;
  dealId: string;
  dealTitle: string;
  addActivity: (activity: Omit<Activity, 'id' | 'createdAt'>) => Promise<Activity | null>;
  pushToast: (message: string, tone?: 'neutral' | 'success' | 'danger') => void;
  notes: Array<{ id: string; content: string; created_at: string }>;
  isNotesLoading: boolean;
}

export function CockpitTimeline({
  timelineItems,
  actor,
  dealId,
  dealTitle,
  addActivity,
  pushToast,
  notes,
  isNotesLoading,
}: CockpitTimelineProps) {
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | TimelineItem['kind']>('all');
  const [showSystemEvents, setShowSystemEvents] = useState(false);

  // Build unified timeline: activities + deal_notes
  const unifiedItems: TimelineItem[] = React.useMemo(() => {
    const items: TimelineItem[] = [...timelineItems];

    // Merge deal_notes into timeline
    if (!isNotesLoading && notes.length > 0) {
      for (const n of notes) {
        items.push({
          id: `dn-${n.id}`,
          at: formatAtISO(n.created_at),
          sortKey: n.created_at,
          kind: 'deal_note',
          title: 'Nota',
          subtitle: n.content,
        });
      }
    }

    // Sort by ISO date desc (sortKey is raw ISO, safe for comparison)
    items.sort((a, b) => b.sortKey.localeCompare(a.sortKey));

    return items;
  }, [timelineItems, notes, isNotesLoading]);

  const filteredTimelineItems = React.useMemo(() => {
    return unifiedItems.filter((t) => {
      if (!showSystemEvents && t.kind === 'system') return false;
      if (kindFilter !== 'all' && t.kind !== kindFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return `${t.title} ${t.subtitle ?? ''}`.toLowerCase().includes(q);
    });
  }, [kindFilter, query, showSystemEvents, unifiedItems]);

  const logOutsideCRM = async (type: Activity['type'], title: string, desc: string) => {
    try {
      await addActivity({
        dealId,
        dealTitle,
        type,
        title,
        description: desc,
        date: new Date().toISOString(),
        completed: true,
        user: actor,
      });
      pushToast(`${title} registrad${title === 'Reunião' ? 'a' : title === 'Tarefa' ? 'a' : 'o'}`, 'success');
    } catch (e) {
      pushToast(errorMessage(e, `Não foi possível registrar.`), 'danger');
    }
  };

  const filterChips: Array<{ key: 'all' | TimelineItem['kind']; label: string }> = [
    { key: 'all', label: 'Tudo' },
    { key: 'call', label: 'Ligações' },
    { key: 'note', label: 'Notas' },
    { key: 'deal_note', label: 'Deal Notes' },
    { key: 'status', label: 'Movimentações' },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* Compact header: title + chips + search — single row */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 shrink-0">
          {filterChips.map((chip) => (
            <Button
              key={chip.key}
              type="button"
              className={
                (chip.key === 'all' ? kindFilter === 'all' : kindFilter === chip.key)
                  ? 'rounded-full bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-100 ring-1 ring-cyan-500/20'
                  : 'rounded-full bg-slate-50 dark:bg-white/3 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 ring-1 ring-slate-300 dark:ring-white/10 hover:bg-slate-100 dark:hover:bg-white/5'
              }
              onClick={() => setKindFilter(chip.key === 'all' ? 'all' : chip.key)}
            >
              {chip.label}
            </Button>
          ))}
          <Button
            type="button"
            className={
              showSystemEvents
                ? 'rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-100 ring-1 ring-amber-500/20'
                : 'rounded-full bg-slate-50 dark:bg-white/3 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 ring-1 ring-slate-300 dark:ring-white/10 hover:bg-slate-100 dark:hover:bg-white/5'
            }
            onClick={() => setShowSystemEvents((v) => !v)}
            title="Eventos de sistema"
          >
            Sistema
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/3 px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-28 bg-transparent text-[11px] text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Timeline feed */}
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/3">
        <div className="flex-1 min-h-0 overflow-auto divide-y divide-slate-200 dark:divide-white/10">
          {filteredTimelineItems.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {unifiedItems.length === 0 ? 'Sem atividades ainda' : 'Sem resultados'}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {unifiedItems.length === 0
                  ? 'Registre uma nota, ligação ou mude a etapa.'
                  : 'Limpe filtros para ver tudo.'}
              </div>
              {unifiedItems.length !== 0 ? (
                <Button
                  type="button"
                  className="mt-3 rounded-lg bg-slate-200 dark:bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/15"
                  onClick={() => {
                    setQuery('');
                    setKindFilter('all');
                    setShowSystemEvents(false);
                  }}
                >
                  Limpar filtros
                </Button>
              ) : null}
            </div>
          ) : (
            filteredTimelineItems.map((t) => (
              <div key={t.id} className="px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {t.kind === 'deal_note' ? (
                        <StickyNote className="h-3 w-3 shrink-0 text-amber-400" />
                      ) : null}
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{t.title}</span>
                      {t.subtitle ? (
                        t.title === 'Moveu para' ? (
                          <Chip tone={t.tone === 'success' ? 'success' : t.tone === 'danger' ? 'danger' : 'neutral'}>{t.subtitle}</Chip>
                        ) : t.kind === 'deal_note' ? null : (
                          <span className="truncate text-[11px] text-slate-500">{t.subtitle}</span>
                        )
                      ) : null}
                    </div>
                    {/* Deal note content rendered below title */}
                    {t.kind === 'deal_note' && t.subtitle ? (
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 whitespace-pre-wrap line-clamp-2">{t.subtitle}</div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-[10px] text-slate-400 dark:text-slate-600">{t.at}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Compact "Registrar fora" — icons only */}
        <div className="border-t border-slate-200 dark:border-white/10 px-3 py-2 shrink-0">
          <div className="flex items-center gap-3 text-slate-500">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-600 shrink-0">Fora do CRM:</span>
            <Button type="button" className="hover:text-slate-800 dark:hover:text-slate-200" title="WhatsApp"
              onClick={() => {
                const header = buildExecutionHeader({ channel: 'WHATSAPP', context: { source: 'manual', origin: 'quickAction' }, outsideCRM: true });
                void logOutsideCRM('NOTE', 'WhatsApp', `${header}\n\n---\n\nMensagem enviada (registrado fora do CRM).`);
              }}>
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" className="hover:text-slate-800 dark:hover:text-slate-200" title="Email"
              onClick={() => {
                const header = buildExecutionHeader({ channel: 'EMAIL', context: { source: 'manual', origin: 'quickAction' }, outsideCRM: true });
                void logOutsideCRM('EMAIL', 'Email', `${header}\nAssunto: Email\n\n---\n\nEnviado (registrado fora do CRM).`);
              }}>
              <Inbox className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" className="hover:text-slate-800 dark:hover:text-slate-200" title="Ligacao"
              onClick={() => void logOutsideCRM('CALL', 'Ligação', 'Fonte: Cockpit\nFora do CRM: sim\n\n---\n\nRealizada (registrado fora do CRM).')}>
              <Phone className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" className="hover:text-slate-800 dark:hover:text-slate-200" title="Reuniao"
              onClick={() => void logOutsideCRM('MEETING', 'Reunião', 'Fonte: Cockpit\nFora do CRM: sim\n\n---\n\nRegistrada fora do CRM.')}>
              <CalendarClock className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" className="hover:text-slate-800 dark:hover:text-slate-200" title="Tarefa"
              onClick={() => void logOutsideCRM('TASK', 'Tarefa', 'Fonte: Cockpit\nFora do CRM: sim\n\n---\n\nCriada (registrado fora do CRM).')}>
              <ActivityIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
