import React, { useId, useState, useCallback } from 'react';
import { X, Maximize2, Plus, Trash2, Phone as PhoneIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Contact, ContactType, ContactClassification, ContactTemperature, PhoneType } from '@/types';
import { DebugFillButton } from '@/components/debug/DebugFillButton';
import { fakeContact } from '@/lib/debug';
import { FocusTrap, useFocusReturn } from '@/lib/a11y';
import { CorretorSelect } from '@/components/ui/CorretorSelect';
import { useAuth } from '@/context/AuthContext';
import { useActiveDealsCount } from '@/hooks/useReassignContactWithDeals';
import { Button } from '@/app/components/ui/Button';
import { formatCPF, validateCPF, unformatCPF, formatCEP, validateCEP, BRAZILIAN_STATES } from '@/lib/validations/cpf-cep';
import { ContactPreferencesSection } from './ContactPreferencesSection';
import { findDuplicates, DuplicateMatch } from '@/lib/supabase/contact-dedup';

// ============================================
// Tipos de dados do formulário de telefone
// ============================================
export interface PhoneFormEntry {
  /** ID temporario (UUID ou temp-*). */
  id: string;
  phoneNumber: string;
  phoneType: PhoneType;
  isWhatsapp: boolean;
  isPrimary: boolean;
}

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  ownerId: string | undefined;
  cascadeDeals: boolean;
  birthDate: string;
  source: '' | 'WEBSITE' | 'LINKEDIN' | 'REFERRAL' | 'MANUAL';
  notes: string;
  // Story 3.1 — Novos campos
  cpf: string;
  contactType: ContactType;
  classification: ContactClassification | '';
  temperature: ContactTemperature;
  addressCep: string;
  addressCity: string;
  addressState: string;
  phones: PhoneFormEntry[];
}

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: ContactFormData;
  setFormData: React.Dispatch<React.SetStateAction<ContactFormData>>;
  editingContact: Contact | null;
  createFakeContactsBatch?: (count: number) => Promise<void>;
  isSubmitting?: boolean;
}

import { INPUT_CLASS, LABEL_CLASS, LEGEND_CLASS, INPUT_ERROR_CLASS } from '@/features/contacts/constants';

/**
 * Componente React `ContactFormModal` — Story 3.1 completo.
 */
