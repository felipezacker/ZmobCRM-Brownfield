import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Save, X, Home } from 'lucide-react';
import { ContactPreference, PropertyType, PreferencePurpose, PreferenceUrgency } from '@/types';
import { contactPreferencesService } from '@/lib/supabase/contact-preferences';
import { Button } from '@/app/components/ui/Button';
import ConfirmModal from '@/components/ConfirmModal';

import { INPUT_CLASS, LABEL_CLASS, LEGEND_CLASS } from '@/features/contacts/constants';

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
// Tipos internos
// ============================================
interface PreferenceFormState {
  propertyTypes: string[];
  purpose: PreferencePurpose | null;
  priceMin: string;
  priceMax: string;
  regions: string[];
  bedroomsMin: string;
  parkingMin: string;
  areaMin: string;
  acceptsFinancing: boolean;
  acceptsFgts: boolean;
  urgency: PreferenceUrgency | null;
  notes: string;
}

const emptyForm: PreferenceFormState = {
  propertyTypes: [],
  purpose: null,
  priceMin: '',
  priceMax: '',
  regions: [],
  bedroomsMin: '',
  parkingMin: '',
  areaMin: '',
  acceptsFinancing: false,
  acceptsFgts: false,
  urgency: null,
  notes: '',
};

function prefToForm(pref: ContactPreference): PreferenceFormState {
  return {
    propertyTypes: pref.propertyTypes || [],
    purpose: pref.purpose,
    priceMin: pref.priceMin != null ? String(pref.priceMin) : '',
    priceMax: pref.priceMax != null ? String(pref.priceMax) : '',
    regions: pref.regions || [],
    bedroomsMin: pref.bedroomsMin != null ? String(pref.bedroomsMin) : '',
    parkingMin: pref.parkingMin != null ? String(pref.parkingMin) : '',
    areaMin: pref.areaMin != null ? String(pref.areaMin) : '',
    acceptsFinancing: pref.acceptsFinancing ?? false,
    acceptsFgts: pref.acceptsFgts ?? false,
    urgency: pref.urgency,
    notes: pref.notes || '',
  };
}

