'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Phone, User } from 'lucide-react';
import { useContact } from '@/lib/query/hooks/useContactsQuery';
import { Button } from '@/app/components/ui/Button';

interface ContactCockpitClientProps {
  contactId: string;
}

export default function ContactCockpitClient({ contactId }: ContactCockpitClientProps) {
  const router = useRouter();
  const { data: contact, isLoading } = useContact(contactId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400">Contato não encontrado.</p>
        <Button
          onClick={() => router.back()}
          className="mt-4 text-primary-500 hover:underline"
        >
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => router.back()}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            {contact.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cockpit do Contato
          </p>
        </div>
      </div>

      {/* Dados Básicos */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Dados Básicos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <User size={16} className="text-slate-400" />
            <div>
              <span className="block text-xs text-slate-500 uppercase">Nome</span>
              <span className="text-sm text-slate-900 dark:text-white">{contact.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail size={16} className="text-slate-400" />
            <div>
              <span className="block text-xs text-slate-500 uppercase">Email</span>
              <span className="text-sm text-slate-900 dark:text-white">{contact.email || '—'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-slate-400" />
            <div>
              <span className="block text-xs text-slate-500 uppercase">Telefone</span>
              <span className="text-sm text-slate-900 dark:text-white">{contact.phone || '—'}</span>
            </div>
          </div>
          <div>
            <span className="block text-xs text-slate-500 uppercase">Estágio</span>
            <span className="text-sm text-slate-900 dark:text-white">{contact.stage || '—'}</span>
          </div>
          <div>
            <span className="block text-xs text-slate-500 uppercase">Status</span>
            <span className="text-sm text-slate-900 dark:text-white">{contact.status || '—'}</span>
          </div>
        </div>
      </div>

      {/* Placeholder */}
      <div className="bg-slate-50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl p-8 text-center">
        <p className="text-slate-400 dark:text-slate-500 text-sm">
          Conteúdo completo do cockpit será implementado em stories futuras.
        </p>
      </div>
    </div>
  );
}
