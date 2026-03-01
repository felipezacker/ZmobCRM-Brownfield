'use client';

import React, { useState } from 'react';
import {
  Activity as ActivityIcon,
  CalendarClock,
  Filter,
  Inbox,
  MessageCircle,
  Phone,
  Search,
} from 'lucide-react';
import { Chip } from './cockpit-ui';
import type { TimelineItem, Actor } from './cockpit-types';
import type { Activity } from '@/types';
import { buildExecutionHeader, errorMessage } from './cockpit-utils';
import { Button } from '@/app/components/ui/Button';

interface CockpitTimelineProps {
  timelineItems: TimelineItem[];
  actor: Actor;
  dealId: string;
  dealTitle: string;
  addActivity: (activity: Omit<Activity, 'id' | 'createdAt'>) => Promise<Activity | null>;
  pushToast: (message: string, tone?: 'neutral' | 'success' | 'danger') => void;
}

export function CockpitTimeline({
  timelineItems,
  actor,
  dealId,
  dealTitle,
  addActivity,
  pushToast,
}: CockpitTimelineProps) {
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | TimelineItem['kind']>('all');
  const [showSystemEvents, setShowSystemEvents] = useState(false);
  const [noteDraftTimeline, setNoteDraftTimeline] = useState('');

  const filteredTimelineItems = React.useMemo(() => {
    return timelineItems.filter((t) => {
      if (!showSystemEvents && t.kind === 'system') return false;
      if (kindFilter !== 'all' && t.kind !== kindFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return `${t.title} ${t.subtitle ?? ''}`.toLowerCase().includes(q);
    });
  }, [kindFilter, query, showSystemEvents, timelineItems]);

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

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-100">Atividades</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className={
                kindFilter === 'all'
                  ? 'rounded-full bg-white/8 px-3 py-1.5 text-[11px] font-semibold text-slate-100 ring-1 ring-white/10'
                  : 'rounded-full bg-white/3 px-3 py-1.5 text-[11px] font-semibold text-slate-300 ring-1 ring-white/10 hover:bg-white/5'
              }
              onClick={() => setKindFilter('all')}
            >
              Tudo
            </Button>
            {(['call', 'note', 'status'] as const).map((k) => (
              <Button
                key={k}
                type="button"
                className={
                  kindFilter === k
                    ? 'rounded-full bg-cyan-500/15 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 ring-1 ring-cyan-500/20'
                    : 'rounded-full bg-white/3 px-3 py-1.5 text-[11px] font-semibold text-slate-300 ring-1 ring-white/10 hover:bg-white/5'
                }
                onClick={() => setKindFilter(k)}
              >
                {k === 'call' ? 'Ligações' : k === 'note' ? 'Notas' : 'Mudanças'}
              </Button>
            ))}

            <Button
              type="button"
              className={
                showSystemEvents
                  ? 'rounded-full bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold text-amber-100 ring-1 ring-amber-500/20'
                  : 'rounded-full bg-white/3 px-3 py-1.5 text-[11px] font-semibold text-slate-300 ring-1 ring-white/10 hover:bg-white/5'
              }
              onClick={() => setShowSystemEvents((v) => !v)}
              title="System events (hoje: quase tudo vem de Activity)"
            >
              Sistemas
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/3 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar"
              className="w-44 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600"
            />
          </div>
          <Button
            type="button"
            className="rounded-xl border border-white/10 bg-white/3 p-2 hover:bg-white/5"
            title="Filtros"
            onClick={() => pushToast('Use os chips para filtrar', 'neutral')}
          >
            <Filter className="h-4 w-4 text-slate-200" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/3">
        <div className="flex-1 min-h-0 overflow-auto divide-y divide-white/10">
          {filteredTimelineItems.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="text-sm font-semibold text-slate-200">
                {timelineItems.length === 0 ? 'Sem atividades ainda' : 'Sem resultados'}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {timelineItems.length === 0
                  ? 'Quando você registrar uma nota, ligação ou mudança de etapa, ela aparece aqui.'
                  : 'Tente limpar busca e filtros para ver tudo novamente.'}
              </div>
              {timelineItems.length !== 0 ? (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
                    onClick={() => {
                      setQuery('');
                      setKindFilter('all');
                      setShowSystemEvents(false);
                    }}
                  >
                    Limpar filtros
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            filteredTimelineItems.map((t) => (
              <div key={t.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">{t.title}</span>
                      {t.subtitle ? (
                        t.title === 'Moveu para' ? (
                          <Chip tone={t.tone === 'success' ? 'success' : t.tone === 'danger' ? 'danger' : 'neutral'}>{t.subtitle}</Chip>
                        ) : (
                          <span className="truncate text-xs text-slate-400">{t.subtitle}</span>
                        )
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-[11px] text-slate-500">{t.at}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600" title="Use quando a atividade aconteceu fora do CRM">
              Registrar (fora do CRM):
            </span>

            <Button
              type="button"
              className="inline-flex items-center gap-2 hover:text-slate-200"
              onClick={() => {
                const header = buildExecutionHeader({ channel: 'WHATSAPP', context: { source: 'manual', origin: 'quickAction' }, outsideCRM: true });
                void logOutsideCRM('NOTE', 'WhatsApp', `${header}\n\n---\n\nMensagem enviada (registrado fora do CRM).`);
              }}
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>

            <Button
              type="button"
              className="inline-flex items-center gap-2 hover:text-slate-200"
              onClick={() => {
                const header = buildExecutionHeader({ channel: 'EMAIL', context: { source: 'manual', origin: 'quickAction' }, outsideCRM: true });
                void logOutsideCRM('EMAIL', 'Email', `${header}\nAssunto: Email\n\n---\n\nEnviado (registrado fora do CRM).`);
              }}
            >
              <Inbox className="h-4 w-4" /> Email
            </Button>

            <Button
              type="button"
              className="inline-flex items-center gap-2 hover:text-slate-200"
              onClick={() => void logOutsideCRM('CALL', 'Ligação', 'Fonte: Cockpit\nFora do CRM: sim\n\n---\n\nRealizada (registrado fora do CRM).')}
            >
              <Phone className="h-4 w-4" /> Ligação
            </Button>

            <Button
              type="button"
              className="inline-flex items-center gap-2 hover:text-slate-200"
              onClick={() => void logOutsideCRM('MEETING', 'Reunião', 'Fonte: Cockpit\nFora do CRM: sim\n\n---\n\nRegistrada fora do CRM.')}
            >
              <CalendarClock className="h-4 w-4" /> Reunião
            </Button>

            <Button
              type="button"
              className="inline-flex items-center gap-2 hover:text-slate-200"
              onClick={() => void logOutsideCRM('TASK', 'Tarefa', 'Fonte: Cockpit\nFora do CRM: sim\n\n---\n\nCriada (registrado fora do CRM).')}
            >
              <ActivityIcon className="h-4 w-4" /> Tarefa
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom note input */}
      <div className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/3 p-4">
        <label className="block text-xs font-semibold text-slate-400">Escreva…</label>
        <textarea
          value={noteDraftTimeline}
          onChange={(e) => setNoteDraftTimeline(e.target.value)}
          className="mt-2 min-h-0 flex-1 w-full resize-none rounded-xl border border-white/10 bg-white/2 p-3 text-sm text-slate-200 outline-none placeholder:text-slate-600"
          placeholder="Notas, resumo da call, próximos passos…"
        />
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500">Isso vira uma Activity NOTE (log do deal).</div>
          <Button
            type="button"
            className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
            onClick={async () => {
              const text = noteDraftTimeline.trim();
              if (!text) {
                pushToast('Escreva uma nota antes de salvar', 'danger');
                return;
              }
              try {
                await addActivity({
                  dealId,
                  dealTitle,
                  type: 'NOTE',
                  title: 'Nota',
                  description: text,
                  date: new Date().toISOString(),
                  completed: true,
                  user: actor,
                });
                setNoteDraftTimeline('');
                pushToast('Nota salva', 'success');
              } catch (e) {
                pushToast(errorMessage(e, 'Não foi possível salvar a nota.'), 'danger');
              }
            }}
          >
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
