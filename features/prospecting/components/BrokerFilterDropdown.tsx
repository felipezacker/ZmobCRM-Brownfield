import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Users, Search, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Profile {
  id: string
  name: string
  role?: string
}

interface BrokerFilterDropdownProps {
  profiles: Profile[]
  selectedId: string
  onSelect: (id: string) => void
}

export const BrokerFilterDropdown: React.FC<BrokerFilterDropdownProps> = ({ profiles, selectedId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const filtered = useMemo(() => {
    if (!search) return profiles
    const q = search.toLowerCase()
    return profiles.filter(p => p.name.toLowerCase().includes(q))
  }, [profiles, search])

  const selectedName = selectedId
    ? profiles.find(p => p.id === selectedId)?.name.split(' ')[0] || 'Corretor'
    : 'Todos'

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="unstyled"
        size="unstyled"
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          selectedId
            ? 'bg-primary-500 text-white shadow-sm'
            : 'bg-muted dark:bg-white/10 text-secondary-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-white/15'
        }`}
      >
        <Users size={12} />
        {selectedName}
        <ChevronDown size={10} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 w-56 bg-white dark:bg-card border border-border dark:border-border/50 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border dark:border-border/50">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted dark:bg-white/5">
              <Search size={12} className="text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar corretor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => { onSelect(''); setIsOpen(false); setSearch('') }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                !selectedId
                  ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 font-medium'
                  : 'text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5'
              }`}
            >
              <Users size={12} />
              Todos os corretores
            </Button>
            {filtered.map(p => (
              <Button
                key={p.id}
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={() => { onSelect(p.id); setIsOpen(false); setSearch('') }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                  selectedId === p.id
                    ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 font-medium'
                    : 'text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-3xs font-bold shrink-0 ${
                  selectedId === p.id
                    ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300'
                    : 'bg-accent dark:bg-accent text-muted-foreground'
                }`}>
                  {p.name.charAt(0).toUpperCase()}
                </span>
                {p.name}
              </Button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum corretor encontrado</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
