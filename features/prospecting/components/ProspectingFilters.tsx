'use client'

import React, { useState, useRef, useMemo } from 'react'
import { Filter, Phone, X, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  CLASSIFICATION_LABELS,
  SOURCE_LABELS,
  TEMPERATURE_CONFIG,
  STAGE_LABELS,
} from '@/features/contacts/constants'

const SELECT_CLASS =
  'bg-white dark:bg-black/20 border border-border  rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 '

const INPUT_CLASS =
  'bg-white dark:bg-black/20 border border-border  rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500  w-20'

const CHIP_ACTIVE =
  'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-500/20 dark:text-primary-300 dark:border-primary-500/30'

const CHIP_INACTIVE =
  'bg-white text-secondary-foreground border-border hover:border-border dark:bg-black/20 dark:text-muted-foreground  dark:hover:border-white/20'

export interface ProspectingFiltersState {
  stages: string[]
  temperatures: string[]
  classifications: string[]
  tags: string[]
  source: string
  ownerId: string
  inactiveDays: number | null
  onlyWithPhone: boolean
}

export const INITIAL_FILTERS: ProspectingFiltersState = {
  stages: [],
  temperatures: [],
  classifications: [],
  tags: [],
  source: '',
  ownerId: '',
  inactiveDays: null,
  onlyWithPhone: false,
}

interface ProspectingFiltersProps {
  filters: ProspectingFiltersState
  onFiltersChange: (filters: ProspectingFiltersState) => void
  profiles: Array<{ id: string; name: string }>
  availableTags: string[]
  showOwnerFilter: boolean
  onApply: () => void
}

/** Reusable chip toggle for enum-based multi-selects */
const ChipRow: React.FC<{
  label: string
  options: Array<{ value: string; label: string }>
  selected: string[]
  onChange: (next: string[]) => void
}> = ({ label, options, selected, onChange }) => (
  <div>
    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{label}</label>
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = selected.includes(opt.value)
        return (
          <label
            key={opt.value}
            className={`flex items-center gap-1.5 cursor-pointer text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${active ? CHIP_ACTIVE : CHIP_INACTIVE}`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={active}
              onChange={() => onChange(
                active ? selected.filter(v => v !== opt.value) : [...selected, opt.value]
              )}
            />
            {opt.label}
          </label>
        )
      })}
    </div>
  </div>
)

/** Tags autocomplete with selected chips */
const TagsFilter: React.FC<{
  availableTags: string[]
  selected: string[]
  onChange: (next: string[]) => void
}> = ({ availableTags, selected, onChange }) => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => {
    const lower = query.toLowerCase()
    return availableTags
      .filter(t => !selected.includes(t) && t.toLowerCase().includes(lower))
  }, [availableTags, selected, query])

  const addTag = (tag: string) => {
    onChange([...selected, tag])
    setQuery('')
    setOpen(false)
  }

  const removeTag = (tag: string) => {
    onChange(selected.filter(t => t !== tag))
  }

  return (
    <div>
      <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Tags</label>

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-primary-100 text-primary-700 border border-primary-300 dark:bg-primary-500/20 dark:text-primary-300 dark:border-primary-500/30"
            >
              <Tag size={10} />
              {tag}
              <Button
                onClick={() => removeTag(tag)}
                className="ml-0.5 hover:text-primary-900 dark:hover:text-primary-100"
              >
                <X size={10} />
              </Button>
            </span>
          ))}
        </div>
      )}

      {/* Autocomplete input */}
      <div className="relative" ref={wrapperRef}>
        <input
          type="text"
          placeholder="Buscar tags..."
          className={`${SELECT_CLASS} w-48`}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 w-48 max-h-40 overflow-y-auto bg-white dark:bg-card border border-border rounded-lg shadow-lg py-1">
            {suggestions.map(tag => (
              <li key={tag}>
                <Button
                  variant="unstyled"
                  size="unstyled"
                  className="w-full text-left px-3 py-1.5 text-xs text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/10"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTag(tag)}
                >
                  {tag}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export const ProspectingFilters: React.FC<ProspectingFiltersProps> = ({
  filters,
  onFiltersChange,
  profiles,
  availableTags,
  showOwnerFilter,
  onApply,
}) => {
  const hasAnyFilter =
    filters.stages.length > 0 ||
    filters.temperatures.length > 0 ||
    filters.classifications.length > 0 ||
    filters.tags.length > 0 ||
    filters.source !== '' ||
    filters.ownerId !== '' ||
    filters.inactiveDays !== null ||
    filters.onlyWithPhone

  const stageOptions = useMemo(() =>
    Object.entries(STAGE_LABELS).map(([value, label]) => ({ value, label })), [])

  const tempOptions = useMemo(() =>
    Object.entries(TEMPERATURE_CONFIG).map(([value, config]) => ({ value, label: config.label })), [])

  const classOptions = useMemo(() =>
    Object.entries(CLASSIFICATION_LABELS).map(([value, label]) => ({ value, label })), [])

  return (
    <div className="bg-background dark:bg-white/5 border border-border rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-secondary-foreground dark:text-muted-foreground">
          <Filter size={14} />
          Filtros de Prospecção
        </div>
        <div className="flex items-center gap-2">
          {hasAnyFilter && (
            <Button
              onClick={() => onFiltersChange(INITIAL_FILTERS)}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1"
            >
              <X size={12} />
              Limpar
            </Button>
          )}
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={onApply}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary-500 hover:bg-primary-600 text-white transition-colors"
          >
            Aplicar Filtros
          </Button>
        </div>
      </div>

      <ChipRow label="Estágio" options={stageOptions} selected={filters.stages}
        onChange={(next) => onFiltersChange({ ...filters, stages: next })} />

      <ChipRow label="Temperatura" options={tempOptions} selected={filters.temperatures}
        onChange={(next) => onFiltersChange({ ...filters, temperatures: next })} />

      <ChipRow label="Classificação" options={classOptions} selected={filters.classifications}
        onChange={(next) => onFiltersChange({ ...filters, classifications: next })} />

      {/* Source + Owner + Inactive days + Tags */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Origem</label>
          <select
            className={SELECT_CLASS}
            value={filters.source}
            onChange={(e) => onFiltersChange({ ...filters, source: e.target.value })}
          >
            <option value="">Todas</option>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {showOwnerFilter && (
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Corretor</label>
            <select
              className={SELECT_CLASS}
              value={filters.ownerId}
              onChange={(e) => onFiltersChange({ ...filters, ownerId: e.target.value })}
            >
              <option value="">Todos</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Sem atividade há (dias)</label>
          <input
            type="number"
            min={1}
            max={365}
            placeholder="30"
            className={INPUT_CLASS}
            value={filters.inactiveDays ?? ''}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value, 10) : null
              onFiltersChange({ ...filters, inactiveDays: val })
            }}
          />
        </div>

        {availableTags.length > 0 && (
          <TagsFilter
            availableTags={availableTags}
            selected={filters.tags}
            onChange={(next) => onFiltersChange({ ...filters, tags: next })}
          />
        )}
      </div>

      {/* Phone toggle */}
      <label
        className={`inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
          filters.onlyWithPhone
            ? 'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-500/20 dark:text-primary-300 dark:border-primary-500/30'
            : CHIP_INACTIVE
        }`}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={filters.onlyWithPhone}
          onChange={(e) => onFiltersChange({ ...filters, onlyWithPhone: e.target.checked })}
        />
        <Phone size={12} />
        Só com telefone
      </label>
    </div>
  )
}
