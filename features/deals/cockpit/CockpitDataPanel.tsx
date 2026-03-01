'use client';

import React, { useState } from 'react';
import { Copy, FileText, Home, Package, Plus, Settings, Trash2, User } from 'lucide-react';
import { Panel } from './cockpit-ui';
import type { DealView, Contact, ContactPreference, CustomFieldDefinition } from '@/types';
import type { Stage } from './cockpit-types';
import { formatAtISO, formatCurrencyBRL, humanizeTestLabel } from './cockpit-utils';
import { Button } from '@/app/components/ui/Button';
import { CorretorSelect } from '@/components/ui/CorretorSelect';

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

const PROPERTY_TYPES = ['APARTAMENTO', 'CASA', 'TERRENO', 'COMERCIAL', 'RURAL', 'GALPAO'] as const;

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTAMENTO: 'Apto',
  CASA: 'Casa',
  TERRENO: 'Terreno',
  COMERCIAL: 'Comercial',
  RURAL: 'Rural',
  GALPAO: 'Galpão',
};

const INPUT_CLASS = 'bg-transparent outline-none text-xs hover:bg-slate-100 dark:hover:bg-white/5 rounded px-1 py-0.5 focus:ring-1 focus:ring-cyan-500 focus:bg-white dark:focus:bg-white/5 transition-colors';
const SELECT_CLASS = `${INPUT_CLASS} cursor-pointer`;