export const ContactFormModal: React.FC<ContactFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingContact,
  createFakeContactsBatch,
  isSubmitting = false,
}) => {
  const headingId = useId();
  const router = useRouter();
  useFocusReturn({ enabled: isOpen });
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const { profile } = useAuth();
  const [activeDealsCount, setActiveDealsCount] = useState(0);
  const { fetchCount } = useActiveDealsCount(editingContact?.id || null);
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [cepError, setCepError] = useState<string | null>(null);
  // Story 3.7 — Duplicate detection
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingSubmitEvent, setPendingSubmitEvent] = useState<React.FormEvent | null>(null);

  const ownerChanged = editingContact && formData.ownerId && formData.ownerId !== editingContact.ownerId;

  const handleOpenCockpit = useCallback(() => {
    if (!editingContact) return;
    onClose();
    router.push(`/contacts/${editingContact.id}/cockpit`);
  }, [editingContact, onClose, router]);

  React.useEffect(() => {
    if (isOpen && editingContact?.id) {
      fetchCount().then(setActiveDealsCount);
    } else {
      setActiveDealsCount(0);
    }
  }, [isOpen, editingContact?.id, fetchCount]);

  // Reset validation errors and duplicate state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setCpfError(null);
      setCepError(null);
      setDuplicateMatches([]);
      setShowDuplicateWarning(false);
      setPendingSubmitEvent(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const fillWithFakeData = () => {
    const fake = fakeContact();
    setFormData(prev => ({
      ...prev,
      name: fake.name,
      email: fake.email,
      phone: fake.phone,
      birthDate: '1990-05-15',
      source: 'MANUAL',
      notes: 'Contato de teste gerado automaticamente',
      cpf: '529.982.247-25',
      contactType: 'PF',
      classification: 'COMPRADOR',
      temperature: 'WARM',
      addressCep: '01310-100',
      addressCity: 'São Paulo',
      addressState: 'SP',
    }));
  };

  // ============================================
  // Handlers de telefones
  // ============================================
  const addPhone = () => {
    setFormData(prev => ({
      ...prev,
      phones: [
        ...prev.phones,
        {
          id: `temp-${Date.now()}`,
          phoneNumber: '',
          phoneType: 'CELULAR',
          isWhatsapp: false,
          isPrimary: prev.phones.length === 0, // primeiro telefone é primário por padrão
        },
      ],
    }));
  };

  const removePhone = (index: number) => {
    setFormData(prev => {
      const next = [...prev.phones];
      const removed = next.splice(index, 1)[0];
      // Se removeu o primário e ainda tem telefones, marca o primeiro como primário
      if (removed.isPrimary && next.length > 0) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return { ...prev, phones: next };
    });
  };

  const updatePhone = (index: number, updates: Partial<PhoneFormEntry>) => {
    setFormData(prev => {
      const next = [...prev.phones];
      // Se marcando como primário, desmarcar os outros
      if (updates.isPrimary) {
        next.forEach((p, i) => {
          if (i !== index) next[i] = { ...p, isPrimary: false };
        });
      }
      next[index] = { ...next[index], ...updates };
      return { ...prev, phones: next };
    });
  };

  // ============================================
  // Handlers de CPF
  // ============================================
  const handleCPFChange = (value: string) => {
    const formatted = formatCPF(value);
    setFormData(prev => ({ ...prev, cpf: formatted }));
    // Limpa erro ao digitar
    if (cpfError) setCpfError(null);
  };

  const handleCPFBlur = () => {
    if (!formData.cpf) {
      setCpfError(null);
      return;
    }
    if (!validateCPF(formData.cpf)) {
      setCpfError('CPF inválido');
    } else {
      setCpfError(null);
    }
  };

  // ============================================
  // Handlers de CEP
  // ============================================
  const handleCEPChange = (value: string) => {
    const formatted = formatCEP(value);
    setFormData(prev => ({ ...prev, addressCep: formatted }));
    if (cepError) setCepError(null);
  };

  const handleCEPBlur = () => {
    if (!formData.addressCep) {
      setCepError(null);
      return;
    }
    if (!validateCEP(formData.addressCep)) {
      setCepError('CEP inválido (formato: 00000-000)');
    } else {
      setCepError(null);
    }
  };

  // ============================================
  // Form submit com validação
  // ============================================
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validar CPF se preenchido
    if (formData.cpf && !validateCPF(formData.cpf)) {
      setCpfError('CPF inválido');
      return;
    }
    // Validar CEP se preenchido
    if (formData.addressCep && !validateCEP(formData.addressCep)) {
      setCepError('CEP inválido (formato: 00000-000)');
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
  };

  // Story 3.7 — "Criar mesmo assim" callback
  const handleCreateAnyway = () => {
    setShowDuplicateWarning(false);
    setDuplicateMatches([]);
    if (pendingSubmitEvent) {
      onSubmit(pendingSubmitEvent);
      setPendingSubmitEvent(null);
    }
  };

  // Story 3.7 — "Abrir contato existente" callback
  const handleOpenExisting = (contactId: string) => {
    setShowDuplicateWarning(false);
    setDuplicateMatches([]);
    setPendingSubmitEvent(null);
    onClose();
    router.push(`/contacts/${contactId}/cockpit`);
  };

  return (
    <FocusTrap active={isOpen} onEscape={onClose}>
      <div
        className="fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200">
          <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 id={headingId} className="text-lg font-bold text-slate-900 dark:text-white font-display">
                {editingContact ? 'Editar Contato' : 'Novo Contato'}
              </h2>
              <DebugFillButton onClick={fillWithFakeData} />
              {createFakeContactsBatch && (
                <DebugFillButton
                  onClick={async () => {
                    setIsCreatingBatch(true);
                    try {
                      await createFakeContactsBatch(10);
                      onClose();
                    } finally {
                      setIsCreatingBatch(false);
                    }
                  }}
                  label={isCreatingBatch ? 'Criando...' : 'Fake x10'}
                  variant="secondary"
                  className="ml-1"
                  disabled={isCreatingBatch}
                />
              )}
            </div>
            <div className="flex items-center gap-1">
              {editingContact && (
                <Button
                  onClick={handleOpenCockpit}
                  className="ml-2 text-slate-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                  title="Abrir Cockpit"
                  type="button"
                >
                  <Maximize2 size={22} />
                </Button>
              )}
              <Button
                onClick={onClose}
                aria-label="Fechar modal"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white focus-visible-ring rounded"
                type="button"
              >
                <X size={20} aria-hidden="true" />
              </Button>
            </div>
          </div>
        <form onSubmit={handleFormSubmit} className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Secao: Dados Basicos */}
          <fieldset className="space-y-3">
            <legend className={LEGEND_CLASS}>Dados Basicos</legend>
            <div>
              <label className={LABEL_CLASS}>Nome Completo</label>
              <input
                required
                type="text"
                className={INPUT_CLASS}
                placeholder="Ex: Ana Souza"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Email</label>
              <input
                required
                type="email"
                className={INPUT_CLASS}
                placeholder="ana@empresa.com"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Telefone</label>
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder="+5511999999999"
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Corretor Responsavel</label>
              <CorretorSelect
                value={formData.ownerId || editingContact?.ownerId || profile?.id}
                onChange={(id) => setFormData(prev => ({ ...prev, ownerId: id }))}
              />
            </div>

            {ownerChanged && activeDealsCount > 0 && (
              <label className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.cascadeDeals || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, cascadeDeals: e.target.checked }))}
                  className="mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm text-amber-800 dark:text-amber-200">
                  Reatribuir tambem os <strong>{activeDealsCount} deals ativos</strong> deste contato para o novo corretor?
                </span>
              </label>
            )}
          </fieldset>

          {/* Secao: Dados Pessoais (Story 3.1) */}
          <fieldset className="space-y-3">
            <legend className={LEGEND_CLASS}>Dados Pessoais</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLASS}>Tipo</label>
                <select
                  className={INPUT_CLASS}
                  value={formData.contactType}
                  onChange={e => setFormData(prev => ({ ...prev, contactType: e.target.value as ContactType }))}
                >
                  <option value="PF">Pessoa Fisica</option>
                  <option value="PJ">Pessoa Juridica</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS}>CPF</label>
                <input
                  type="text"
                  className={cpfError ? INPUT_ERROR_CLASS : INPUT_CLASS}
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={e => handleCPFChange(e.target.value)}
                  onBlur={handleCPFBlur}
                  maxLength={14}
                />
                {cpfError && (
                  <span className="text-xs text-red-500 mt-0.5 block">{cpfError}</span>
                )}
              </div>
            </div>
            <div>
              <label htmlFor={`${headingId}-birthDate`} className={LABEL_CLASS}>
                Data de Nascimento
              </label>
              <input
                id={`${headingId}-birthDate`}
                type="date"
                className={INPUT_CLASS}
                value={formData.birthDate}
                onChange={e => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor={`${headingId}-source`} className={LABEL_CLASS}>Origem</label>
              <select
                id={`${headingId}-source`}
                className={INPUT_CLASS}
                value={formData.source}
                onChange={e => setFormData(prev => ({ ...prev, source: e.target.value as ContactFormData['source'] }))}
              >
                <option value="">Selecione...</option>
                <option value="WEBSITE">Website</option>
                <option value="LINKEDIN">LinkedIn</option>
                <option value="REFERRAL">Indicacao</option>
                <option value="MANUAL">Manual</option>
              </select>
            </div>
          </fieldset>

          {/* Secao: Classificacao (Story 3.1) */}
          <fieldset className="space-y-3">
            <legend className={LEGEND_CLASS}>Classificacao</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLASS}>Perfil</label>
                <select
                  className={INPUT_CLASS}
                  value={formData.classification}
                  onChange={e => setFormData(prev => ({ ...prev, classification: e.target.value as ContactClassification | '' }))}
                >
                  <option value="">Selecione...</option>
                  <option value="COMPRADOR">Comprador</option>
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="LOCATARIO">Locatario</option>
                  <option value="LOCADOR">Locador</option>
                  <option value="INVESTIDOR">Investidor</option>
                  <option value="PERMUTANTE">Permutante</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS}>Temperatura</label>
                <select
                  className={INPUT_CLASS}
                  value={formData.temperature}
                  onChange={e => setFormData(prev => ({ ...prev, temperature: e.target.value as ContactTemperature }))}
                >
                  <option value="HOT">Quente (HOT)</option>
                  <option value="WARM">Morno (WARM)</option>
                  <option value="COLD">Frio (COLD)</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Secao: Endereco (Story 3.1) */}
          <fieldset className="space-y-3">
            <legend className={LEGEND_CLASS}>Endereco</legend>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={LABEL_CLASS}>CEP</label>
                <input
                  type="text"
                  className={cepError ? INPUT_ERROR_CLASS : INPUT_CLASS}
                  placeholder="00000-000"
                  value={formData.addressCep}
                  onChange={e => handleCEPChange(e.target.value)}
                  onBlur={handleCEPBlur}
                  maxLength={9}
                />
                {cepError && (
                  <span className="text-xs text-red-500 mt-0.5 block">{cepError}</span>
                )}
              </div>
              <div>
                <label className={LABEL_CLASS}>Cidade</label>
                <input
                  type="text"
                  className={INPUT_CLASS}
                  placeholder="Ex: Sao Paulo"
                  value={formData.addressCity}
                  onChange={e => setFormData(prev => ({ ...prev, addressCity: e.target.value }))}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>UF</label>
                <select
                  className={INPUT_CLASS}
                  value={formData.addressState}
                  onChange={e => setFormData(prev => ({ ...prev, addressState: e.target.value }))}
                >
                  <option value="">--</option>
                  {BRAZILIAN_STATES.map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Secao: Telefones (Story 3.1) */}
          <fieldset className="space-y-3">
            <legend className={LEGEND_CLASS}>
              <span className="flex items-center gap-2">
                <PhoneIcon size={14} />
                Telefones
              </span>
            </legend>
            {formData.phones.map((phone, index) => (
              <div key={phone.id} className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-black/10 rounded-lg border border-slate-200 dark:border-white/5">
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      className={INPUT_CLASS}
                      placeholder="+5511999999999"
                      value={phone.phoneNumber}
                      onChange={e => updatePhone(index, { phoneNumber: e.target.value })}
                    />
                    <select
                      className={INPUT_CLASS}
                      value={phone.phoneType}
                      onChange={e => updatePhone(index, { phoneType: e.target.value as PhoneType })}
                    >
                      <option value="CELULAR">Celular</option>
                      <option value="COMERCIAL">Comercial</option>
                      <option value="RESIDENCIAL">Residencial</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={phone.isWhatsapp}
                        onChange={e => updatePhone(index, { isWhatsapp: e.target.checked })}
                        className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                      />
                      WhatsApp
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="radio"
                        name="primaryPhone"
                        checked={phone.isPrimary}
                        onChange={() => updatePhone(index, { isPrimary: true })}
                        className="border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      Primario
                    </label>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => removePhone(index)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors mt-1"
                  aria-label="Remover telefone"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              onClick={addPhone}
              className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
            >
              <Plus size={14} />
              Adicionar telefone
            </Button>
          </fieldset>

          {/* Secao: Observacoes */}
          <fieldset className="space-y-3">
            <legend className={LEGEND_CLASS}>Observacoes</legend>
            <div>
              <textarea
                id={`${headingId}-notes`}
                aria-label="Observacoes"
                className={`${INPUT_CLASS} min-h-[80px] resize-y`}
                placeholder="Notas sobre o contato..."
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </fieldset>

          {/* Secao: Perfil de Interesse (Story 3.2 — somente edicao) */}
          {editingContact && editingContact.organizationId && (
            <ContactPreferencesSection
              contactId={editingContact.id}
              organizationId={editingContact.organizationId}
            />
          )}

          {/* Secao: Historico (somente edicao, read-only) */}
          {editingContact && (
            <fieldset className="space-y-3">
              <legend className={LEGEND_CLASS}>Historico</legend>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className={LABEL_CLASS}>Ultima Interacao</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {editingContact.lastInteraction
                      ? new Date(editingContact.lastInteraction).toLocaleDateString('pt-BR')
                      : '\u2014'}
                  </span>
                </div>
                <div>
                  <span className={LABEL_CLASS}>Ultima Compra</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {editingContact.lastPurchaseDate
                      ? new Date(editingContact.lastPurchaseDate).toLocaleDateString('pt-BR')
                      : '\u2014'}
                  </span>
                </div>
              </div>
              <div>
                <span className={LABEL_CLASS}>Valor Total (LTV)</span>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {editingContact.totalValue != null
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(editingContact.totalValue)
                    : 'R$ 0,00'}
                </span>
              </div>
            </fieldset>
          )}

          {/* Story 3.7 — Duplicate warning */}
          {showDuplicateWarning && duplicateMatches.length > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-sm">
                <span>Contato similar encontrado</span>
              </div>
              {duplicateMatches.map(match => (
                <div key={match.contact.id} className="p-3 bg-white dark:bg-black/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{match.contact.name}</span>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {match.contact.email && <span>{match.contact.email}</span>}
                        {match.contact.phone && <span> | {match.contact.phone}</span>}
                      </div>
                      <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        Match: {match.matchFields.join(', ')} (score: {match.score})
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleOpenExisting(match.contact.id)}
                      className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 hover:underline"
                    >
                      Abrir existente
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  onClick={handleCreateAnyway}
                  className="text-xs font-medium px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
                >
                  Criar mesmo assim
                </Button>
                <Button
                  type="button"
                  onClick={() => { setShowDuplicateWarning(false); setDuplicateMatches([]); setPendingSubmitEvent(null); }}
                  className="text-xs font-medium px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 rounded-lg mt-2 shadow-lg shadow-primary-600/20 transition-all"
          >
            {isSubmitting ? 'Criando...' : (editingContact ? 'Salvar Alteracoes' : 'Criar Contato')}
          </Button>
        </form>
        </div>
      </div>
    </FocusTrap>
  );
};
