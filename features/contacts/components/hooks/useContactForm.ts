import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useActiveDealsCount } from '@/hooks/useReassignContactWithDeals';
import { formatCPF, validateCPF, unformatCPF, formatCEP, validateCEP } from '@/lib/validations/cpf-cep';
import { findDuplicates, DuplicateMatch } from '@/lib/supabase/contact-dedup';
import type { Contact } from '@/types';
import type { ContactFormData, PhoneFormEntry } from '../types';

interface UseContactFormParams {
  isOpen: boolean;
  formData: ContactFormData;
  setFormData: React.Dispatch<React.SetStateAction<ContactFormData>>;
  editingContact: Contact | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onOpenDetail?: (contactId: string) => void;
}

export function useContactForm({
  isOpen,
  formData,
  setFormData,
  editingContact,
  onClose,
  onSubmit,
  onOpenDetail,
}: UseContactFormParams) {
  const router = useRouter();
  const { profile } = useAuth();

  // ============================================
  // State: batch creation
  // ============================================
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);

  // ============================================
  // State: active deals (for owner change cascade)
  // ============================================
  const [activeDealsCount, setActiveDealsCount] = useState(0);
  const { fetchCount } = useActiveDealsCount(editingContact?.id || null);

  // ============================================
  // State: validation errors
  // ============================================
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [cepError, setCepError] = useState<string | null>(null);

  // ============================================
  // State: duplicate detection (Story 3.7)
  // ============================================
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingSubmitEvent, setPendingSubmitEvent] = useState<React.FormEvent | null>(null);

  // ============================================
  // Derived
  // ============================================
  const ownerChanged = editingContact && formData.ownerId && formData.ownerId !== editingContact.ownerId;

  // ============================================
  // Open cockpit
  // ============================================
  const handleOpenCockpit = useCallback(() => {
    if (!editingContact) return;
    onClose();
    if (onOpenDetail) {
      onOpenDetail(editingContact.id);
    } else {
      router.push(`/contacts?cockpit=${editingContact.id}`);
    }
  }, [editingContact, onClose, onOpenDetail, router]);

  // ============================================
  // Reset state when modal opens/closes
  // ============================================
  const resetValidationState = useCallback(() => {
    setCpfError(null);
    setCepError(null);
    setDuplicateMatches([]);
    setShowDuplicateWarning(false);
    setPendingSubmitEvent(null);
  }, []);

  // ============================================
  // Phone handlers
  // ============================================
  const addPhone = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      phones: [
        ...prev.phones,
        {
          id: `temp-${Date.now()}`,
          phoneNumber: '',
          phoneType: 'CELULAR',
          isWhatsapp: false,
          isPrimary: prev.phones.length === 0,
        },
      ],
    }));
  }, [setFormData]);

  const removePhone = useCallback((index: number) => {
    setFormData(prev => {
      const next = [...prev.phones];
      const removed = next.splice(index, 1)[0];
      if (removed.isPrimary && next.length > 0) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return { ...prev, phones: next };
    });
  }, [setFormData]);

  const updatePhone = useCallback((index: number, updates: Partial<PhoneFormEntry>) => {
    setFormData(prev => {
      const next = [...prev.phones];
      if (updates.isPrimary) {
        next.forEach((p, i) => {
          if (i !== index) next[i] = { ...p, isPrimary: false };
        });
      }
      next[index] = { ...next[index], ...updates };
      return { ...prev, phones: next };
    });
  }, [setFormData]);

  // ============================================
  // CPF handlers
  // ============================================
  const handleCPFChange = useCallback((value: string) => {
    const formatted = formatCPF(value);
    setFormData(prev => ({ ...prev, cpf: formatted }));
    if (cpfError) setCpfError(null);
  }, [setFormData, cpfError]);

  const handleCPFBlur = useCallback(() => {
    if (!formData.cpf) {
      setCpfError(null);
      return;
    }
    if (!validateCPF(formData.cpf)) {
      setCpfError('CPF invalido');
    } else {
      setCpfError(null);
    }
  }, [formData.cpf]);

  // ============================================
  // CEP handlers
  // ============================================
  const handleCEPChange = useCallback((value: string) => {
    const formatted = formatCEP(value);
    setFormData(prev => ({ ...prev, addressCep: formatted }));
    if (cepError) setCepError(null);
  }, [setFormData, cepError]);

  const handleCEPBlur = useCallback(() => {
    if (!formData.addressCep) {
      setCepError(null);
      return;
    }
    if (!validateCEP(formData.addressCep)) {
      setCepError('CEP invalido (formato: 00000-000)');
    } else {
      setCepError(null);
    }
  }, [formData.addressCep]);

  // ============================================
  // Form submit with validation + duplicate check
  // ============================================
  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.cpf && !validateCPF(formData.cpf)) {
      setCpfError('CPF invalido');
      return;
    }
    if (formData.addressCep && !validateCEP(formData.addressCep)) {
      setCepError('CEP invalido (formato: 00000-000)');
      return;
    }

    // Story 3.7 — Check duplicates before creating (only for new contacts)
    if (!editingContact && profile?.organization_id) {
      const cpfRaw = formData.cpf ? unformatCPF(formData.cpf) : undefined;
      const primaryPhone = formData.phones.find(p => p.isPrimary)?.phoneNumber || formData.phone || undefined;

      const { data: matches } = await findDuplicates(
        profile.organization_id,
        {
          email: formData.email || undefined,
          phone: primaryPhone,
          cpf: cpfRaw,
        }
      );

      if (matches && matches.length > 0) {
        setDuplicateMatches(matches);
        setShowDuplicateWarning(true);
        setPendingSubmitEvent(e);
        return;
      }
    }

    onSubmit(e);
  }, [formData, editingContact, profile, onSubmit]);

  // Story 3.7 — "Criar mesmo assim"
  const handleCreateAnyway = useCallback(() => {
    setShowDuplicateWarning(false);
    setDuplicateMatches([]);
    if (pendingSubmitEvent) {
      onSubmit(pendingSubmitEvent);
      setPendingSubmitEvent(null);
    }
  }, [pendingSubmitEvent, onSubmit]);

  // Story 3.7 — "Abrir contato existente"
  const handleOpenExisting = useCallback((contactId: string) => {
    setShowDuplicateWarning(false);
    setDuplicateMatches([]);
    setPendingSubmitEvent(null);
    onClose();
    if (onOpenDetail) {
      onOpenDetail(contactId);
    } else {
      router.push(`/contacts?cockpit=${contactId}`);
    }
  }, [onClose, onOpenDetail, router]);

  return {
    // Auth
    profile,
    // Batch
    isCreatingBatch,
    setIsCreatingBatch,
    // Active deals
    activeDealsCount,
    setActiveDealsCount,
    fetchCount,
    ownerChanged,
    // Validation
    cpfError,
    cepError,
    // Duplicate detection
    duplicateMatches,
    showDuplicateWarning,
    // Handlers
    handleOpenCockpit,
    resetValidationState,
    addPhone,
    removePhone,
    updatePhone,
    handleCPFChange,
    handleCPFBlur,
    handleCEPChange,
    handleCEPBlur,
    handleFormSubmit,
    handleCreateAnyway,
    handleOpenExisting,
  };
}
