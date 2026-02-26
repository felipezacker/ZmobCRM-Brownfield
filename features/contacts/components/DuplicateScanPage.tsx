'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Search, GitMerge, Mail, Phone, CreditCard, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Contact } from '@/types';
import { scanDuplicates, DuplicateGroup } from '@/lib/supabase/contact-dedup';
import { ContactMergeModal } from './ContactMergeModal';
import { Button } from '@/app/components/ui/Button';

// ============================================
// Match type icons and labels
// ============================================
const MATCH_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  email: { icon: <Mail size={14} />, label: 'Email', color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20' },
  phone: { icon: <Phone size={14} />, label: 'Telefone', color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20' },
  cpf: { icon: <CreditCard size={14} />, label: 'CPF', color: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20' },
};

export const DuplicateScanPage: React.FC = () => {
  const router = useRouter();
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Merge modal state
  const [mergeContactA, setMergeContactA] = useState<Contact | null>(null);
  const [mergeContactB, setMergeContactB] = useState<Contact | null>(null);

  const loadDuplicates = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await scanDuplicates();
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setGroups(data || []);
    }
  }, []);

  useEffect(() => {
    loadDuplicates();
  }, [loadDuplicates]);

  const handleOpenMerge = (contactA: Contact, contactB: Contact) => {
    setMergeContactA(contactA);
    setMergeContactB(contactB);
  };

  const handleMergeComplete = () => {
    setMergeContactA(null);
    setMergeContactB(null);
    loadDuplicates();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.back()}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            type="button"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">
              Verificar Duplicatas
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Contatos com mesmo email, telefone ou CPF na organizacao
            </p>
          </div>
        </div>
        <Button
          onClick={loadDuplicates}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 rounded-lg transition-colors disabled:opacity-50"
          type="button"
        >
          <Search size={16} />
          {loading ? 'Escaneando...' : 'Escanear novamente'}
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-primary-500" />
          <span className="ml-3 text-slate-500 dark:text-slate-400">Buscando duplicatas...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          Erro ao buscar duplicatas: {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && groups.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">✓</div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Nenhuma duplicata encontrada</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sua base de contatos esta limpa!</p>
        </div>
      )}

      {/* Result count */}
      {!loading && groups.length > 0 && (
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {groups.length} possive{groups.length === 1 ? 'l' : 'is'} duplicata{groups.length === 1 ? '' : 's'} encontrada{groups.length === 1 ? '' : 's'}
        </div>
      )}

      {/* Groups */}
      {!loading && groups.map(group => {
        const matchCfg = MATCH_CONFIG[group.matchType] || MATCH_CONFIG.email;

        return (
          <div key={group.key} className="glass rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
            {/* Group header */}
            <div className="px-5 py-3 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${matchCfg.color}`}>
                  {matchCfg.icon}
                  {matchCfg.label}
                </span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {group.matchValue}
                </span>
                <span className="text-xs text-slate-400">
                  ({group.contacts.length} contatos)
                </span>
              </div>
              {group.contacts.length === 2 && (
                <Button
                  onClick={() => handleOpenMerge(group.contacts[0], group.contacts[1])}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                  type="button"
                >
                  <GitMerge size={14} />
                  Fazer Merge
                </Button>
              )}
            </div>

            {/* Contacts in group */}
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {group.contacts.map(contact => (
                <div key={contact.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 text-primary-700 dark:text-primary-200 flex items-center justify-center font-bold text-sm">
                      {(contact.name || '?').charAt(0)}
                    </span>
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white text-sm">{contact.name}</span>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        {contact.email && <span>{contact.email}</span>}
                        {contact.phone && <span>{contact.phone}</span>}
                        {contact.cpf && <span>CPF: {contact.cpf}</span>}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push(`/contacts/${contact.id}/cockpit`)}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                    type="button"
                  >
                    Abrir
                  </Button>
                </div>
              ))}
            </div>

            {/* For groups with 3+ contacts, allow selecting pairs */}
            {group.contacts.length > 2 && (
              <div className="px-5 py-2 border-t border-slate-200 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.01]">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Selecione 2 contatos para fazer merge. Grupos com 3+ contatos precisam ser resolvidos em pares.
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Merge Modal */}
      {mergeContactA && mergeContactB && (
        <ContactMergeModal
          isOpen={true}
          onClose={() => { setMergeContactA(null); setMergeContactB(null); }}
          contactA={mergeContactA}
          contactB={mergeContactB}
          onMergeComplete={handleMergeComplete}
        />
      )}
    </div>
  );
};
