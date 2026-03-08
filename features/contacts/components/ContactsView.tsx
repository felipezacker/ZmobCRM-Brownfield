import React from 'react';
import { Contact } from '@/types';
import { Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContactsViewProps {
  contacts: Contact[];
  isLoading: boolean;
  onSearch: (term: string) => void;
  onRefresh: () => void;
}

/**
 * Componente React `ContactsView`.
 *
 * @param {ContactsViewProps} { 
  contacts, 
  isLoading, 
  onSearch, 
  onRefresh 
} - Parâmetro `{ 
  contacts, 
  isLoading, 
  onSearch, 
  onRefresh 
}`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
export const ContactsView: React.FC<ContactsViewProps> = ({ 
  contacts, 
  isLoading, 
  onSearch, 
  onRefresh 
}) => {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Contatos (Gold Standard)</h1>
        <Button 
          onClick={onRefresh}
          className="p-2 hover:bg-muted dark:hover:bg-accent rounded-full transition-colors"
          disabled={isLoading}
        >
          <RefreshCw size={20} className={isLoading ?'animate-spin text-muted-foreground' : 'text-muted-foreground dark:text-muted-foreground'} />
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input 
          type="text"
          placeholder="Buscar por nome ou email..."
          className="w-full pl-10 p-3 rounded-lg border border-border dark:border-border bg-white dark:bg-card text-foreground focus:ring-2 focus:ring-primary-500 outline-none"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map(contact => (
            <div key={contact.id} className="p-4 bg-white dark:bg-card rounded-xl border border-border dark:border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  {(contact.name || '?').charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{contact.name || 'Sem nome'}</h3>
                  <p className="text-sm text-muted-foreground">{contact.email || '-'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
