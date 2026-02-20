import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Contact } from '@/types';
import { contactsService } from '@/lib/supabase';
import { useAuth } from '../AuthContext';
import { queryKeys } from '@/lib/query';
import {
  useContacts as useTanStackContacts,
} from '@/lib/query/hooks/useContactsQuery';

interface ContactsContextType {
  // Contacts
  contacts: Contact[];
  contactsLoading: boolean;
  contactsError: string | null;
  addContact: (contact: Omit<Contact, 'id' | 'createdAt'>) => Promise<Contact | null>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;

  // Lookup maps (O(1) access)
  contactMap: Record<string, Contact>;

  // Derived data
  leadsFromContacts: Contact[];

  // Refresh
  refreshContacts: () => Promise<void>;
}

const ContactsContext = createContext<ContactsContextType | undefined>(undefined);

/**
 * Componente React `ContactsProvider`.
 *
 * @param {{ children: ReactNode; }} { children } - Parâmetro `{ children }`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
export const ContactsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // ============================================
  // TanStack Query como fonte única de verdade
  // ============================================
  const {
    data: contacts = [],
    isLoading: contactsLoading,
    error: contactsQueryError
  } = useTanStackContacts();

  // Converte erros do TanStack Query para string
  const contactsError = contactsQueryError ? (contactsQueryError as Error).message : null;

  // Refresh = invalidar cache do TanStack Query
  const refreshContacts = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
  }, [queryClient]);

  // ============================================
  // CRUD Operations - Usam service + invalidam cache
  // ============================================
  const addContact = useCallback(
    async (contact: Omit<Contact, 'id' | 'createdAt'>): Promise<Contact | null> => {
      if (!profile) {
        console.error('Usuário não autenticado');
        return null;
      }

      const { data, error } = await contactsService.create(contact);

      if (error) {
        console.error('Erro ao criar contato:', error.message);
        return null;
      }

      // Invalida cache para TanStack Query atualizar
      await queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });

      return data;
    },
    [profile, queryClient]
  );

  const updateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
    const { error } = await contactsService.update(id, updates);

    if (error) {
      console.error('Erro ao atualizar contato:', error.message);
      return;
    }

    // Invalida cache para TanStack Query atualizar
    await queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
  }, [queryClient]);

  const deleteContact = useCallback(async (id: string) => {
    const { error } = await contactsService.delete(id);

    if (error) {
      console.error('Erro ao deletar contato:', error.message);
      return;
    }

    // Invalida cache para TanStack Query atualizar
    await queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
  }, [queryClient]);

  // Hash Maps para O(1) lookups
  const contactMap = useMemo(() => {
    return contacts.reduce(
      (acc, c) => {
        acc[c.id] = c;
        return acc;
      },
      {} as Record<string, Contact>
    );
  }, [contacts]);

  // Contacts filtrados por stage = LEAD
  const leadsFromContacts = useMemo(() => {
    return contacts.filter(c => c.stage === 'LEAD');
  }, [contacts]);

  const value = useMemo(
    () => ({
      contacts,
      contactsLoading,
      contactsError,
      addContact,
      updateContact,
      deleteContact,
      contactMap,
      leadsFromContacts,
      refreshContacts,
    }),
    [
      contacts,
      contactsLoading,
      contactsError,
      addContact,
      updateContact,
      deleteContact,
      contactMap,
      leadsFromContacts,
      refreshContacts,
    ]
  );

  return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>;
};

/**
 * Hook React `useContacts` que encapsula uma lógica reutilizável.
 * @returns {ContactsContextType} Retorna um valor do tipo `ContactsContextType`.
 */
export const useContacts = () => {
  const context = useContext(ContactsContext);
  if (context === undefined) {
    throw new Error('useContacts must be used within a ContactsProvider');
  }
  return context;
};
