'use client';

import React from 'react';
import {
  Flame,
  Snowflake,
  Thermometer,
  Phone as PhoneIcon,
  MessageCircle,
  User,
  Tag as TagIcon,
  Search,
  Plus,
  X,
  PenTool,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAIPreferenceExtraction } from '@/hooks/useAIPreferenceExtraction';
import { Chip } from '@/features/deals/cockpit/cockpit-ui';
import { formatCurrencyBRL } from '@/features/deals/cockpit/cockpit-utils';
import { CLASSIFICATION_LABELS, SOURCE_LABELS } from '@/features/contacts/constants';
import type { Contact, ContactPhone, ContactPreference, CustomFieldDefinition } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

const URGENCY_LABELS: Record<string, string> = {
  IMMEDIATE: 'Imediata',
  '3_MONTHS': '3 meses',
  '6_MONTHS': '6 meses',
  '1_YEAR': '1 ano',
};

const PURPOSE_LABELS: Record<string, string> = {
  MORADIA: 'Moradia',
  INVESTIMENTO: 'Investimento',
};

const PROPERTY_TYPES = ['APARTAMENTO', 'CASA', 'TERRENO', 'COMERCIAL'] as const;
const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTAMENTO: 'Apto', CASA: 'Casa', TERRENO: 'Terreno', COMERCIAL: 'Comercial',
};

// ---------------------------------------------------------------------------
// Temperature Badge
// ---------------------------------------------------------------------------

function TemperatureBadge({ temperature }: { temperature?: string }) {
  if (temperature === 'HOT') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-500/15 px-3 py-2 ring-1 ring-red-500/20">
        <Flame className="h-5 w-5 text-red-500 dark:text-red-400" />
        <div>
          <div className="text-xs font-bold text-red-600 dark:text-red-300">Quente</div>
          <div className="text-2xs text-red-500/70 dark:text-red-400/70">Alta prioridade</div>
        </div>
      </div>
    );
  }
  if (temperature === 'COLD') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-blue-500/15 px-3 py-2 ring-1 ring-blue-500/20">
        <Snowflake className="h-5 w-5 text-blue-500 dark:text-blue-400" />
        <div>
          <div className="text-xs font-bold text-blue-600 dark:text-blue-300">Frio</div>
          <div className="text-2xs text-blue-500/70 dark:text-blue-400/70">Baixa prioridade</div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl bg-amber-500/15 px-3 py-2 ring-1 ring-amber-500/20">
      <Thermometer className="h-5 w-5 text-amber-500 dark:text-amber-400" />
      <div>
        <div className="text-xs font-bold text-amber-600 dark:text-amber-300">Morno</div>
        <div className="text-2xs text-amber-500/70 dark:text-amber-400/70">Prioridade media</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline-editable input/select classes (mirrors DealDetailModal pattern)
// ---------------------------------------------------------------------------
const INPUT_CLASS =
  'w-full bg-muted dark:bg-black/20 border border-border  rounded-lg px-3 py-1.5 text-xs text-foreground  outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-cyan-500 placeholder-muted-foreground dark:placeholder-muted-foreground';
const SELECT_CLASS =
  'w-full bg-muted dark:bg-black/20 border border-border  rounded-lg px-3 py-1.5 text-xs text-foreground  outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-cyan-500 appearance-none';

