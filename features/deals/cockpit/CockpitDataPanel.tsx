'use client';

import React from 'react';
import { Copy, FileText, Home, Package, Settings, User } from 'lucide-react';
import { Panel } from './cockpit-ui';
import type { DealView, Contact, ContactPreference, CustomFieldDefinition } from '@/types';
import type { Stage } from './cockpit-types';
import { formatAtISO, formatCurrencyBRL, humanizeTestLabel } from './cockpit-utils';
import { Button } from '@/app/components/ui/Button';

/** Labels legíveis para deal_type. */
const DEAL_TYPE_LABELS: Record<string, string> = {
  VENDA: 'Venda',
  LOCACAO: 'Locação',
  PERMUTA: 'Permuta',
};

/** Labels para temperatura do lead. */
const TEMPERATURE_CONFIG: Record<string, { label: string; color: string }> = {
  HOT: { label: 'Quente', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 ring-rose-500/20' },
  WARM: { label: 'Morno', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-500/20' },
  COLD: { label: 'Frio', color: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 ring-sky-500/20' },
};

/** Labels para classificação do contato. */
const CLASSIFICATION_CONFIG: Record<string, { label: string; color: string }> = {
  COMPRADOR: { label: 'Comprador', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 ring-blue-500/20' },
  VENDEDOR: { label: 'Vendedor', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-300 ring-purple-500/20' },
  LOCATARIO: { label: 'Locatário', color: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 ring-cyan-500/20' },
  LOCADOR: { label: 'Locador', color: 'bg-teal-500/15 text-teal-600 dark:text-teal-300 ring-teal-500/20' },
  INVESTIDOR: { label: 'Investidor', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-500/20' },
  PERMUTANTE: { label: 'Permutante', color: 'bg-orange-500/15 text-orange-600 dark:text-orange-300 ring-orange-500/20' },
};

/** Labels para prioridade. */
const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: 'Alta', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 ring-rose-500/20' },
  medium: { label: 'Média', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-500/20' },
  low: { label: 'Baixa', color: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 ring-sky-500/20' },
};

/** Labels para urgência de preferência. */
const URGENCY_LABELS: Record<string, string> = {
  IMMEDIATE: 'Imediato',
  '3_MONTHS': 'Até 3 meses',
  '6_MONTHS': 'Até 6 meses',
  '1_YEAR': 'Até 1 ano',
};

/** Labels para finalidade. */
const PURPOSE_LABELS: Record<string, string> = {
  MORADIA: 'Moradia',
  INVESTIMENTO: 'Investimento',
  VERANEIO: 'Veraneio',
};

interface CockpitDataPanelProps {
  deal: DealView;
  contact: Contact | null;
  phoneE164: string | null;
  activeStage: Stage | undefined;
  onCopy: (label: string, text: string) => void;
  estimatedCommission?: { rate: number; estimated: number } | null;
  preferences: ContactPreference | null;
  customFieldDefinitions: CustomFieldDefinition[];
}

export function CockpitDataPanel({
  deal,
  contact,
  phoneE164,
  activeStage,
  onCopy,
  estimatedCommission,
  preferences,
  customFieldDefinitions,
}: CockpitDataPanelProps) {
  const temperature = (contact as any)?.temperature as string | undefined;
  const classification = (contact as any)?.classification as string | undefined;
  const leadScore = (contact as any)?.leadScore as number | undefined;
  const tags = (contact as any)?.tags as string[] | undefined;
  const contactNotes = contact?.notes as string | undefined;
  const customFields = (contact as any)?.customFields as Record<string, any> | undefined;
  const probability = deal.probability ?? 50;
  const priority = deal.priority as string | undefined;

  // Filter custom field definitions to only those that have values
  const filledCustomFields = customFieldDefinitions.filter(
    (def) => customFields && customFields[def.key] !== undefined && customFields[def.key] !== null && customFields[def.key] !== ''
  );

  return (
    <Panel
      title="Dados"
      icon={<FileText className="h-4 w-4 text-slate-500 dark:text-slate-300" />}
      className="flex min-h-0 flex-1 flex-col"
      bodyClassName="min-h-0 flex-1 overflow-auto"
    >
      <div className="flex min-h-0 flex-col gap-4">
        {/* ── CONTATO ── */}
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
            <User className="h-3.5 w-3.5" /> Contato
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate" title={contact?.name ?? ''}>
            {humanizeTestLabel(contact?.name) || contact?.name || '—'}
          </div>

          {/* Temperature + Classification + Score inline */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {temperature && TEMPERATURE_CONFIG[temperature] ? (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${TEMPERATURE_CONFIG[temperature].color}`}>
                {TEMPERATURE_CONFIG[temperature].label}
              </span>
            ) : null}
            {classification && CLASSIFICATION_CONFIG[classification] ? (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${CLASSIFICATION_CONFIG[classification].color}`}>
                {CLASSIFICATION_CONFIG[classification].label}
              </span>
            ) : null}
          </div>

          {/* Lead Score */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Score</span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${
                  (leadScore ?? 0) <= 30 ? 'bg-red-500' :
                  (leadScore ?? 0) <= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, leadScore ?? 0)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {leadScore ?? 0}
              <span className="ml-1 text-[10px] font-normal text-slate-500 dark:text-slate-400">
                {(leadScore ?? 0) <= 30 ? 'Frio' : (leadScore ?? 0) <= 60 ? 'Morno' : 'Quente'}
              </span>
            </span>
          </div>

          {/* Phone + Email + Source */}
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Tel</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-slate-700 dark:text-slate-200">{phoneE164 ?? ''}</span>
                <Button
                  type="button"
                  className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                  title="Copiar telefone"
                  onClick={() => phoneE164 && onCopy('Telefone', phoneE164)}
                  disabled={!phoneE164}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Email</span>
              <span className="flex items-center gap-2 min-w-0">
                <span className="truncate text-slate-700 dark:text-slate-200">{contact?.email ?? ''}</span>
                <Button
                  type="button"
                  className="shrink-0 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                  title="Copiar email"
                  onClick={() => contact?.email && onCopy('Email', contact.email)}
                  disabled={!contact?.email}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Origem</span>
              <span className="text-slate-700 dark:text-slate-200">{contact?.source ?? '—'}</span>
            </div>
          </div>

          {/* Tags */}
          {tags && tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          {/* Contact Notes */}
          {contactNotes ? (
            <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-200/90 whitespace-pre-wrap">
              {contactNotes}
            </div>
          ) : null}
        </div>

        {/* ── PREFERÊNCIAS ── */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
            <Home className="h-3.5 w-3.5" /> Preferências
          </div>
          {preferences ? (
            <div className="space-y-1.5 text-xs">
              {preferences.purpose ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Finalidade</span>
                  <span className="text-slate-700 dark:text-slate-200">{PURPOSE_LABELS[preferences.purpose] ?? preferences.purpose}</span>
                </div>
              ) : null}
              {preferences.propertyTypes.length > 0 ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Tipos</span>
                  <span className="text-slate-700 dark:text-slate-200">{preferences.propertyTypes.join(', ')}</span>
                </div>
              ) : null}
              {(preferences.priceMin !== null || preferences.priceMax !== null) ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Faixa preço</span>
                  <span className="text-slate-700 dark:text-slate-200">
                    {preferences.priceMin !== null ? formatCurrencyBRL(preferences.priceMin) : '—'}
                    {' — '}
                    {preferences.priceMax !== null ? formatCurrencyBRL(preferences.priceMax) : '—'}
                  </span>
                </div>
              ) : null}
              {preferences.regions.length > 0 ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Regiões</span>
                  <span className="text-slate-700 dark:text-slate-200 text-right">{preferences.regions.join(', ')}</span>
                </div>
              ) : null}
              {preferences.bedroomsMin !== null ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Quartos mín.</span>
                  <span className="text-slate-700 dark:text-slate-200">{preferences.bedroomsMin}+</span>
                </div>
              ) : null}
              {preferences.urgency ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Urgência</span>
                  <span className="text-slate-700 dark:text-slate-200">{URGENCY_LABELS[preferences.urgency] ?? preferences.urgency}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-xs text-slate-500">Sem preferências cadastradas</div>
          )}
        </div>

        {/* ── DEAL ── */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
            <FileText className="h-3.5 w-3.5" /> Deal
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Valor</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrencyBRL(deal.value ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Tipo</span>
              <span className="text-slate-700 dark:text-slate-200">{DEAL_TYPE_LABELS[deal.dealType ?? 'VENDA'] ?? 'Venda'}</span>
            </div>
            {/* Probabilidade com barra visual */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Probabilidade</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all ${
                      probability <= 30 ? 'bg-rose-500' :
                      probability <= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, probability)}%` }}
                  />
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{probability}%</span>
              </div>
            </div>
            {/* Prioridade com badge */}
            {priority ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Prioridade</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${
                  PRIORITY_CONFIG[priority]?.color ?? 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 ring-slate-300 dark:ring-white/10'
                }`}>
                  {PRIORITY_CONFIG[priority]?.label ?? priority}
                </span>
              </div>
            ) : null}
            {/* Data prevista */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Prev. fechamento</span>
              <span className="text-slate-700 dark:text-slate-200">
                {deal.expectedCloseDate ? formatAtISO(deal.expectedCloseDate) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Dono</span>
              <span className="text-slate-700 dark:text-slate-200">{deal.owner?.name ?? '—'}</span>
            </div>
            {estimatedCommission ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Comissão</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-300" title={`Taxa: ${estimatedCommission.rate}%`}>
                  {formatCurrencyBRL(estimatedCommission.estimated)} ({estimatedCommission.rate}%)
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Criado</span>
              <span className="text-slate-700 dark:text-slate-200">{formatAtISO(deal.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Última mudança</span>
              <span className="text-slate-700 dark:text-slate-200">{formatAtISO(deal.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* ── PRODUTOS ── */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
            <Package className="h-3.5 w-3.5" /> Produtos
          </div>
          {deal.items && deal.items.length > 0 ? (
            <div className="space-y-1.5 text-xs">
              {deal.items.map((item: any, idx: number) => (
                <div key={item.id ?? idx} className="flex items-center justify-between gap-2">
                  <span className="text-slate-700 dark:text-slate-200 truncate">{item.name ?? 'Produto'}</span>
                  <span className="shrink-0 text-slate-600 dark:text-slate-300">
                    {item.quantity && item.quantity > 1 ? `${item.quantity}x ` : ''}
                    {item.price != null ? formatCurrencyBRL(item.price) : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500">Sem produtos</div>
          )}
        </div>

        {/* ── CAMPOS CUSTOM (condicional) ── */}
        {filledCustomFields.length > 0 && customFields ? (
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
              <Settings className="h-3.5 w-3.5" /> Campos Custom
            </div>
            <div className="space-y-1.5 text-xs">
              {filledCustomFields.map((def) => (
                <div key={def.id} className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">{def.label}</span>
                  <span className="text-slate-700 dark:text-slate-200 text-right truncate max-w-[60%]">{String(customFields[def.key])}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
