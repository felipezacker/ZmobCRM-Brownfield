'use client';

import React from 'react';
import { Copy, FileText } from 'lucide-react';
import { Panel } from './cockpit-ui';
import type { DealView, Contact } from '@/types';
import type { Stage, TimelineItem } from './cockpit-types';
import { formatAtISO, formatCurrencyBRL, humanizeTestLabel } from './cockpit-utils';

interface CockpitDataPanelProps {
  deal: DealView;
  contact: Contact | null;
  phoneE164: string | null;
  activeStage: Stage | undefined;
  latestNonSystem: TimelineItem | null;
  latestCall: TimelineItem | null;
  latestMove: TimelineItem | null;
  onCopy: (label: string, text: string) => void;
}

export function CockpitDataPanel({
  deal,
  contact,
  phoneE164,
  activeStage,
  latestNonSystem,
  latestCall,
  latestMove,
  onCopy,
}: CockpitDataPanelProps) {
  return (
    <Panel
      title="Dados"
      icon={<FileText className="h-4 w-4 text-slate-300" />}
      className="flex min-h-0 flex-1 flex-col"
      bodyClassName="min-h-0 flex-1 overflow-auto"
    >
      <div className="flex min-h-0 flex-col gap-3">
        <div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-100 truncate" title={contact?.name ?? ''}>
              {humanizeTestLabel(contact?.name) || contact?.name || '—'}
            </div>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Tel</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-slate-200">{phoneE164 ?? ''}</span>
                <button
                  type="button"
                  className="rounded-lg border border-white/10 bg-white/2 p-1.5 text-slate-300 hover:bg-white/5"
                  title="Copiar telefone"
                  onClick={() => phoneE164 && onCopy('Telefone', phoneE164)}
                  disabled={!phoneE164}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Email</span>
              <span className="flex items-center gap-2 min-w-0">
                <span className="truncate text-slate-200">{contact?.email ?? ''}</span>
                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-white/10 bg-white/2 p-1.5 text-slate-300 hover:bg-white/5"
                  title="Copiar email"
                  onClick={() => contact?.email && onCopy('Email', contact.email)}
                  disabled={!contact?.email}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Origem</span>
              <span className="text-slate-200">{contact?.source ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Status</span>
              <span className="text-slate-200">{contact?.status ?? '—'}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/2 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sinais</div>
          <div className="mt-2 space-y-1 text-xs text-slate-300">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Último evento</span>
              <span className="truncate text-slate-200">
                {latestNonSystem
                  ? `${latestNonSystem.title}${latestNonSystem.subtitle ? ` — ${latestNonSystem.subtitle}` : ''}`
                  : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Última ligação</span>
              <span className="truncate text-slate-200">{latestCall ? latestCall.at : '—'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Etapa</span>
              <span className="text-slate-200">{activeStage?.label ?? '—'}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/2 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Resumo</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-white/10 bg-white/2 p-2">
              <div className="text-slate-500">Valor</div>
              <div className="mt-0.5 font-semibold text-slate-100">{formatCurrencyBRL(deal.value ?? 0)}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/2 p-2">
              <div className="text-slate-500">Probabilidade</div>
              <div className="mt-0.5 font-semibold text-slate-100">{deal.probability ?? 50}%</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/2 p-2">
              <div className="text-slate-500">Dono</div>
              <div className="mt-0.5 font-semibold text-slate-100">{deal.owner?.name ?? '—'}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/2 p-2">
              <div className="text-slate-500">Última mudança</div>
              <div className="mt-0.5 truncate font-semibold text-slate-100">
                {latestMove ? latestMove.at : formatAtISO(deal.updatedAt)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
