'use client';

import React, { useState } from 'react';
import { Activity as ActivityIcon, Check, X } from 'lucide-react';
import { Chip, Panel } from './cockpit-ui';
import type { ChecklistItem } from './cockpit-types';
import { uid } from './cockpit-utils';
import { Button } from '@/app/components/ui/Button';

interface CockpitChecklistProps {
  checklist: ChecklistItem[];
  onPersistChecklist: (next: ChecklistItem[]) => void;
  onReload: () => void;
}

export function CockpitChecklist({ checklist, onPersistChecklist, onReload }: CockpitChecklistProps) {
  const [checklistDraft, setChecklistDraft] = useState('');

  return (
    <Panel
      title="Execução"
      icon={<ActivityIcon className="h-4 w-4 text-amber-200" />}
      right={<Chip tone="success">Real</Chip>}
      className="flex min-h-0 flex-col"
      bodyClassName="min-h-0 flex-1 overflow-auto"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-slate-500">Checklist persistido por deal (salvo em metadata).</div>
        <Button
          type="button"
          className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
          onClick={onReload}
          title="Recarregar do deal"
        >
          Recarregar
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {checklist.length === 0 ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">Sem itens. Adicione abaixo.</div>
        ) : (
          checklist.map((it) => (
            <div key={it.id} className="flex items-start gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-2.5">
              <Button
                type="button"
                className={
                  it.done
                    ? 'mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500 text-slate-950'
                    : 'mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/3 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                }
                aria-label={it.done ? 'Marcar como não feito' : 'Marcar como feito'}
                onClick={() => {
                  const next = checklist.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x));
                  onPersistChecklist(next);
                }}
              >
                {it.done ? <Check className="h-3.5 w-3.5" /> : null}
              </Button>
              <div className={it.done ? 'flex-1 text-sm text-slate-500 line-through' : 'flex-1 text-sm text-slate-700 dark:text-slate-200'}>
                {it.text}
              </div>
              <Button
                type="button"
                className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                title="Remover"
                onClick={() => {
                  const next = checklist.filter((x) => x.id !== it.id);
                  onPersistChecklist(next);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={checklistDraft}
          onChange={(e) => setChecklistDraft(e.target.value)}
          placeholder="Adicionar item…"
          className="h-10 flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 px-3 text-sm text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
        />
        <Button
          type="button"
          className="h-10 rounded-xl bg-white dark:bg-white px-4 text-xs font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50"
          disabled={!checklistDraft.trim()}
          onClick={() => {
            const text = checklistDraft.trim();
            if (!text) return;
            setChecklistDraft('');
            const next = [...checklist, { id: uid('chk'), text, done: false }];
            onPersistChecklist(next);
          }}
        >
          Adicionar
        </Button>
      </div>

      <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-600">Dica: isso fica no deal atual e aparece igual quando você trocar de deal.</div>
    </Panel>
  );
}
