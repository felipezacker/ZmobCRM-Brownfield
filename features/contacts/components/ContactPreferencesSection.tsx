import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Save, X, Home } from 'lucide-react';
import { ContactPreference, PropertyType, PreferencePurpose, PreferenceUrgency } from '@/types';
import { Button } from '@/components/ui/button';
import ConfirmModal from '@/components/ConfirmModal';

import { INPUT_CLASS, LABEL_CLASS, LEGEND_CLASS } from '@/features/contacts/constants';
import { useContactPreferences } from './hooks/useContactPreferences';
import { usePreferenceEditor, formToPayload } from './hooks/usePreferenceEditor';
import type { PreferenceFormState } from './hooks/usePreferenceEditor';

// ============================================
// Opcoes / Labels
// ============================================
const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: 'APARTAMENTO', label: 'Apartamento' },
  { value: 'CASA', label: 'Casa' },
  { value: 'TERRENO', label: 'Terreno' },
  { value: 'COMERCIAL', label: 'Comercial' },
  { value: 'RURAL', label: 'Rural' },
  { value: 'GALPAO', label: 'Galpão' },
];

const PURPOSE_OPTIONS: { value: PreferencePurpose; label: string }[] = [
  { value: 'MORADIA', label: 'Moradia' },
  { value: 'INVESTIMENTO', label: 'Investimento' },
  { value: 'VERANEIO', label: 'Veraneio' },
];

const URGENCY_OPTIONS: { value: PreferenceUrgency; label: string }[] = [
  { value: 'IMMEDIATE', label: 'Imediato' },
  { value: '3_MONTHS', label: '3 meses' },
  { value: '6_MONTHS', label: '6 meses' },
  { value: '1_YEAR', label: '1 ano' },
];

// ============================================
// Componente: Summary de um perfil (header do card)
// ============================================
function PreferenceSummary({ pref }: { pref: ContactPreference }) {
  const types = (pref.propertyTypes || [])
    .map(t => PROPERTY_TYPE_OPTIONS.find(o => o.value === t)?.label || t)
    .join(', ');
  const purpose = PURPOSE_OPTIONS.find(o => o.value === pref.purpose)?.label;
  const priceRange =
    pref.priceMin != null || pref.priceMax != null
      ? `R$ ${pref.priceMin?.toLocaleString('pt-BR') ?? '?'} - ${pref.priceMax?.toLocaleString('pt-BR') ?? '?'}`
      : null;

  return (
    <div className="flex-1 min-w-0">
      <span className="text-sm font-medium text-foreground truncate block">
        {types || 'Sem tipo definido'}
      </span>
      <span className="text-xs text-muted-foreground dark:text-muted-foreground">
        {[purpose, priceRange].filter(Boolean).join(' · ') || 'Perfil incompleto'}
      </span>
    </div>
  );
}

