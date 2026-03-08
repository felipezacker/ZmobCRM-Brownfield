'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { QuickScript, ScriptCategory } from '@/lib/supabase/quickScripts';
import type { TemplatePickerMode } from './cockpit-types';
import { scriptCategoryChipClass } from './cockpit-utils';
import { Button } from '@/components/ui/button';
import { MODAL_OVERLAY_CLASS } from '@/components/ui/modalStyles';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: TemplatePickerMode;
  scripts: QuickScript[];
  isLoading: boolean;
  variables: Record<string, string>;
  applyVariables: (template: string, vars: Record<string, string>) => string;
  getCategoryInfo: (category: ScriptCategory) => { label: string; color: string };
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

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    <div className={MODAL_OVERLAY_CLASS} onClick={onClose}>
      <div className="relative w-full max-w-2xl max-h-[80dvh] flex flex-col rounded-2xl border border-white/10 bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="text-sm font-semibold text-muted-foreground">
            {mode === 'WHATSAPP' ? 'Template WhatsApp' : 'Template E-mail'}
          </div>
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            aria-label="Fechar modal"
            className="rounded-lg border border-white/10 bg-white/3 p-2 text-muted-foreground hover:bg-white/5 transition-colors"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-6 py-3 border-b border-white/10 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 rounded-xl border border-white/10 bg-white/3 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar template…"
              className="flex-1 bg-transparent text-xs text-muted-foreground outline-none placeholder:text-secondary-foreground"
            />
          </div>
          <select
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-foreground outline-none"
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
            <div className="text-sm text-muted-foreground">Carregando scripts…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum template encontrado.</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((s) => {
                const info = getCategoryInfo(s.category);
                const preview = applyVariables(s.template, variables);
                return (
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    key={s.id}
                    type="button"
                    className="block w-full text-left rounded-xl border border-white/10 bg-white/3 p-3 hover:bg-white/5 transition-colors"
                    onClick={() => onPick(s)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded ${scriptCategoryChipClass(info.color)}`}>
                        {info.label}
                      </span>
                      <span className="truncate text-sm font-semibold text-muted-foreground">{s.title}</span>
                    </div>
                    <div className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">{preview}</div>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
