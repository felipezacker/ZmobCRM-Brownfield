'use client';

import React from 'react';
import {
  Flame,
  Snowflake,
  Thermometer,
  Phone as PhoneIcon,
  MessageCircle,
  MapPin,
  Mail,
  User,
  Tag as TagIcon,
  Home,
  DollarSign,
  Search,
  Plus,
  X,
  PenTool,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Panel, Chip } from '@/features/deals/cockpit/cockpit-ui';
import { formatCurrencyBRL } from '@/features/deals/cockpit/cockpit-utils';
import type { Contact, ContactPhone, ContactPreference, CustomFieldDefinition } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  COMPRADOR: 'Comprador',
  VENDEDOR: 'Vendedor',
  LOCATARIO: 'Locatario',
  LOCADOR: 'Locador',
  INVESTIDOR: 'Investidor',
  PERMUTANTE: 'Permutante',
};

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: 'Website',
  LINKEDIN: 'LinkedIn',
  REFERRAL: 'Indicacao',
  MANUAL: 'Manual',
};

const URGENCY_LABELS: Record<string, string> = {
  IMMEDIATE: 'Imediata',
  '3_MONTHS': '3 meses',
  '6_MONTHS': '6 meses',
  '1_YEAR': '1 ano',
};

const PURPOSE_LABELS: Record<string, string> = {
  MORADIA: 'Moradia',
  INVESTIMENTO: 'Investimento',
  VERANEIO: 'Veraneio',
};

// ---------------------------------------------------------------------------
// Temperature Badge
// ---------------------------------------------------------------------------

function TemperatureBadge({ temperature }: { temperature?: string }) {
  if (temperature === 'HOT') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-500/15 px-3 py-2 ring-1 ring-red-500/20">
        <Flame className="h-5 w-5 text-red-400" />
        <div>
          <div className="text-xs font-bold text-red-300">Quente</div>
          <div className="text-[10px] text-red-400/70">Alta prioridade</div>
        </div>
      </div>
    );
  }
  if (temperature === 'COLD') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-blue-500/15 px-3 py-2 ring-1 ring-blue-500/20">
        <Snowflake className="h-5 w-5 text-blue-400" />
        <div>
          <div className="text-xs font-bold text-blue-300">Frio</div>
          <div className="text-[10px] text-blue-400/70">Baixa prioridade</div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl bg-amber-500/15 px-3 py-2 ring-1 ring-amber-500/20">
      <Thermometer className="h-5 w-5 text-amber-400" />
      <div>
        <div className="text-xs font-bold text-amber-300">Morno</div>
        <div className="text-[10px] text-amber-400/70">Prioridade media</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline-editable input/select classes (mirrors DealDetailModal pattern)
// ---------------------------------------------------------------------------
const INPUT_CLASS =
  'w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-500 placeholder-slate-500';
const SELECT_CLASS =
  'w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-500 appearance-none';

