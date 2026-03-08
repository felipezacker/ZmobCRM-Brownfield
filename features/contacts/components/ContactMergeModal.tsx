import React, { useState, useCallback } from 'react';
import { X, GitMerge, ArrowRight, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Contact } from '@/types';
import { mergeContacts } from '@/lib/supabase/contact-dedup';
import { useAuth } from '@/context/AuthContext';
import { FocusTrap } from '@/lib/a11y';
import { Button } from '@/components/ui/button';
import { MODAL_OVERLAY_CLASS } from '@/components/ui/modalStyles';
import { formatCPF } from '@/lib/validations/cpf-cep';

// ============================================
// Fields to compare
// ============================================
interface MergeField {
  key: string;
  label: string;
  render: (contact: Contact) => string;
}

const MERGE_FIELDS: MergeField[] = [
  { key: 'name', label: 'Nome', render: c => c.name || '' },
  { key: 'email', label: 'Email', render: c => c.email || '' },
  { key: 'phone', label: 'Telefone', render: c => c.phone || '' },
  { key: 'cpf', label: 'CPF', render: c => c.cpf ? formatCPF(c.cpf) : '' },
  { key: 'classification', label: 'Classificacao', render: c => c.classification || '' },
  { key: 'temperature', label: 'Temperatura', render: c => c.temperature || '' },
  { key: 'contactType', label: 'Tipo', render: c => c.contactType || '' },
  { key: 'source', label: 'Origem', render: c => c.source || '' },
  { key: 'addressCep', label: 'CEP', render: c => c.addressCep || '' },
  { key: 'addressCity', label: 'Cidade', render: c => c.addressCity || '' },
  { key: 'addressState', label: 'UF', render: c => c.addressState || '' },
  { key: 'notes', label: 'Notas', render: c => c.notes || '' },
  { key: 'birthDate', label: 'Nascimento', render: c => c.birthDate ? new Date(c.birthDate).toLocaleDateString('pt-BR') : '' },
];

// ============================================
// Props
// ============================================
interface ContactMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactA: Contact;
  contactB: Contact;
  onMergeComplete?: () => void;
}

