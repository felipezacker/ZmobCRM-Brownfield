'use client';

import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { QuickScript, ScriptCategory } from '@/lib/supabase/quickScripts';
import type { TemplatePickerMode } from './cockpit-types';
import { scriptCategoryChipClass } from './cockpit-utils';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: TemplatePickerMode;
  scripts: QuickScript[];
  isLoading: boolean;
  variables: Record<string, string>;
  applyVariables: (template: string, vars: Record<string, string>) => string;
  getCategoryInfo: (category: any) => { label: string; color: string };
  onPick: (script: QuickScript) => void;
}

export function TemplatePickerModal({
  isOpen,
  onClose,
  mode,
  scripts,
  isLoading,
  variables,
  applyVariables,
  getCategoryInfo,
  onPick,
}: TemplatePickerModalProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | ScriptCategory>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = category === 'all' ? scripts : scripts.filter((s) => s.category === category);
    if (!q) return base;
    return base.filter((s) => {
      const hay = `${s.title}\n${s.template}`.toLowerCase();
      return hay.includes(q);
    });
  }, [category, query, scripts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-2xl max-h-[80dvh] flex flex-col rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="text-sm font-semibold text-slate-100">
            {mode === 'WHATSAPP' ? 'Template WhatsApp' : 'Template E-mail'}
          </div>
          <button
            type="button"
            className="rounded-lg border border-white/10 bg-white/3 p-2 text-slate-300 hover:bg-white/5"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-white/10 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 rounded-xl border border-white/10 bg-white/3 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar template…"
              className="flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600"
            />
          </div>
          <select
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 outline-none"
            value={category}
            onChange={(e) => setCategory(e.target.value as 'all' | ScriptCategory)}
          >
            <option value="all">Todas</option>
            <option value="PROSPECTING">Prospecção</option>
            <option value="FOLLOW_UP">Follow-up</option>
            <option value="CLOSING">Fechamento</option>
            <option value="OBJECTION">Objeção</option>
            <option value="GENERAL">Geral</option>
          </select>
        </div>

        <div className="flex-1 min-h-0 overflow-auto px-6 py-4">
          {isLoading ? (
            <div className="text-sm text-slate-400">Carregando scripts…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-slate-400">Nenhum template encontrado.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((s) => {
                const info = getCategoryInfo(s.category);
                const preview = applyVariables(s.template, variables);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className="w-full text-left rounded-2xl border border-white/10 bg-white/3 p-4 hover:bg-white/5 transition-colors"
                    onClick={() => onPick(s)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${scriptCategoryChipClass(info.color)}`}>
                        {info.label}
                      </span>
                      <div className="truncate text-sm font-semibold text-slate-100">{s.title}</div>
                    </div>
                    <div className="mt-2 line-clamp-4 text-xs text-slate-400 whitespace-pre-wrap">{preview}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