function formToPayload(form: PreferenceFormState) {
  return {
    propertyTypes: form.propertyTypes,
    purpose: form.purpose,
    priceMin: form.priceMin ? Number(form.priceMin) : null,
    priceMax: form.priceMax ? Number(form.priceMax) : null,
    regions: form.regions,
    bedroomsMin: form.bedroomsMin ? Number(form.bedroomsMin) : null,
    parkingMin: form.parkingMin ? Number(form.parkingMin) : null,
    areaMin: form.areaMin ? Number(form.areaMin) : null,
    acceptsFinancing: form.acceptsFinancing ?? null,
    acceptsFgts: form.acceptsFgts ?? null,
    urgency: form.urgency,
    notes: form.notes || null,
  };
}

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
      <span className="text-sm font-medium text-slate-900 dark:text-white truncate block">
        {types || 'Sem tipo definido'}
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400">
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
    <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-white/5">
      {/* Tipos de Imovel — toggle pills */}
      <div>
        <label className={LABEL_CLASS}>Tipos de Imovel</label>
        <div className="flex flex-wrap gap-1.5">
          {PROPERTY_TYPE_OPTIONS.map(opt => {
            const selected = form.propertyTypes.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => togglePropertyType(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selected
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {opt.label}
              </button>
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
        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={form.acceptsFinancing}
            onChange={e => onChange({ acceptsFinancing: e.target.checked })}
            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          Aceita financiamento
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={form.acceptsFgts}
            onChange={e => onChange({ acceptsFgts: e.target.checked })}
            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
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
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-sm"
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
                <button
                  type="button"
                  onClick={() => removeRegion(region)}
                  className="hover:text-red-500 transition-colors"
                  aria-label={`Remover ${region}`}
                >
                  <X size={10} />
                </button>
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
          className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
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
  const [preferences, setPreferences] = useState<ContactPreference[]>([]);
  const [loading, setLoading] = useState(!!contactId);
  const [error, setError] = useState<string | null>(null);

  // Buffered mode: track temp preferences when no contactId (creation mode)
  const internalBufferRef = useRef<ContactPreference[]>([]);
  const bufferedPrefsRef = externalBufferRef || internalBufferRef;

  // Estado de edicao: qual pref esta expandida
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Estado do form inline
  const [editForm, setEditForm] = useState<PreferenceFormState>(emptyForm);
  // ID especial para "novo perfil"
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Carregar preferencias (skip em modo buffered)
  const loadPreferences = useCallback(async () => {
    if (!contactId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await contactPreferencesService.getByContactId(contactId);
    if (result.error) {
      setError(result.error.message);
    } else {
      setPreferences(result.data || []);
    }
    setLoading(false);
  }, [contactId]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Validar preco
  const validatePrice = (form: PreferenceFormState): boolean => {
    if (form.priceMin && form.priceMax) {
      if (Number(form.priceMin) > Number(form.priceMax)) {
        setPriceError('Preco minimo deve ser menor que o maximo');
        return false;
      }
    }
    setPriceError(null);
    return true;
  };

  // Expandir para editar
  const startEditing = (pref: ContactPreference) => {
    if (expandedId === pref.id) {
      setExpandedId(null);
      return;
    }
    setIsCreating(false);
    setExpandedId(pref.id);
    setEditForm(prefToForm(pref));
    setPriceError(null);
  };

  // Iniciar criacao
  const startCreating = () => {
    setExpandedId(null);
    setIsCreating(true);
    setEditForm(emptyForm);
    setPriceError(null);
  };

  // Cancelar edicao/criacao
  const cancelEdit = () => {
    setExpandedId(null);
    setIsCreating(false);
    setPriceError(null);
  };

  // Salvar edicao
  const handleSaveEdit = async () => {
    if (!validatePrice(editForm)) return;
    if (!expandedId) return;

    // Modo buffered: atualizar localmente
    if (!contactId) {
      const payload = formToPayload(editForm);
      const updater = (prev: ContactPreference[]) => prev.map(p =>
        p.id === expandedId ? { ...p, ...payload } : p
      );
      setPreferences(updater);
      bufferedPrefsRef.current = updater(bufferedPrefsRef.current);
      setExpandedId(null);
      return;
    }

    setSaving(true);
    const payload = formToPayload(editForm);
    const result = await contactPreferencesService.update(expandedId, payload);
    setSaving(false);

    if (result.error) {
      setError(`Erro ao atualizar: ${result.error.message}`);
      return;
    }
    setExpandedId(null);
    await loadPreferences();
  };

  // Salvar novo
  const handleSaveNew = async () => {
    if (!validatePrice(editForm)) return;

    // Modo buffered: salvar localmente com ID temporario
    if (!contactId) {
      const payload = formToPayload(editForm);
      const tempPref = {
        id: `temp-${Date.now()}`,
        contactId: '',
        organizationId: organizationId || '',
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as ContactPreference;
      setPreferences(prev => [...prev, tempPref]);
      bufferedPrefsRef.current = [...bufferedPrefsRef.current, tempPref];
      setIsCreating(false);
      setEditForm(emptyForm);
      return;
    }

    setSaving(true);
    const payload = formToPayload(editForm);
    const result = await contactPreferencesService.create({
      ...payload,
      contactId,
      organizationId,
    } as Omit<ContactPreference, 'id' | 'createdAt' | 'updatedAt'>);
    setSaving(false);

    if (result.error) {
      setError(`Erro ao criar: ${result.error.message}`);
      return;
    }
    setIsCreating(false);
    await loadPreferences();
  };

  // Deletar (com confirmacao)
  const handleDelete = async (id: string) => {
    // Modo buffered: remover localmente sem confirmacao (dados nao salvos)
    if (!contactId) {
      setPreferences(prev => prev.filter(p => p.id !== id));
      bufferedPrefsRef.current = bufferedPrefsRef.current.filter(p => p.id !== id);
      if (expandedId === id) setExpandedId(null);
      return;
    }

    setConfirmDeleteId(id);
  };

  const executeDelete = async (id: string) => {
    const result = await contactPreferencesService.delete(id);
    if (result.error) {
      setError(`Erro ao excluir: ${result.error.message}`);
      return;
    }
    if (expandedId === id) setExpandedId(null);
    await loadPreferences();
  };

  // Form change handler
  const handleFormChange = (updates: Partial<PreferenceFormState>) => {
    setEditForm(prev => ({ ...prev, ...updates }));
    if (priceError && ('priceMin' in updates || 'priceMax' in updates)) {
      setPriceError(null);
    }
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
        <div className="text-xs text-slate-400 animate-pulse">Carregando preferencias...</div>
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
          <button
            type="button"
            className="ml-2 underline hover:no-underline"
            onClick={() => setError(null)}
          >
            Fechar
          </button>
        </div>
      )}

      {/* Lista de preferencias existentes */}
      {preferences.map(pref => (
        <div
          key={pref.id}
          className="bg-slate-50 dark:bg-black/10 rounded-lg border border-slate-200 dark:border-white/5"
        >
          {/* Header do card */}
          <div className="flex items-center gap-2 p-3">
            <button
              type="button"
              onClick={() => startEditing(pref)}
              className="flex items-center gap-2 flex-1 min-w-0 text-left"
            >
              {expandedId === pref.id ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
              <PreferenceSummary pref={pref} />
            </button>
            <Button
              type="button"
              onClick={() => handleDelete(pref.id)}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors shrink-0"
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