// ============================================
// Componente: Formulario de preferencia (inline)
// ============================================
function PreferenceForm({
  form,
  onChange,
  onSave,
  onCancel,
  saving,
  priceError,
}: {
  form: PreferenceFormState;
  onChange: (updates: Partial<PreferenceFormState>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  priceError: string | null;
}) {
  const [regionInput, setRegionInput] = useState('');

  const addRegion = () => {
    const trimmed = regionInput.trim();
    if (trimmed && !form.regions.includes(trimmed)) {
      onChange({ regions: [...form.regions, trimmed] });
    }
    setRegionInput('');
  };

  const removeRegion = (region: string) => {
    onChange({ regions: form.regions.filter(r => r !== region) });
  };

  const togglePropertyType = (type: string) => {
    const has = form.propertyTypes.includes(type);
    onChange({
      propertyTypes: has
        ? form.propertyTypes.filter(t => t !== type)
        : [...form.propertyTypes, type],
    });
  };

  return (
    <div className="space-y-4 pt-3 border-t border-border">
      {/* Tipos de Imovel — toggle pills */}
      <div>
        <label className={LABEL_CLASS}>Tipos de Imovel</label>
        <div className="flex flex-wrap gap-1.5">
          {PROPERTY_TYPE_OPTIONS.map(opt => {
            const selected = form.propertyTypes.includes(opt.value);
            return (
              <Button
                key={opt.value}
                type="button"
                onClick={() => togglePropertyType(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selected
                    ? 'bg-primary-600 text-white'
                    : 'bg-muted dark:bg-card text-secondary-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-accent'
                }`}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Finalidade + Urgencia */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLASS}>Finalidade</label>
          <select
            className={INPUT_CLASS}
            value={form.purpose || ''}
            onChange={e => onChange({ purpose: (e.target.value || null) as PreferencePurpose | null })}
          >
            <option value="">Selecione...</option>
            {PURPOSE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS}>Urgencia</label>
          <select
            className={INPUT_CLASS}
            value={form.urgency || ''}
            onChange={e => onChange({ urgency: (e.target.value || null) as PreferenceUrgency | null })}
          >
            <option value="">Selecione...</option>
            {URGENCY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Faixa de Preco */}
      <div>
        <label className={LABEL_CLASS}>Faixa de Preco (R$)</label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            className={priceError ? INPUT_CLASS.replace('focus:ring-primary-500', 'focus:ring-red-500 border-red-400 dark:border-red-600') : INPUT_CLASS}
            placeholder="Minimo"
            value={form.priceMin}
            onChange={e => onChange({ priceMin: e.target.value })}
            min={0}
          />
          <input
            type="number"
            className={priceError ? INPUT_CLASS.replace('focus:ring-primary-500', 'focus:ring-red-500 border-red-400 dark:border-red-600') : INPUT_CLASS}
            placeholder="Maximo"
            value={form.priceMax}
            onChange={e => onChange({ priceMax: e.target.value })}
            min={0}
          />
        </div>
        {priceError && (
          <span className="text-xs text-red-500 mt-0.5 block">{priceError}</span>
        )}
      </div>

      {/* Quartos, Vagas, Area */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={LABEL_CLASS}>Quartos (min)</label>
          <input
            type="number"
            className={INPUT_CLASS}
            placeholder="0"
            value={form.bedroomsMin}
            onChange={e => onChange({ bedroomsMin: e.target.value })}
            min={0}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Vagas (min)</label>
          <input
            type="number"
            className={INPUT_CLASS}
            placeholder="0"
            value={form.parkingMin}
            onChange={e => onChange({ parkingMin: e.target.value })}
            min={0}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Area min (m²)</label>
          <input
            type="number"
            className={INPUT_CLASS}
            placeholder="0"
            value={form.areaMin}
            onChange={e => onChange({ areaMin: e.target.value })}
            min={0}
          />
        </div>
      </div>

      {/* Financiamento + FGTS */}
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-1.5 text-xs text-secondary-foreground dark:text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={form.acceptsFinancing}
            onChange={e => onChange({ acceptsFinancing: e.target.checked })}
            className="rounded border-border text-primary-600 focus:ring-primary-500"
          />
          Aceita financiamento
        </label>
        <label className="flex items-center gap-1.5 text-xs text-secondary-foreground dark:text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={form.acceptsFgts}
            onChange={e => onChange({ acceptsFgts: e.target.checked })}
            className="rounded border-border text-primary-600 focus:ring-primary-500"
          />
          Aceita FGTS
        </label>
      </div>

      {/* Regioes (tags) */}
      <div>
        <label className={LABEL_CLASS}>Regioes de Interesse</label>
        <div className="flex gap-2">
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="Ex: Centro, Zona Sul..."
            value={regionInput}
            onChange={e => setRegionInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addRegion();
              }
            }}
          />
          <Button
            type="button"
            onClick={addRegion}
            className="px-3 py-2 bg-muted dark:bg-card text-secondary-foreground dark:text-muted-foreground rounded-lg hover:bg-accent dark:hover:bg-accent text-sm"
          >
            +
          </Button>
        </div>
        {form.regions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {form.regions.map(region => (
              <span
                key={region}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs"
              >
                {region}
                <Button
                  type="button"
                  onClick={() => removeRegion(region)}
                  className="hover:text-red-500 transition-colors"
                  aria-label={`Remover ${region}`}
                >
                  <X size={10} />
                </Button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Notas */}
      <div>
        <label className={LABEL_CLASS}>Observacoes</label>
        <textarea
          className={`${INPUT_CLASS} min-h-[60px] resize-y`}
          placeholder="Detalhes adicionais sobre a preferencia..."
          value={form.notes}
          onChange={e => onChange({ notes: e.target.value })}
        />
      </div>

      {/* Botoes */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Save size={12} />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-1.5 text-xs text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground transition-colors"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Componente principal: ContactPreferencesSection
// ============================================
interface ContactPreferencesSectionProps {
  contactId?: string;
  organizationId?: string;
  /** Ref exposta para o pai ler buffered prefs antes de fechar o modal */
  bufferedPrefsRef?: React.MutableRefObject<ContactPreference[]>;
}

export const ContactPreferencesSection: React.FC<ContactPreferencesSectionProps> = ({
  contactId,
  organizationId,
  bufferedPrefsRef: externalBufferRef,
}) => {
  const prefData = useContactPreferences({ contactId, organizationId, externalBufferRef });
  const editor = usePreferenceEditor();

  const {
    preferences, loading, error, setError,
    saving, confirmDeleteId, setConfirmDeleteId,
  } = prefData;

  const {
    expandedId, setExpandedId, editForm,
    isCreating, priceError,
    validatePrice, startEditing, startCreating, cancelEdit, handleFormChange,
  } = editor;

  const handleSaveEdit = async () => {
    if (!validatePrice(editForm)) return;
    if (!expandedId) return;
    await prefData.saveEdit(expandedId, formToPayload(editForm), {
      onSuccess: () => setExpandedId(null),
    });
  };

  const handleSaveNew = async () => {
    if (!validatePrice(editForm)) return;
    await prefData.saveNew(formToPayload(editForm), {
      onSuccess: () => { editor.setIsCreating(false); editor.setEditForm(editor.editForm); cancelEdit(); },
    });
  };

  const handleDelete = async (id: string) => {
    await prefData.handleDelete(id, expandedId, setExpandedId);
  };

  const executeDelete = async (id: string) => {
    await prefData.executeDelete(id, expandedId, setExpandedId);
  };

  if (loading) {
    return (
      <fieldset className="space-y-3">
        <legend className={LEGEND_CLASS}>
          <span className="flex items-center gap-2">
            <Home size={14} />
            Perfil de Interesse
          </span>
        </legend>
        <div className="text-xs text-muted-foreground animate-pulse">Carregando preferencias...</div>
      </fieldset>
    );
  }

  return (
    <fieldset className="space-y-3">
      <legend className={LEGEND_CLASS}>
        <span className="flex items-center gap-2">
          <Home size={14} />
          Perfil de Interesse
          {preferences.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full">
              {preferences.length}
            </span>
          )}
        </span>
      </legend>

      {error && (
        <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
          <Button
            type="button"
            className="ml-2 underline hover:no-underline"
            onClick={() => setError(null)}
          >
            Fechar
          </Button>
        </div>
      )}

      {/* Lista de preferencias existentes */}
      {preferences.map(pref => (
        <div
          key={pref.id}
          className="bg-background dark:bg-black/10 rounded-lg border border-border"
        >
          {/* Header do card */}
          <div className="flex items-center gap-2 p-3">
            <Button
              type="button"
              onClick={() => startEditing(pref)}
              className="flex items-center gap-2 flex-1 min-w-0 text-left"
            >
              {expandedId === pref.id ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
              <PreferenceSummary pref={pref} />
            </Button>
            <Button
              type="button"
              onClick={() => handleDelete(pref.id)}
              className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors shrink-0"
              aria-label="Excluir perfil"
            >
              <Trash2 size={14} />
            </Button>
          </div>

          {/* Form expandido */}
          {expandedId === pref.id && (
            <div className="px-3 pb-3">
              <PreferenceForm
                form={editForm}
                onChange={handleFormChange}
                onSave={handleSaveEdit}
                onCancel={cancelEdit}
                saving={saving}
                priceError={priceError}
              />
            </div>
          )}
        </div>
      ))}

      {/* Form de criacao */}
      {isCreating && (
        <div className="bg-primary-50/50 dark:bg-primary-900/10 rounded-lg border border-primary-200 dark:border-primary-800/30 p-3">
          <span className="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase mb-2 block">
            Novo Perfil de Interesse
          </span>
          <PreferenceForm
            form={editForm}
            onChange={handleFormChange}
            onSave={handleSaveNew}
            onCancel={cancelEdit}
            saving={saving}
            priceError={priceError}
          />
        </div>
      )}

      {/* Botao adicionar */}
      {!isCreating && (
        <Button
          type="button"
          onClick={startCreating}
          className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
        >
          <Plus size={14} />
          Adicionar perfil de interesse
        </Button>
      )}

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => { if (confirmDeleteId) executeDelete(confirmDeleteId); }}
        title="Excluir perfil de interesse"
        message="Tem certeza que deseja excluir este perfil de interesse?"
        confirmText="Excluir"
        variant="danger"
      />
    </fieldset>
  );
};