export const ContactMergeModal: React.FC<ContactMergeModalProps> = ({
  isOpen,
  onClose,
  contactA,
  contactB,
  onMergeComplete,
}) => {
  const router = useRouter();
  const { profile } = useAuth();
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track which contact's value to use for each field: 'A' or 'B'
  const [selections, setSelections] = useState<Record<string, 'A' | 'B'>>(() => {
    const initial: Record<string, 'A' | 'B'> = {};
    for (const field of MERGE_FIELDS) {
      // Default: prefer A (first contact) if has value, else B
      const aVal = field.render(contactA);
      initial[field.key] = aVal ? 'A' : 'B';
    }
    return initial;
  });

  // Winner is always A, loser is always B.
  // Fields selected from B will be copied to A.
  const handleMerge = useCallback(async () => {
    if (!profile) return;
    setIsMerging(true);
    setError(null);

    const fieldsFromLoser: string[] = [];
    for (const field of MERGE_FIELDS) {
      if (selections[field.key] === 'B') {
        fieldsFromLoser.push(field.key);
      }
    }

    const { error: mergeErr } = await mergeContacts(
      contactA.id,
      contactB.id,
      fieldsFromLoser,
      profile.id,
      [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Usuario'
    );

    setIsMerging(false);

    if (mergeErr) {
      setError(mergeErr.message);
      return;
    }

    onMergeComplete?.();
    onClose();
    router.push(`/contacts?cockpit=${contactA.id}`);
  }, [contactA, contactB, selections, profile, onClose, onMergeComplete, router]);

  if (!isOpen) return null;

  // Build preview of merged result
  const previewValues: Record<string, string> = {};
  for (const field of MERGE_FIELDS) {
    const source = selections[field.key] === 'A' ? contactA : contactB;
    previewValues[field.key] = field.render(source);
  }

  return (
    <FocusTrap active={isOpen} onEscape={onClose}>
      <div
        className={MODAL_OVERLAY_CLASS}
        role="dialog"
        aria-modal="true"
        aria-label="Merge de contatos"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white dark:bg-dark-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-5 border-b border-border flex justify-between items-center">
            <div className="flex items-center gap-2">
              <GitMerge size={20} className="text-primary-600" />
              <h2 className="text-lg font-bold text-foreground font-display">
                Merge de Contatos
              </h2>
            </div>
            <Button onClick={onClose} className="text-muted-foreground hover:text-secondary-foreground dark:hover:text-white" type="button">
              <X size={20} />
            </Button>
          </div>

          {/* Body */}
          <div className="p-5 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {/* Column headers */}
            <div className="grid grid-cols-[140px_1fr_40px_1fr] gap-2 mb-3 text-xs font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
              <div>Campo</div>
              <div className="text-center">Contato A — {contactA.name}</div>
              <div />
              <div className="text-center">Contato B — {contactB.name}</div>
            </div>

            {/* Field rows */}
            <div className="space-y-1">
              {MERGE_FIELDS.map(field => {
                const valA = field.render(contactA);
                const valB = field.render(contactB);
                const selA = selections[field.key] === 'A';
                const selB = selections[field.key] === 'B';
                const bothEmpty = !valA && !valB;

                return (
                  <div key={field.key} className="grid grid-cols-[140px_1fr_40px_1fr] gap-2 items-center py-1.5">
                    <span className="text-xs font-medium text-secondary-foreground dark:text-muted-foreground">{field.label}</span>

                    {/* Contact A value */}
                    <Button
                      type="button"
                      onClick={() => !bothEmpty && setSelections(p => ({ ...p, [field.key]: 'A' }))}
                      disabled={bothEmpty}
                      className={`text-left text-sm px-3 py-1.5 rounded-lg border transition-all ${
                        selA
                          ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-500/50 ring-1 ring-primary-300 dark:ring-primary-500/30'
                          : 'border-border  hover:border-border dark:hover:border-white/20'
                      } ${!valA ? 'text-muted-foreground italic' : 'text-foreground dark:text-muted-foreground'}`}
                    >
                      <div className="flex items-center gap-2">
                        {selA && <Check size={14} className="text-primary-500 flex-shrink-0" />}
                        <span className="truncate">{valA || '(vazio)'}</span>
                      </div>
                    </Button>

                    <ArrowRight size={16} className="text-muted-foreground mx-auto" />

                    {/* Contact B value */}
                    <Button
                      type="button"
                      onClick={() => !bothEmpty && setSelections(p => ({ ...p, [field.key]: 'B' }))}
                      disabled={bothEmpty}
                      className={`text-left text-sm px-3 py-1.5 rounded-lg border transition-all ${
                        selB
                          ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-500/50 ring-1 ring-primary-300 dark:ring-primary-500/30'
                          : 'border-border  hover:border-border dark:hover:border-white/20'
                      } ${!valB ? 'text-muted-foreground italic' : 'text-foreground dark:text-muted-foreground'}`}
                    >
                      <div className="flex items-center gap-2">
                        {selB && <Check size={14} className="text-primary-500 flex-shrink-0" />}
                        <span className="truncate">{valB || '(vazio)'}</span>
                      </div>
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Preview */}
            <div className="mt-6 p-4 bg-background dark:bg-black/10 rounded-xl border border-border">
              <h3 className="text-sm font-bold text-secondary-foreground dark:text-muted-foreground mb-3">Preview do resultado</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {MERGE_FIELDS.map(f => (
                  <div key={f.key} className="flex gap-2">
                    <span className="text-muted-foreground dark:text-muted-foreground w-24 flex-shrink-0">{f.label}:</span>
                    <span className="text-foreground dark:text-muted-foreground font-medium truncate">
                      {previewValues[f.key] || '(vazio)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg text-xs text-amber-800 dark:text-amber-300">
              <strong>Atencao:</strong> O merge transferira todos os deals, telefones e preferencias do Contato B para o Contato A.
              O Contato B sera desativado (soft delete). Esta acao nao pode ser desfeita facilmente.
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-border flex justify-end gap-3">
            <Button
              onClick={onClose}
              type="button"
              className="px-4 py-2 text-sm font-medium text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMerge}
              disabled={isMerging}
              type="button"
              className="px-4 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-500 rounded-lg shadow-lg shadow-primary-600/20 transition-all disabled:opacity-50"
            >
              {isMerging ? 'Unificando...' : 'Confirmar Merge'}
            </Button>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
};
