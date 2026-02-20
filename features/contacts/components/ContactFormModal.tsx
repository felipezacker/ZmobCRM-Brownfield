import React, { useId, useState, useCallback } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Contact } from '@/types';
import { DebugFillButton } from '@/components/debug/DebugFillButton';
import { fakeContact } from '@/lib/debug';
import { FocusTrap, useFocusReturn } from '@/lib/a11y';
import { CorretorSelect } from '@/components/ui/CorretorSelect';
import { useAuth } from '@/context/AuthContext';
import { useActiveDealsCount } from '@/hooks/useReassignContactWithDeals';
import { createClient } from '@/lib/supabase/client';

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  ownerId: string | undefined;
  cascadeDeals: boolean;
  birthDate: string;
  source: '' | 'WEBSITE' | 'LINKEDIN' | 'REFERRAL' | 'MANUAL';
  notes: string;
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

/**
 * Componente React `ContactFormModal`.
 *
 * @param {ContactFormModalProps} {
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingContact,
} - Parâmetro `{
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingContact,
}`.
 * @returns {Element | null} Retorna um valor do tipo `Element | null`.
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

  const ownerChanged = editingContact && formData.ownerId && formData.ownerId !== editingContact.ownerId;

  const handleOpenCockpit = useCallback(async () => {
    if (!editingContact) return;
    const supabase = createClient()!;
    const { data } = await supabase
      .from('deals')
      .select('id')
      .eq('contact_id', editingContact.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    onClose();
    if (data?.id) {
      router.push(`/deals/${data.id}/cockpit`);
    } else {
      router.push(`/contacts/${editingContact.id}/cockpit`);
    }
  }, [editingContact, onClose, router]);

  React.useEffect(() => {
    if (isOpen && editingContact?.id) {
      fetchCount().then(setActiveDealsCount);
    } else {
      setActiveDealsCount(0);
    }
  }, [isOpen, editingContact?.id, fetchCount]);

  if (!isOpen) return null;

  const fillWithFakeData = () => {
    const fake = fakeContact();
    setFormData({
      name: fake.name,
      email: fake.email,
      phone: fake.phone,
      ownerId: formData.ownerId,
      cascadeDeals: formData.cascadeDeals,
      birthDate: '1990-05-15',
      source: 'MANUAL',
      notes: 'Contato de teste gerado automaticamente',
    });
  };

  return (
    <FocusTrap active={isOpen} onEscape={onClose}>
      <div 
        className="fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(e) => {
          // Close only when clicking the backdrop (outside the panel).
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
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
                <button
                  onClick={handleOpenCockpit}
                  className="ml-2 text-slate-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                  title="Abrir Cockpit"
                  type="button"
                >
                  <Maximize2 size={22} />
                </button>
              )}
              <button
                onClick={onClose}
                aria-label="Fechar modal"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white focus-visible-ring rounded"
                type="button"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
        <form onSubmit={onSubmit} className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Seção: Dados Básicos */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Dados Básicos</legend>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Nome Completo
              </label>
              <input
                required
                type="text"
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ex: Ana Souza"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
              <input
                required
                type="email"
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="ana@empresa.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Telefone
              </label>
              <input
                type="text"
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="+5511999999999"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Corretor Responsável
              </label>
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
                  onChange={(e) => setFormData({ ...formData, cascadeDeals: e.target.checked })}
                  className="mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm text-amber-800 dark:text-amber-200">
                  Reatribuir também os <strong>{activeDealsCount} deals ativos</strong> deste contato para o novo corretor?
                </span>
              </label>
            )}
          </fieldset>

          {/* Seção: Informações Pessoais */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Informações Pessoais</legend>
            <div>
              <label htmlFor={`${headingId}-birthDate`} className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Data de Nascimento
              </label>
              <input
                id={`${headingId}-birthDate`}
                type="date"
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                value={formData.birthDate}
                onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor={`${headingId}-source`} className="block text-xs font-bold text-slate-500 uppercase mb-1">Origem</label>
              <select
                id={`${headingId}-source`}
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                value={formData.source}
                onChange={e => setFormData({ ...formData, source: e.target.value as ContactFormData['source'] })}
              >
                <option value="">Selecione...</option>
                <option value="WEBSITE">Website</option>
                <option value="LINKEDIN">LinkedIn</option>
                <option value="REFERRAL">Indicação</option>
                <option value="MANUAL">Manual</option>
              </select>
            </div>
          </fieldset>

          {/* Seção: Observações */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Observações</legend>
            <div>
              <textarea
                id={`${headingId}-notes`}
                aria-label="Observações"
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px] resize-y"
                placeholder="Notas sobre o contato..."
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </fieldset>

          {/* Seção: Histórico (somente edição, read-only) */}
          {editingContact && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Histórico</legend>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Última Interação</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {editingContact.lastInteraction
                      ? new Date(editingContact.lastInteraction).toLocaleDateString('pt-BR')
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Última Compra</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {editingContact.lastPurchaseDate
                      ? new Date(editingContact.lastPurchaseDate).toLocaleDateString('pt-BR')
                      : '—'}
                  </span>
                </div>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor Total (LTV)</span>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {editingContact.totalValue != null
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(editingContact.totalValue)
                    : 'R$ 0,00'}
                </span>
              </div>
            </fieldset>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 rounded-lg mt-2 shadow-lg shadow-primary-600/20 transition-all"
          >
            {isSubmitting ? 'Criando...' : (editingContact ? 'Salvar Alterações' : 'Criar Contato')}
          </button>
        </form>
        </div>
      </div>
    </FocusTrap>
  );
};
