import React, { useState, useMemo } from 'react'
import { User, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

interface Profile {
  id: string
  name: string
  role?: string
}

interface BrokerFilterDropdownProps {
  profiles: Profile[]
  selectedId: string
  onSelect: (id: string) => void
  /** Show "Minha fila" option (queue context) */
  showMineOption?: boolean
  /** Label for the "all" option */
  allLabel?: string
  /** Label for the "mine" option */
  mineLabel?: string
}

export const BrokerFilterDropdown: React.FC<BrokerFilterDropdownProps> = ({
  profiles,
  selectedId,
  onSelect,
  showMineOption = false,
  allLabel = 'Todos os Corretores',
  mineLabel = 'Minha Fila',
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return profiles
    const q = search.toLowerCase()
    return profiles.filter(p => p.name.toLowerCase().includes(q))
  }, [profiles, search])

  const displayName = (() => {
    if (!selectedId || selectedId === '__all__') return allLabel
    if (selectedId === '' && showMineOption) return mineLabel
    const found = profiles.find(p => p.id === selectedId)
    return found ? found.name : allLabel
  })()

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch('') }}>
      <PopoverTrigger asChild>
        <Button
          aria-label="Filtrar por corretor"
          className="pl-3 pr-2 py-2 rounded-lg border border-border bg-white/50 dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-primary-500 backdrop-blur-sm cursor-pointer flex items-center gap-1.5 min-w-[140px]"
        >
          <User size={14} className="text-muted-foreground shrink-0" />
          <span className="truncate flex-1 text-left">{displayName}</span>
          <ChevronDown size={12} className="text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-2 border-b border-border">
          <input
            type="text"
            placeholder="Buscar corretor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1.5 text-sm rounded border border-border bg-white/50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
        </div>
        <div className="max-h-48 overflow-y-auto p-1">
          <Button
            type="button"
            onClick={() => { onSelect(showMineOption ? '__all__' : ''); setOpen(false) }}
            className={`w-full justify-start text-left px-3 py-2 text-sm rounded hover:bg-muted transition-colors ${
              (!selectedId || selectedId === '__all__') && !(selectedId === '' && showMineOption)
                ? 'font-semibold bg-muted' : ''
            }`}
          >
            {allLabel}
          </Button>
          {showMineOption && (
            <Button
              type="button"
              onClick={() => { onSelect(''); setOpen(false) }}
              className={`w-full justify-start text-left px-3 py-2 text-sm rounded hover:bg-muted transition-colors ${
                selectedId === '' ? 'font-semibold bg-muted' : ''
              }`}
            >
              {mineLabel}
            </Button>
          )}
          {filtered.length > 0 && <div className="h-px bg-border my-1" />}
          {filtered.map(p => (
            <Button
              key={p.id}
              type="button"
              onClick={() => { onSelect(p.id); setOpen(false) }}
              className={`w-full justify-start text-left px-3 py-2 text-sm rounded hover:bg-muted transition-colors ${
                selectedId === p.id ? 'font-semibold bg-muted' : ''
              }`}
            >
              {p.name}
            </Button>
          ))}
          {filtered.length === 0 && search && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