interface CockpitDataPanelProps {
  deal: DealView;
  contact: Contact | null;
  phoneE164: string | null;
  activeStage: Stage | undefined;
  onCopy: (label: string, text: string) => void;
  estimatedCommission?: { rate: number; estimated: number } | null;
  preferences: ContactPreference | null;
  customFieldDefinitions: CustomFieldDefinition[];
  onUpdateDeal?: (updates: Record<string, any>) => void;
  onUpdateContact?: (updates: Partial<Contact>) => void;
  onUpdatePreferences?: (updates: Partial<ContactPreference>) => void;
  onCreatePreferences?: () => void;
  onAddItem?: (item: { name: string; price: number; quantity: number }) => void;
  onRemoveItem?: (itemId: string) => void;
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
  onUpdateDeal,
  onUpdateContact,
  onUpdatePreferences,
  onCreatePreferences,
  onAddItem,
  onRemoveItem,
}: CockpitDataPanelProps) {
  const temperature = (contact as any)?.temperature as string | undefined;
  const classification = (contact as any)?.classification as string | undefined;
  const leadScore = (contact as any)?.leadScore as number | undefined;
  const tags = (contact as any)?.tags as string[] | undefined;
  const contactNotes = contact?.notes as string | undefined;
  const customFields = (contact as any)?.customFields as Record<string, any> | undefined;
  const probability = deal.probability ?? 50;
  const priority = deal.priority as string | undefined;

  // Local state for add-item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');

  // Filter custom field definitions to only those that have values
  const filledCustomFields = customFieldDefinitions.filter(
    (def) => customFields && customFields[def.key] !== undefined && customFields[def.key] !== null && customFields[def.key] !== ''
  );

  const handleAddItemSubmit = () => {
    if (!onAddItem || !newItemName.trim()) return;
    onAddItem({
      name: newItemName.trim(),
      price: parseFloat(newItemPrice) || 0,
      quantity: parseInt(newItemQty, 10) || 1,
    });
    setNewItemName('');
    setNewItemPrice('');
    setNewItemQty('1');
    setShowAddItem(false);
  };

  return (
    <Panel
      title="Dados"
      icon={<FileText className="h-4 w-4 text-slate-500 dark:text-slate-300" />}
      className="flex min-h-0 flex-1 flex-col"
      bodyClassName="min-h-0 flex-1 overflow-auto"
    >
      <div key={`${deal.id}-${contact?.id ?? ''}-${preferences?.id ?? ''}`} className="flex min-h-0 flex-col gap-4">
        {/* ── CONTATO ── */}
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
            <User className="h-3.5 w-3.5" /> Contato
          </div>
          {/* Nome editável */}
          <input
            type="text"
            className={`${INPUT_CLASS} w-full text-sm font-semibold text-slate-900 dark:text-slate-100`}
            defaultValue={humanizeTestLabel(contact?.name) || contact?.name || ''}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== contact?.name) {
                onUpdateContact?.({ name: v });
                onUpdateDeal?.({ title: v });
              }
            }}
            title="Editar nome do contato"
          />

          {/* Temperature + Classification selects */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              className={`${SELECT_CLASS} text-[10px] font-bold rounded-full px-2 py-0.5 ring-1 ${
                temperature && TEMPERATURE_CONFIG[temperature]
                  ? TEMPERATURE_CONFIG[temperature].color
                  : 'bg-slate-100 dark:bg-white/5 text-slate-500 ring-slate-200 dark:ring-white/10'
              }`}
              value={temperature ?? ''}
              onChange={(e) => onUpdateContact?.({ temperature: e.target.value || null } as any)}
            >
              <option value="">Temperatura</option>
              <option value="HOT">Quente</option>
              <option value="WARM">Morno</option>
              <option value="COLD">Frio</option>
            </select>
            <select
              className={`${SELECT_CLASS} text-[10px] font-bold rounded-full px-2 py-0.5 ring-1 ${
                classification && CLASSIFICATION_CONFIG[classification]
                  ? CLASSIFICATION_CONFIG[classification].color
                  : 'bg-slate-100 dark:bg-white/5 text-slate-500 ring-slate-200 dark:ring-white/10'
              }`}
              value={classification ?? ''}
              onChange={(e) => onUpdateContact?.({ classification: e.target.value || null } as any)}
            >
              <option value="">Classificação</option>
              {Object.entries(CLASSIFICATION_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>

          {/* Lead Score (read-only) */}
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

          {/* Phone + Email + Source — editáveis */}
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Tel</span>
              <span className="flex items-center gap-2">
                <input
                  type="tel"
                  className={`${INPUT_CLASS} font-mono text-slate-700 dark:text-slate-200 text-right w-32`}
                  defaultValue={contact?.phone ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (contact?.phone ?? '')) onUpdateContact?.({ phone: v || null } as any);
                  }}
                />
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
                <input
                  type="email"
                  className={`${INPUT_CLASS} text-slate-700 dark:text-slate-200 text-right min-w-0 flex-1`}
                  defaultValue={contact?.email ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (contact?.email ?? '')) onUpdateContact?.({ email: v || null } as any);
                  }}
                />
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
              <input
                type="text"
                className={`${INPUT_CLASS} text-slate-700 dark:text-slate-200 text-right w-28`}
                defaultValue={contact?.source ?? ''}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (contact?.source ?? '')) onUpdateContact?.({ source: v || null } as any);
                }}
              />
            </div>
          </div>

          {/* Tags (read-only) */}
          {tags && tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          {/* Contact Notes — textarea editável */}
          <div className="mt-2">
            <textarea
              className={`${INPUT_CLASS} w-full resize-none rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-200/90`}
              rows={2}
              defaultValue={contactNotes ?? ''}
              placeholder="Notas do contato..."
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (contactNotes ?? '')) onUpdateContact?.({ notes: v || null } as any);
              }}
            />
          </div>
        </div>

        {/* ── PREFERÊNCIAS ── */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
            <Home className="h-3.5 w-3.5" /> Preferências
          </div>
          {preferences ? (
            <div className="space-y-1.5 text-xs">
              {/* Finalidade */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Finalidade</span>
                <select
                  className={`${SELECT_CLASS} text-slate-700 dark:text-slate-200`}
                  value={preferences.purpose ?? ''}
                  onChange={(e) => onUpdatePreferences?.({ purpose: e.target.value || null } as any)}
                >
                  <option value="">—</option>
                  {Object.entries(PURPOSE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              {/* Tipos imóvel — chips toggle */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500 pt-0.5">Tipos</span>
                <div className="flex flex-wrap justify-end gap-1">
                  {PROPERTY_TYPES.map((pt) => {
                    const active = preferences.propertyTypes.includes(pt);
                    return (
                      <button
                        key={pt}
                        type="button"
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                          active
                            ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-200 ring-1 ring-cyan-500/30'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                        }`}
                        onClick={() => {
                          const next = active
                            ? preferences.propertyTypes.filter((t) => t !== pt)
                            : [...preferences.propertyTypes, pt];
                          onUpdatePreferences?.({ propertyTypes: next });
                        }}
                      >
                        {PROPERTY_TYPE_LABELS[pt] ?? pt}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Faixa de preço */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Preço mín</span>
                <input
                  type="number"
                  className={`${INPUT_CLASS} text-slate-700 dark:text-slate-200 text-right w-24`}
                  defaultValue={preferences.priceMin ?? ''}
                  placeholder="—"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    onUpdatePreferences?.({ priceMin: v ? parseFloat(v) : null });
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Preço máx</span>
                <input
                  type="number"
                  className={`${INPUT_CLASS} text-slate-700 dark:text-slate-200 text-right w-24`}
                  defaultValue={preferences.priceMax ?? ''}
                  placeholder="—"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    onUpdatePreferences?.({ priceMax: v ? parseFloat(v) : null });
                  }}
                />
              </div>
              {/* Regiões */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Regiões</span>
                <input
                  type="text"
                  className={`${INPUT_CLASS} text-slate-700 dark:text-slate-200 text-right flex-1 min-w-0`}
                  defaultValue={preferences.regions.join(', ')}
                  placeholder="Centro, Zona Sul..."
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    const regions = v ? v.split(',').map((r) => r.trim()).filter(Boolean) : [];
                    onUpdatePreferences?.({ regions });
                  }}
                />
              </div>
              {/* Quartos mín */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Quartos mín.</span>
                <input
                  type="number"
                  className={`${INPUT_CLASS} text-slate-700 dark:text-slate-200 text-right w-16`}
                  defaultValue={preferences.bedroomsMin ?? ''}
                  placeholder="—"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    onUpdatePreferences?.({ bedroomsMin: v ? parseInt(v, 10) : null });
                  }}
                />
              </div>
              {/* Urgência */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Urgência</span>
                <select
                  className={`${SELECT_CLASS} text-slate-700 dark:text-slate-200`}
                  value={preferences.urgency ?? ''}
                  onChange={(e) => onUpdatePreferences?.({ urgency: e.target.value || null } as any)}
                >
                  <option value="">—</option>
                  {Object.entries(URGENCY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Sem preferências cadastradas</span>
              {onCreatePreferences ? (
                <Button
                  type="button"
                  className="rounded-lg bg-cyan-500/15 px-2 py-1 text-[10px] font-semibold text-cyan-700 dark:text-cyan-200 hover:bg-cyan-500/25 transition-colors"
                  onClick={onCreatePreferences}
                >
                  Cadastrar
                </Button>
              ) : null}
            </div>
          )}
        </div>

        {/* ── DEAL ── */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
            <FileText className="h-3.5 w-3.5" /> Deal
          </div>
          <div className="space-y-2 text-xs">
            {/* Valor */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Valor</span>
              <input
                type="number"
                className={`${INPUT_CLASS} font-semibold text-slate-900 dark:text-slate-100 text-right w-28`}
                defaultValue={deal.value ?? 0}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v !== (deal.value ?? 0)) onUpdateDeal?.({ value: v });
                }}
              />
            </div>
            {/* Tipo */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Tipo</span>
              <select
                className={`${SELECT_CLASS} text-slate-700 dark:text-slate-200`}
                value={deal.dealType ?? 'VENDA'}
                onChange={(e) => onUpdateDeal?.({ dealType: e.target.value })}
              >
                {Object.entries(DEAL_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
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
                <input
                  type="number"
                  className={`${INPUT_CLASS} font-semibold text-slate-700 dark:text-slate-200 text-right w-12`}
                  defaultValue={probability}
                  min={0}
                  max={100}
                  onBlur={(e) => {
                    const v = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                    if (v !== probability) onUpdateDeal?.({ probability: v });
                  }}
                />
                <span className="text-slate-500">%</span>
              </div>
            </div>
            {/* Prioridade */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Prioridade</span>
              <select
                className={`${SELECT_CLASS} text-[10px] font-bold rounded-full px-2 py-0.5 ring-1 ${
                  priority && PRIORITY_CONFIG[priority]
                    ? PRIORITY_CONFIG[priority].color
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 ring-slate-200 dark:ring-white/10'
                }`}
                value={priority ?? ''}
                onChange={(e) => onUpdateDeal?.({ priority: e.target.value || null })}
              >
                <option value="">—</option>
                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            {/* Data prevista */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Prev. fechamento</span>
              <input
                type="date"
                className={`${INPUT_CLASS} text-slate-700 dark:text-slate-200`}
                defaultValue={deal.expectedCloseDate ? deal.expectedCloseDate.slice(0, 10) : ''}
                onChange={(e) => {
                  const v = e.target.value;
                  onUpdateDeal?.({ expectedCloseDate: v || null });
                }}
              />
            </div>
            {/* Dono */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Dono</span>
              <div className="max-w-[160px]">
                <CorretorSelect
                  value={deal.ownerId}
                  onChange={(ownerId) => onUpdateDeal?.({ ownerId })}
                />
              </div>
            </div>
            {/* Comissão (read-only) */}
            {estimatedCommission ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Comissão</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-300" title={`Taxa: ${estimatedCommission.rate}%`}>
                  {formatCurrencyBRL(estimatedCommission.estimated)} ({estimatedCommission.rate}%)
                </span>
              </div>
            ) : null}
            {/* Timestamps (read-only) */}
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
                <div key={item.id ?? idx} className="group flex items-center justify-between gap-2">
                  <span className="text-slate-700 dark:text-slate-200 truncate">{item.name ?? 'Produto'}</span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className="text-slate-600 dark:text-slate-300">
                      {item.quantity && item.quantity > 1 ? `${item.quantity}x ` : ''}
                      {item.price != null ? formatCurrencyBRL(item.price) : ''}
                    </span>
                    {onRemoveItem && item.id ? (
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-all"
                        title="Remover produto"
                        onClick={() => onRemoveItem(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500">Sem produtos</div>
          )}
          {/* Add item form */}
          {onAddItem ? (
            <div className="mt-2">
              {showAddItem ? (
                <div className="space-y-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/3 p-2">
                  <input
                    type="text"
                    className={`${INPUT_CLASS} w-full text-slate-700 dark:text-slate-200`}
                    placeholder="Nome do produto"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      className={`${INPUT_CLASS} flex-1 text-slate-700 dark:text-slate-200`}
                      placeholder="Preço"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                    />
                    <input
                      type="number"
                      className={`${INPUT_CLASS} w-12 text-center text-slate-700 dark:text-slate-200`}
                      placeholder="Qtd"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(e.target.value)}
                      min={1}
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      className="flex-1 rounded-lg bg-cyan-500/15 px-2 py-1 text-[10px] font-semibold text-cyan-700 dark:text-cyan-200 hover:bg-cyan-500/25 transition-colors"
                      onClick={handleAddItemSubmit}
                      disabled={!newItemName.trim()}
                    >
                      Adicionar
                    </Button>
                    <Button
                      type="button"
                      className="rounded-lg px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                      onClick={() => { setShowAddItem(false); setNewItemName(''); setNewItemPrice(''); setNewItemQty('1'); }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors mt-1"
                  onClick={() => setShowAddItem(true)}
                >
                  <Plus className="h-3 w-3" /> Produto
                </button>
              )}
            </div>
          ) : null}
        </div>

        {/* ── CAMPOS CUSTOM (condicional, read-only) ── */}
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
