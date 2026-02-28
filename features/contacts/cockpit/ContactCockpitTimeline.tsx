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
} from 'lucide-react';
import { Chip } from '@/features/deals/cockpit/cockpit-ui';
import { formatAtISO, uid } from '@/features/deals/cockpit/cockpit-utils';
import { Button } from '@/app/components/ui/Button';
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
      return <ArrowRight className="h-3.5 w-3.5 text-slate-400" />;
    case 'TASK':
      return <ClipboardList className="h-3.5 w-3.5 text-blue-400" />;
    case 'SCORE_CHANGE':
      return (scoreChange ?? 0) > 0
        ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
        : <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
    default:
      return <FileText className="h-3.5 w-3.5 text-slate-400" />;
  }
}

function typeLabel(type: string) {
  switch (type) {
    case 'NOTE': return 'Nota';
    case 'CALL': return 'Ligacao';
    case 'EMAIL': return 'Email';
    case 'MEETING': return 'Reuniao';
    case 'STATUS_CHANGE': return 'Mudanca';
    case 'TASK': return 'Tarefa';
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

  const filtered = useMemo(() => {
    if (!query.trim()) return activities;
    const q = query.toLowerCase();
    return activities.filter(
      (a) =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q) ||
        (a.dealTitle || '').toLowerCase().includes(q)
    );
  }, [activities, query]);

  const handleSaveNote = async () => {
    const text = noteDraft.trim();
    if (!text || !supabase) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Save as activity NOTE on the first deal
      if (firstDealId) {
        await supabase.from('activities').insert({
          deal_id: firstDealId,
          contact_id: contactId,
          type: 'NOTE',
          title: 'Nota',
          description: text,
          date: new Date().toISOString(),
          completed: true,
        });
      } else {
        // No deal linked — save as activity with only contact reference
        await supabase.from('activities').insert({
          deal_id: null,
          contact_id: contactId,
          type: 'NOTE',
          title: 'Nota',
          description: text,
          date: new Date().toISOString(),
          completed: true,
        });
      }

      setNoteDraft('');
      onNoteCreated();
    } catch (e) {
      console.error('Failed to save note:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Header + search */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-100">Timeline Unificada</div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/3 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar atividades..."
            className="w-44 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Timeline list */}
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/3">
        <div className="flex-1 min-h-0 overflow-auto divide-y divide-white/10">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="text-sm font-semibold text-slate-200">
                {activities.length === 0 ? 'Sem atividades ainda' : 'Sem resultados'}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {activities.length === 0
                  ? 'Atividades dos deals vinculados a este contato aparecerao aqui.'
                  : 'Tente ajustar a busca.'}
              </div>
            </div>
          ) : (
            filtered.map((a) => (
              <div key={a.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5 shrink-0">{typeIcon(a.type, a.scoreChange)}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${
                          a.type === 'SCORE_CHANGE'
                            ? (a.scoreChange ?? 0) > 0 ? 'text-emerald-400' : 'text-red-400'
                            : 'text-slate-200'
                        }`}>
                          {a.title || typeLabel(a.type)}
                        </span>
                        {a.dealTitle && (
                          <Chip tone="neutral">{a.dealTitle}</Chip>
                        )}
                      </div>
                      {a.description && (
                        <div className="mt-0.5 text-[11px] text-slate-400 line-clamp-2">
                          {a.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-[11px] text-slate-500 whitespace-nowrap">
                    {formatAtISO(a.date)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick note input (AC 4) */}
      <div className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/3 p-4">
        <label className="block text-xs font-semibold text-slate-400">
          Nota rapida
        </label>
        <textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          className="mt-2 min-h-[60px] w-full resize-none rounded-xl border border-white/10 bg-white/2 p-3 text-sm text-slate-200 outline-none placeholder:text-slate-600"
          placeholder="Escreva uma nota sobre este contato..."
        />
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500">
            {firstDealId
              ? `Salva como nota no deal "${firstDealTitle || 'Principal'}"`
              : 'Salva como nota do contato'}
          </div>
          <Button
            type="button"
            className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50"
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
