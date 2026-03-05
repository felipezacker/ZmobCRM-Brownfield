import React, { useState } from 'react'
import { Search, Plus, Phone, User } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { useProspectingContacts } from '../hooks/useProspectingContacts'

interface AddToQueueSearchProps {
  onAdd: (contactId: string) => void
}

export const AddToQueueSearch: React.FC<AddToQueueSearchProps> = ({ onAdd }) => {
  const [search, setSearch] = useState('')
  const { data: contacts = [], isLoading } = useProspectingContacts(search)

  return (
    <div className="space-y-2">
      {/* Search input */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar contato por nome ou email..."
          className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
        />
      </div>

      {/* Results */}
      {search.length >= 2 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-center text-xs text-slate-400">Buscando...</div>
          ) : contacts.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">Nenhum contato encontrado</div>
          ) : (
            contacts.map(contact => (
              <div
                key={contact.id}
                className="flex items-center gap-3 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <User size={14} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {contact.name}
                  </p>
                  <div className="flex items-center gap-2">
                    {contact.primaryPhone && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                        <Phone size={9} />
                        {contact.primaryPhone}
                      </span>
                    )}
                    {contact.stage && (
                      <span className="text-[10px] text-slate-400">{contact.stage}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="unstyled"
                  size="unstyled"
                  onClick={() => {
                    onAdd(contact.id)
                    setSearch('')
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500/20 transition-colors"
                >
                  <Plus size={12} />
                  Adicionar
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
