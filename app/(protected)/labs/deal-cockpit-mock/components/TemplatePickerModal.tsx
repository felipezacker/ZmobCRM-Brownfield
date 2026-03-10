'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { MODAL_BACKDROP_CLASS } from '@/components/ui/modalStyles';

import type { QuickScript, ScriptCategory } from '@/lib/supabase/quickScripts';
import type { TemplatePickerMode } from '../types';
import { scriptCategoryChipClass } from '../utils';

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
}: {
  isOpen: boolean;
  onClose: () => void;
  mode: TemplatePickerMode;
  scripts: QuickScript[];
  isLoading: boolean;
  variables: Record<string, string>;
  applyVariables: (template: string, vars: Record<string, string>) => string;
  getCategoryInfo: (cat: ScriptCategory) => { label: string; color: string };
  onPick: (script: QuickScript) => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | ScriptCategory>('all');

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setCategory('all');
  }, [isOpen, mode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = category === 'all' ? scripts : scripts.filter((s) => s.category === category);
    if (!q) return base;
    return base.filter((s) => {
      const hay = `${s.title}\n${s.template}`.toLowerCase();
      return hay.includes(q);
    });
  }, [category, query, scripts]);

  const title = mode === 'WHATSAPP' ? 'Templates \u00b7 WhatsApp' : 'Templates \u00b7 E-mail';

  if (!isOpen) return null;

  const categories: Array<{ key: 'all' | ScriptCategory; label: string }> = [
    { key: 'all', label: 'Todos' },
    { key: 'followup', label: 'Follow-up' },
    { key: 'intro', label: 'Apresenta\u00e7\u00e3o' },
    { key: 'objection', label: 'Obje\u00e7\u00f5es' },
    { key: 'closing', label: 'Fechamento' },
    { key: 'rescue', label: 'Resgate' },
    { key: 'other', label: 'Outros' },
  ];

  return (
    <div className="fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-[var(--z-modal)] flex items-center justify-center">
      <div className={`absolute inset-0 ${MODAL_BACKDROP_CLASS}`} onClick={onClose} />
      <div className="relative w-full max-w-3xl mx-4 rounded-2xl border border-white/10 bg-background shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-muted-foreground truncate">{title}</div>
            <div className="text-[11px] text-muted-foreground">Escolha um script persistido e eu preencho a mensagem com vari\u00e1veis do deal/contato.</div>
          </div>
          <Button
            type="button"
            className="rounded-xl border border-white/10 bg-white/3 p-2 text-muted-foreground hover:bg-white/5"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por t\u00edtulo ou texto\u2026"
                  className="w-full rounded-xl border border-white/10 bg-white/3 px-9 py-2 text-sm text-muted-foreground placeholder:text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <Button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    className={category === c.key
                      ? 'rounded-full bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/20 px-2.5 py-1 text-[11px] font-semibold'
                      : 'rounded-full bg-white/5 text-muted-foreground ring-1 ring-white/10 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/10'
                    }
                  >
                    {c.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground">
              Vari\u00e1veis: <span className="font-mono">{'{nome}'}</span>, <span className="font-mono">{'{empresa}'}</span>,{' '}
              <span className="font-mono">{'{valor}'}</span>, <span className="font-mono">{'{produto}'}</span>
            </div>

            <div className="h-105 overflow-auto rounded-2xl border border-white/10 bg-white/2">
              {isLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Carregando scripts\u2026</div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">Nenhum template encontrado.</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filtered.map((s) => {
                    const info = getCategoryInfo(s.category);
                    const preview = applyVariables(s.template, variables);
                    return (
                      <Button
                        key={s.id}
                        type="button"
                        className="w-full text-left p-4 hover:bg-white/5 transition-colors"
                        onClick={() => onPick(s)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${scriptCategoryChipClass(info.color)}`}>{info.label}</span>
                              <span className="truncate text-sm font-semibold text-muted-foreground">{s.title}</span>
                              {s.is_system ? <span className="text-[10px] text-muted-foreground">Sistema</span> : null}
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{preview}</div>
                          </div>
                          <div className="shrink-0 text-[11px] font-semibold text-cyan-200">Usar</div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
