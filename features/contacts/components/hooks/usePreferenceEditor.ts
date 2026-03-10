import { useState } from 'react';
import type { ContactPreference } from '@/types';

export interface PreferenceFormState {
  propertyTypes: string[];
  purpose: string | null;
  priceMin: string;
  priceMax: string;
  regions: string[];
  bedroomsMin: string;
  parkingMin: string;
  areaMin: string;
  acceptsFinancing: boolean;
  acceptsFgts: boolean;
  urgency: string | null;
  notes: string;
}

export const emptyForm: PreferenceFormState = {
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

export function prefToForm(pref: ContactPreference): PreferenceFormState {
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

export function formToPayload(form: PreferenceFormState) {
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

export function usePreferenceEditor() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PreferenceFormState>(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

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

  const startCreating = () => {
    setExpandedId(null);
    setIsCreating(true);
    setEditForm(emptyForm);
    setPriceError(null);
  };

  const cancelEdit = () => {
    setExpandedId(null);
    setIsCreating(false);
    setPriceError(null);
  };

  const handleFormChange = (updates: Partial<PreferenceFormState>) => {
    setEditForm(prev => ({ ...prev, ...updates }));
    if (priceError && ('priceMin' in updates || 'priceMax' in updates)) {
      setPriceError(null);
    }
  };

  return {
    expandedId,
    setExpandedId,
    editForm,
    setEditForm,
    isCreating,
    setIsCreating,
    priceError,
    validatePrice,
    startEditing,
    startCreating,
    cancelEdit,
    handleFormChange,
  };
}