// ---------------------------------------------------------------------------
// Collapsible Section
// ---------------------------------------------------------------------------
function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  action?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border bg-background dark:bg-white/[0.03]">
      <div className="flex items-center">
        <Button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 px-4 py-2.5 text-left"
        >
          {icon}
          <span className="flex-1 text-xs font-semibold text-secondary-foreground dark:text-muted-foreground">{title}</span>
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>
        {action && <div className="pr-3">{action}</div>}
      </div>
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
  /** When provided, preferences section becomes editable */
  onUpdatePreference?: (updates: Partial<ContactPreference>) => void;
  onCreatePreference?: (initialData?: Partial<ContactPreference>) => void;
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
  onUpdatePreference,
  onCreatePreference,
}: ContactCockpitDataPanelProps) {
  const editable = !!onUpdateContact;
  const [tagQuery, setTagQuery] = React.useState('');
  const [customFieldsModalOpen, setCustomFieldsModalOpen] = React.useState(false);
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
        icon={<User className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />}
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
              <EditableRow label="CEP" value={contact.addressCep || ''} onSave={(v) => onUpdateContact!({ addressCep: v })} />
              <EditableRow label="Cidade" value={contact.addressCity || ''} onSave={(v) => onUpdateContact!({ addressCity: v })} />
              <EditableRow label="UF" value={contact.addressState || ''} onSave={(v) => onUpdateContact!({ addressState: v })} />
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
          icon={<PhoneIcon className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />}
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
                  <span className="font-mono text-foreground dark:text-muted-foreground truncate">
                    {p.phoneNumber}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-muted-foreground">{p.phoneType}</span>
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
        icon={<TagIcon className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />}
      >
        <div className="flex flex-wrap gap-2">
          {contactTags.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Sem tags.</p>
          ) : (
            contactTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-1xs font-medium px-2 py-1 rounded-full bg-muted dark:bg-white/5 text-secondary-foreground dark:text-muted-foreground border border-border"
              >
                {tag}
                <Button
                  type="button"
                  onClick={() => onRemoveTag(tag)}
                  className="ml-0.5 text-muted-foreground hover:text-red-400"
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
              className="min-w-0 flex-1 bg-muted dark:bg-black/20 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-cyan-500 text-foreground placeholder-muted-foreground dark:placeholder-muted-foreground"
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
            <div className="mt-2 bg-white dark:bg-black/20 border border-border rounded-lg overflow-hidden shadow-sm">
              {tagSuggestions.map((t) => (
                <Button
                  key={t}
                  type="button"
                  onClick={() => handleAddTag(t)}
                  className="w-full text-left px-3 py-1.5 text-xs text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 transition-colors"
                >
                  {t}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Custom Fields — only filled + edit button */}
      {customFieldDefinitions.length > 0 && (() => {
        const filledFields = customFieldDefinitions.filter((f) => {
          const v = contact.customFields?.[f.key];
          return v !== undefined && v !== null && v !== '';
        });
        return (
          <>
            <CollapsibleSection
              title="Campos Personalizados"
              icon={<PenTool className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />}
              defaultOpen={filledFields.length > 0}
            >
              {filledFields.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {filledFields.map((field) => (
                    <Row key={field.id} label={field.label} value={String(contact.customFields?.[field.key] ?? '')} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Nenhum campo preenchido.</p>
              )}
              <Button
                type="button"
                variant="unstyled"
                size="unstyled"
                onClick={() => setCustomFieldsModalOpen(true)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/50 dark:hover:bg-white/5 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Editar campos</span>
              </Button>
            </CollapsibleSection>
            {customFieldsModalOpen && (
              <CustomFieldsEditModal
                definitions={customFieldDefinitions}
                values={contact.customFields || {}}
                onSave={onUpdateCustomField}
                onClose={() => setCustomFieldsModalOpen(false)}
              />
            )}
          </>
        );
      })()}

      {/* Preferences */}
      {(preferences || onCreatePreference) && (
        <CollapsibleSection
          title="Preferencias"
          icon={<Search className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />}
          defaultOpen={!!preferences}
        >
          {/* AI extraction input */}
          {onUpdatePreference && <AiPreferenceExtractor preferences={preferences} onUpdate={onUpdatePreference} onCreate={onCreatePreference} />}

          {preferences ? (
            <div className="space-y-2 text-xs">
              {onUpdatePreference ? (
                <>
                  <SelectRow
                    label="Finalidade"
                    value={preferences.purpose || ''}
                    options={Object.entries(PURPOSE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                    onSave={(v) => onUpdatePreference({ purpose: (v || null) as ContactPreference['purpose'] })}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground shrink-0 pt-0.5">Tipos</span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {PROPERTY_TYPES.map((pt) => {
                        const active = preferences.propertyTypes.includes(pt);
                        return (
                          <Button key={pt} type="button"
                            className={`rounded-full px-2 py-0.5 text-2xs font-medium transition-colors ${
                              active
                                ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-200 ring-1 ring-cyan-500/30'
                                : 'bg-muted dark:bg-white/5 text-muted-foreground hover:bg-accent dark:hover:bg-white/10'
                            }`}
                            onClick={() => {
                              const next = active
                                ? preferences.propertyTypes.filter(t => t !== pt)
                                : [...preferences.propertyTypes, pt];
                              onUpdatePreference({ propertyTypes: next });
                            }}
                          >
                            {PROPERTY_TYPE_LABELS[pt] ?? pt}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Faixa R$</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        className={INPUT_CLASS + ' w-20 text-right'}
                        defaultValue={preferences.priceMin ?? ''}
                        placeholder="Min"
                        key={`pmin-${preferences.priceMin}`}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          onUpdatePreference({ priceMin: v ? parseFloat(v) : null });
                        }}
                        min={0}
                      />
                      <span className="text-muted-foreground">-</span>
                      <input
                        type="number"
                        className={INPUT_CLASS + ' w-20 text-right'}
                        defaultValue={preferences.priceMax ?? ''}
                        placeholder="Max"
                        key={`pmax-${preferences.priceMax}`}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          onUpdatePreference({ priceMax: v ? parseFloat(v) : null });
                        }}
                        min={0}
                      />
                    </div>
                  </div>
                  <EditableRow
                    label="Regioes"
                    value={preferences.regions.join(', ')}
                    onSave={(v) => {
                      const regions = v ? v.split(',').map(r => r.trim()).filter(Boolean) : [];
                      onUpdatePreference({ regions });
                    }}
                  />
                  <EditableNumberRow label="Quartos min" value={preferences.bedroomsMin} onSave={(v) => onUpdatePreference({ bedroomsMin: v })} />
                  <EditableNumberRow label="Vagas min" value={preferences.parkingMin} onSave={(v) => onUpdatePreference({ parkingMin: v })} />
                  <EditableNumberRow label="Area min (m²)" value={preferences.areaMin} onSave={(v) => onUpdatePreference({ areaMin: v })} />
                  <SelectRow
                    label="Urgencia"
                    value={preferences.urgency || ''}
                    options={Object.entries(URGENCY_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                    onSave={(v) => onUpdatePreference({ urgency: (v || null) as ContactPreference['urgency'] })}
                  />
                  <EditableTextarea
                    label="Observacoes"
                    value={preferences.notes || ''}
                    onSave={(v) => onUpdatePreference({ notes: v || null })}
                  />
                </>
              ) : (
                <>
                  {preferences.propertyTypes.length > 0 && (
                    <Row label="Tipos" value={preferences.propertyTypes.join(', ')} />
                  )}
                  {preferences.purpose && (
                    <Row label="Finalidade" value={PURPOSE_LABELS[preferences.purpose] || preferences.purpose} />
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
                    <Row label="Urgencia" value={URGENCY_LABELS[preferences.urgency] || preferences.urgency} />
                  )}
                  {preferences.notes && (
                    <div className="mt-1 text-1xs text-muted-foreground italic">
                      {preferences.notes}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : onCreatePreference ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Sem preferencias cadastradas</span>
              <Button
                type="button"
                onClick={() => onCreatePreference()}
                className="rounded-lg bg-cyan-500/15 px-2 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-200 hover:bg-cyan-500/25 transition-colors"
              >
                Cadastrar
              </Button>
            </div>
          ) : null}
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
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground dark:text-muted-foreground truncate text-right">{value}</span>
    </div>
  );
}

function EditableRow({ label, value, onSave }: { label: string; value: string; onSave?: (v: string) => void }) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => { setDraft(value); }, [value]);
  if (!onSave) return <Row label={label} value={value || '\u2014'} />;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <input
        className={INPUT_CLASS +' max-w-[180px] text-right'}
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
      <span className="text-muted-foreground shrink-0">{label}</span>
      <select
        className={SELECT_CLASS +' max-w-[180px] text-right'}
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

function CustomFieldInput({ fieldKey, fieldType, value, onSave }: { fieldKey: string; fieldType: string; value: string; onSave: (key: string, value: string) => void }) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => { setDraft(value); }, [value]);
  return (
    <input
      type={fieldType}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== value) onSave(fieldKey, draft); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
      className="w-full bg-muted dark:bg-black/20 border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-cyan-500"
    />
  );
}

function AiPreferenceExtractor({
  preferences,
  onUpdate,
  onCreate,
}: {
  preferences: ContactPreference | null;
  onUpdate: (updates: Partial<ContactPreference>) => void;
  onCreate?: (initialData?: Partial<ContactPreference>) => void;
}) {
  const { aiInput, setAiInput, aiLoading, handleAIExtract } = useAIPreferenceExtraction({
    preferences,
    onUpdate,
    onCreate,
  });

  return (
    <div className="mb-2">
      <div className="flex gap-1.5">
        <input
          type="text"
          className="flex-1 min-w-0 rounded-lg border border-violet-500/20 bg-violet-500/5 dark:bg-violet-500/10 px-2 py-1.5 text-xs text-foreground dark:text-muted-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-violet-500/30"
          placeholder="Ex: ap 3 quartos zona sul até 500k..."
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAIExtract(); }}
          disabled={aiLoading}
        />
        <Button
          type="button"
          variant="unstyled"
          size="unstyled"
          className="shrink-0 rounded-lg bg-violet-500/15 px-2 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-200 hover:bg-violet-500/25 transition-colors disabled:opacity-50"
          disabled={aiLoading || !aiInput.trim()}
          onClick={handleAIExtract}
        >
          {aiLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

function EditableNumberRow({ label, value, onSave }: { label: string; value: number | null; onSave: (v: number | null) => void }) {
  const [draft, setDraft] = React.useState(value != null ? String(value) : '');
  React.useEffect(() => { setDraft(value != null ? String(value) : ''); }, [value]);
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <input
        type="number"
        className={INPUT_CLASS + ' max-w-[100px] text-right'}
        value={draft}
        placeholder="--"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const v = draft.trim() ? Number(draft) : null;
          if (v !== value) onSave(v);
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        min={0}
      />
    </div>
  );
}

function EditableTextarea({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => { setDraft(value); }, [value]);
  return (
    <div className="space-y-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <textarea
        className={INPUT_CLASS +' min-h-[50px] resize-none'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft !== value) onSave(draft); }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Fields Edit Modal — select field + value + confirm
// ---------------------------------------------------------------------------

const FIELD_TYPE_ICONS: Record<string, string> = { text: 'T', number: '#', date: 'D', select: 'S' };

function CustomFieldsEditModal({
  definitions,
  values,
  onSave,
  onClose,
}: {
  definitions: CustomFieldDefinition[];
  values: Record<string, unknown>;
  onSave: (key: string, value: string) => void;
  onClose: () => void;
}) {
  const [selectedKey, setSelectedKey] = React.useState('');
  const [fieldValue, setFieldValue] = React.useState('');
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedField = definitions.find((d) => d.key === selectedKey) ?? null;

  // When selecting a field, load its current value
  const handleSelectField = (field: CustomFieldDefinition) => {
    setSelectedKey(field.key);
    setFieldValue(String(values[field.key] ?? ''));
    setDropdownOpen(false);
    setSearch('');
  };

  const filteredDefs = definitions.filter((d) =>
    d.label.toLowerCase().includes(search.toLowerCase())
  );

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const handleConfirm = () => {
    if (!selectedKey) return;
    onSave(selectedKey, fieldValue);
    // Reset for next field
    setSelectedKey('');
    setFieldValue('');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-white dark:bg-background shadow-2xl flex flex-col animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4">
          <div>
            <h3 className="text-base font-bold text-foreground dark:text-muted-foreground">Editar campo personalizado</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Preencher campo personalizado do contato</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="unstyled"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors -mt-1"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-5">
          {/* Field selector */}
          <div>
            <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-1.5">Campo adicional</label>
            <div className="relative" ref={dropdownRef}>
              <Button
                type="button"
                variant="unstyled"
                size="unstyled"
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/50 dark:bg-black/20 px-3 py-2.5 text-sm text-left transition-colors hover:bg-muted dark:hover:bg-black/30"
              >
                <span className={selectedField ? 'text-foreground dark:text-muted-foreground' : 'text-muted-foreground'}>
                  {selectedField ? selectedField.label : 'Selecionar'}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </Button>

              {dropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-lg border border-border bg-white dark:bg-background shadow-lg overflow-hidden">
                  {/* Search */}
                  <div className="p-2 border-b border-border">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Pesquisar..."
                      className="w-full bg-transparent text-sm text-foreground dark:text-muted-foreground outline-none placeholder:text-muted-foreground px-1 py-0.5"
                      autoFocus
                    />
                  </div>
                  {/* List */}
                  <div className="max-h-64 overflow-auto">
                    {filteredDefs.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-muted-foreground text-center">Nenhum campo encontrado</div>
                    ) : (
                      filteredDefs.map((def) => {
                        const hasFill = values[def.key] !== undefined && values[def.key] !== null && values[def.key] !== '';
                        return (
                          <Button
                            key={def.id}
                            type="button"
                            variant="unstyled"
                            size="unstyled"
                            onClick={() => handleSelectField(def)}
                            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/70 dark:hover:bg-white/5 ${
                              def.key === selectedKey ? 'bg-muted dark:bg-white/5' : ''
                            }`}
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-2xs font-bold text-muted-foreground bg-muted dark:bg-white/10">
                              {FIELD_TYPE_ICONS[def.type] ?? 'T'}
                            </span>
                            <span className="flex-1 text-foreground dark:text-muted-foreground truncate">{def.label}</span>
                            {hasFill && (
                              <span className="inline-block h-2 w-2 rounded-full bg-cyan-500 shrink-0" title="Preenchido" />
                            )}
                          </Button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Value input — only shows when a field is selected */}
          {selectedField && (
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-1.5">Valor</label>
              {selectedField.type === 'select' ? (
                <select
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted/50 dark:bg-black/20 px-3 py-2.5 text-sm text-foreground dark:text-muted-foreground outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-cyan-500"
                >
                  <option value="">Selecione...</option>
                  {selectedField.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={selectedField.type}
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  placeholder="Valor do campo adicional"
                  className="w-full rounded-lg border border-border bg-muted/50 dark:bg-black/20 px-3 py-2.5 text-sm text-foreground dark:text-muted-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary-500 dark:focus:ring-cyan-500"
                  autoFocus
                />
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="unstyled"
              size="unstyled"
              onClick={handleConfirm}
              disabled={!selectedKey}
              className="rounded-lg bg-primary-600 dark:bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 dark:hover:bg-cyan-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