// ---------------------------------------------------------------------------
// Collapsible Section
// ---------------------------------------------------------------------------
function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/3">
      <Button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        {icon}
        <span className="flex-1 text-xs font-semibold text-slate-200">{title}</span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
        )}
      </Button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ContactCockpitDataPanelProps {
  contact: Contact;
  phones: ContactPhone[];
  preferences: ContactPreference | null;
  availableTags: string[];
  customFieldDefinitions: CustomFieldDefinition[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onUpdateCustomField: (key: string, value: string) => void;
  /** When provided, fields become inline-editable with onBlur save */
  onUpdateContact?: (updates: Partial<Contact>) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContactCockpitDataPanel({
  contact,
  phones,
  preferences,
  availableTags,
  customFieldDefinitions,
  onAddTag,
  onRemoveTag,
  onUpdateCustomField,
  onUpdateContact,
}: ContactCockpitDataPanelProps) {
  const editable = !!onUpdateContact;
  const [tagQuery, setTagQuery] = React.useState('');
  const contactTags = contact.tags || [];
  const contactTagsLower = new Set(contactTags.map(t => t.toLowerCase()));

  const normalizeTag = (value: string) => value.trim().replace(/\s+/g, ' ');

  const tagSuggestions = (() => {
    const q = normalizeTag(tagQuery);
    if (!q) return [];
    const qLower = q.toLowerCase();
    return (availableTags || [])
      .filter(t => !contactTagsLower.has(t.toLowerCase()))
      .filter(t => t.toLowerCase().includes(qLower))
      .slice(0, 8);
  })();

  const handleAddTag = (raw: string) => {
    const next = normalizeTag(raw);
    if (!next || contactTagsLower.has(next.toLowerCase())) return;
    onAddTag(next);
    setTagQuery('');
  };
  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-auto pr-1">
      {/* Temperature */}
      <TemperatureBadge temperature={contact.temperature} />

      {/* Main Data */}
      <CollapsibleSection
        title="Dados"
        icon={<User className="h-4 w-4 text-slate-300" />}
      >
        <div className="space-y-2 text-xs">
          {editable ? (
            <>
              <EditableRow label="Nome" value={contact.name || ''} onSave={(v) => onUpdateContact!({ name: v })} />
              <EditableRow label="Email" value={contact.email || ''} onSave={(v) => onUpdateContact!({ email: v })} />
              <EditableRow label="Telefone" value={contact.phone || ''} onSave={(v) => onUpdateContact!({ phone: v })} />
              <EditableRow label="CPF" value={contact.cpf ? formatCPF(contact.cpf) : ''} onSave={(v) => onUpdateContact!({ cpf: v.replace(/\D/g, '') })} />
              <SelectRow label="Classificacao" value={contact.classification || ''} options={Object.entries(CLASSIFICATION_LABELS).map(([k, v]) => ({ value: k, label: v }))} onSave={(v) => onUpdateContact!({ classification: v as Contact['classification'] })} />
              <SelectRow label="Temperatura" value={contact.temperature || 'WARM'} options={[{ value: 'HOT', label: 'Quente' }, { value: 'WARM', label: 'Morno' }, { value: 'COLD', label: 'Frio' }]} onSave={(v) => onUpdateContact!({ temperature: v as Contact['temperature'] })} />
              <SelectRow label="Tipo" value={contact.contactType || 'PF'} options={[{ value: 'PF', label: 'Pessoa Fisica' }, { value: 'PJ', label: 'Pessoa Juridica' }]} onSave={(v) => onUpdateContact!({ contactType: v as Contact['contactType'] })} />
              <SelectRow label="Origem" value={contact.source || ''} options={Object.entries(SOURCE_LABELS).map(([k, v]) => ({ value: k, label: v }))} onSave={(v) => onUpdateContact!({ source: v as Contact['source'] })} />
              <EditableRow label="Endereco" value={[contact.addressCep, contact.addressCity, contact.addressState].filter(Boolean).join(' - ')} />
              <EditableTextarea label="Notas" value={contact.notes || ''} onSave={(v) => onUpdateContact!({ notes: v })} />
            </>
          ) : (
            <>
              {contact.cpf && <Row label="CPF" value={formatCPF(contact.cpf)} />}
              <Row label="Email" value={contact.email || '\u2014'} />
              <Row label="Telefone" value={contact.phone || '\u2014'} />
              <Row label="Classificacao" value={CLASSIFICATION_LABELS[contact.classification || ''] || '\u2014'} />
              <Row label="Tipo" value={contact.contactType === 'PJ' ? 'Pessoa Juridica' : 'Pessoa Fisica'} />
              <Row label="Origem" value={SOURCE_LABELS[contact.source || ''] || '\u2014'} />
              <Row label="Status" value={contact.status || '\u2014'} />
              {(contact.addressCep || contact.addressCity || contact.addressState) && (
                <Row label="Endereco" value={[contact.addressCep, contact.addressCity, contact.addressState].filter(Boolean).join(' - ')} />
              )}
            </>
          )}
        </div>
      </CollapsibleSection>

      {/* Phones */}
      {phones.length > 0 && (
        <CollapsibleSection
          title="Telefones"
          icon={<PhoneIcon className="h-4 w-4 text-slate-300" />}
        >
          <div className="space-y-2">
            {phones.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {p.isWhatsapp && (
                    <MessageCircle className="h-3.5 w-3.5 shrink-0 text-green-400" />
                  )}
                  <span className="font-mono text-slate-200 truncate">
                    {p.phoneNumber}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-slate-500">{p.phoneType}</span>
                  {p.isPrimary && (
                    <Chip tone="success">Principal</Chip>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Tags */}
      <CollapsibleSection
        title="Tags"
        icon={<TagIcon className="h-4 w-4 text-slate-300" />}
      >
        <div className="flex flex-wrap gap-2">
          {contactTags.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Sem tags.</p>
          ) : (
            contactTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10"
              >
                {tag}
                <Button
                  type="button"
                  onClick={() => onRemoveTag(tag)}
                  className="ml-0.5 text-slate-500 hover:text-red-400"
                  aria-label={`Remover tag ${tag}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </span>
            ))
          )}
        </div>

        <div className="mt-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag(tagQuery);
                }
              }}
              placeholder="Adicionar tag..."
              className="min-w-0 flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-cyan-500 text-white placeholder-slate-500"
              aria-label="Adicionar tag"
            />
            <Button
              type="button"
              onClick={() => handleAddTag(tagQuery)}
              disabled={!normalizeTag(tagQuery)}
              className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
              aria-label="Adicionar tag"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {normalizeTag(tagQuery) && tagSuggestions.length > 0 && (
            <div className="mt-2 bg-black/20 border border-white/10 rounded-lg overflow-hidden">
              {tagSuggestions.map((t) => (
                <Button
                  key={t}
                  type="button"
                  onClick={() => handleAddTag(t)}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5 transition-colors"
                >
                  {t}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Custom Fields */}
      {customFieldDefinitions.length > 0 && (
        <CollapsibleSection
          title="Campos Personalizados"
          icon={<PenTool className="h-4 w-4 text-slate-300" />}
        >
          <div className="space-y-3">
            {customFieldDefinitions.map((field) => (
              <div key={field.id}>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={contact.customFields?.[field.key] || ''}
                    onChange={(e) => onUpdateCustomField(field.key, e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="">Selecione...</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={contact.customFields?.[field.key] || ''}
                    onChange={(e) => onUpdateCustomField(field.key, e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Preferences */}
      {preferences && (
        <CollapsibleSection
          title="Preferencias"
          icon={<Search className="h-4 w-4 text-slate-300" />}
          defaultOpen={false}
        >
          <div className="space-y-2 text-xs">
            {preferences.propertyTypes.length > 0 && (
              <Row
                label="Tipos"
                value={preferences.propertyTypes.join(', ')}
              />
            )}
            {preferences.purpose && (
              <Row
                label="Finalidade"
                value={PURPOSE_LABELS[preferences.purpose] || preferences.purpose}
              />
            )}
            {(preferences.priceMin != null || preferences.priceMax != null) && (
              <Row
                label="Faixa"
                value={`${preferences.priceMin != null ? formatCurrencyBRL(preferences.priceMin) : '\u2014'} ~ ${preferences.priceMax != null ? formatCurrencyBRL(preferences.priceMax) : '\u2014'}`}
              />
            )}
            {preferences.regions.length > 0 && (
              <Row label="Regioes" value={preferences.regions.join(', ')} />
            )}
            {preferences.bedroomsMin != null && (
              <Row label="Quartos min" value={String(preferences.bedroomsMin)} />
            )}
            {preferences.parkingMin != null && (
              <Row label="Vagas min" value={String(preferences.parkingMin)} />
            )}
            {preferences.areaMin != null && (
              <Row label="Area min" value={`${preferences.areaMin} m\u00B2`} />
            )}
            {preferences.urgency && (
              <Row
                label="Urgencia"
                value={URGENCY_LABELS[preferences.urgency] || preferences.urgency}
              />
            )}
            {preferences.acceptsFinancing != null && (
              <Row
                label="Financiamento"
                value={preferences.acceptsFinancing ? 'Sim' : 'Nao'}
              />
            )}
            {preferences.acceptsFgts != null && (
              <Row label="FGTS" value={preferences.acceptsFgts ? 'Sim' : 'Nao'} />
            )}
            {preferences.notes && (
              <div className="mt-1 text-[11px] text-slate-400 italic">
                {preferences.notes}
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row helpers
// ---------------------------------------------------------------------------

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-200 truncate text-right">{value}</span>
    </div>
  );
}

function EditableRow({ label, value, onSave }: { label: string; value: string; onSave?: (v: string) => void }) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => { setDraft(value); }, [value]);
  if (!onSave) return <Row label={label} value={value || '\u2014'} />;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-500 shrink-0">{label}</span>
      <input
        className={INPUT_CLASS + ' max-w-[180px] text-right'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft !== value) onSave(draft); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
      />
    </div>
  );
}

function SelectRow({ label, value, options, onSave }: { label: string; value: string; options: { value: string; label: string }[]; onSave: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-500 shrink-0">{label}</span>
      <select
        className={SELECT_CLASS + ' max-w-[180px] text-right'}
        value={value}
        onChange={(e) => onSave(e.target.value)}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function EditableTextarea({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => { setDraft(value); }, [value]);
  return (
    <div className="space-y-1">
      <span className="text-slate-500 text-xs">{label}</span>
      <textarea
        className={INPUT_CLASS + ' min-h-[50px] resize-none'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft !== value) onSave(draft); }}
      />
    </div>
  );
}
