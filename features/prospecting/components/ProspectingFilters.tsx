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
  'bg-white dark:bg-black/20 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500'

const INPUT_CLASS =
  'bg-white dark:bg-black/20 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 w-20'

const CHIP_ACTIVE =
  'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-500/20 dark:text-primary-300 dark:border-primary-500/30'

const CHIP_INACTIVE =
  'bg-white text-secondary-foreground border-border hover:border-border dark:bg-black/20 dark:text-muted-foreground dark:hover:border-white/20'

export interface ProspectingFiltersState {
  stages: string[]
  temperatures: string[]
  classifications: string[]
  tags: string[]
  sources: string[]
  dealOwnerIds: string[]
  contactListIds: string[]
  productIds: string[]
  inactiveDays: number | null
  onlyWithPhone: boolean
  hasActiveDeal: boolean | null
}

export const INITIAL_FILTERS: ProspectingFiltersState = {
  stages: [],
  temperatures: [],
  classifications: [],
  tags: [],
  sources: [],
  dealOwnerIds: [],
  contactListIds: [],
  productIds: [],
  inactiveDays: null,
  onlyWithPhone: false,
  hasActiveDeal: null,
}

/** Migrates old filter format (v1) to current shape */
export function migrateFilters(raw: Record<string, unknown>): ProspectingFiltersState {
  return {
    stages: (raw.stages as string[]) ?? [],
    temperatures: (raw.temperatures as string[]) ?? [],
    classifications: (raw.classifications as string[]) ?? [],
    tags: (raw.tags as string[]) ?? [],
    sources: Array.isArray(raw.sources) && (raw.sources as string[]).length > 0
      ? raw.sources as string[]
      : typeof raw.source === 'string' && raw.source.trim()
        ? [raw.source.trim()]
        : [],
    dealOwnerIds: Array.isArray(raw.dealOwnerIds) && (raw.dealOwnerIds as string[]).length > 0
      ? raw.dealOwnerIds as string[]
      : typeof raw.dealOwnerId === 'string' && raw.dealOwnerId.trim()
        ? [raw.dealOwnerId.trim()]
        : [],
    contactListIds: (raw.contactListIds as string[]) ?? [],
    productIds: (raw.productIds as string[]) ?? [],
    inactiveDays: (raw.inactiveDays as number) ?? null,
    onlyWithPhone: (raw.onlyWithPhone as boolean) ?? false,
    hasActiveDeal: (raw.hasActiveDeal as boolean | null) ?? null,
  }
}

interface ProspectingFiltersProps {
  filters: ProspectingFiltersState
  onFiltersChange: (filters: ProspectingFiltersState) => void
  profiles: Array<{ id: string; name: string }>
  contactLists: Array<{ id: string; name: string; color: string }>
  products: Array<{ id: string; name: string }>
  availableTags: string[]
  showCorretorFilter: boolean
  onApply: () => void
  onClose?: () => void
}

/** Multi-select dropdown for enum-based filters */
const MultiSelectDropdown: React.FC<{
  label: string
  options: Array<{ value: string; label: string }>
  selected: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}> = ({ label, options, selected, onChange, placeholder = 'Todos' }) => {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const displayText = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? options.find(o => o.value === selected[0])?.label || selected[0]
      : `${selected.length} selecionados`

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">{label}</label>
      <Button
        variant="unstyled"
        size="unstyled"
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={`${SELECT_CLASS} w-48 text-left flex items-center justify-between gap-1 ${
          selected.length > 0 ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        <span className="truncate text-sm">{displayText}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </Button>
      {open && (
        <div className="absolute z-20 mt-1 w-48 max-h-52 overflow-y-auto bg-white dark:bg-card border border-border rounded-lg shadow-lg py-1">
          {options.map(opt => {
            const active = selected.includes(opt.value)
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/10 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => onChange(
                    active ? selected.filter(v => v !== opt.value) : [...selected, opt.value]
                  )}
                  className="w-3.5 h-3.5 rounded border-border text-primary-500 focus:ring-1 focus:ring-primary-500"
                />
                {opt.label}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

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
  contactLists,
  products,
  availableTags,
  showCorretorFilter,
  onApply,
  onClose,
}) => {
  const hasAnyFilter =
    filters.stages.length > 0 ||
    filters.temperatures.length > 0 ||
    filters.classifications.length > 0 ||
    filters.tags.length > 0 ||
    filters.sources.length > 0 ||
    filters.dealOwnerIds.length > 0 ||
    filters.contactListIds.length > 0 ||
    filters.productIds.length > 0 ||
    filters.inactiveDays !== null ||
    filters.onlyWithPhone ||
    filters.hasActiveDeal !== null

  const stageOptions = useMemo(() =>
    Object.entries(STAGE_LABELS).map(([value, label]) => ({ value, label })), [])

  const tempOptions = useMemo(() =>
    Object.entries(TEMPERATURE_CONFIG).map(([value, config]) => ({ value, label: config.label })), [])

  const classOptions = useMemo(() =>
    Object.entries(CLASSIFICATION_LABELS).map(([value, label]) => ({ value, label })), [])

  const sourceOptions = useMemo(() =>
    Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label })), [])

  const listOptions = useMemo(() =>
    contactLists.map(l => ({ value: l.id, label: l.name })), [contactLists])

  const productOptions = useMemo(() =>
    products.map(p => ({ value: p.id, label: p.name })), [products])

  const corretorOptions = useMemo(() =>
    profiles.map(p => ({ value: p.id, label: p.name })), [profiles])

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
          {onClose && (
            <Button
              variant="unstyled"
              size="unstyled"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted dark:hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Fechar filtros"
            >
              <X size={16} />
            </Button>
          )}
        </div>
      </div>

      {/* Row 1: Perfil do contato */}
      <div className="flex flex-wrap gap-4 items-end">
        <MultiSelectDropdown label="Estágio" options={stageOptions} selected={filters.stages}
          onChange={(next) => onFiltersChange({ ...filters, stages: next })} placeholder="Todos" />

        <MultiSelectDropdown label="Temperatura" options={tempOptions} selected={filters.temperatures}
          onChange={(next) => onFiltersChange({ ...filters, temperatures: next })} placeholder="Todas" />

        <MultiSelectDropdown label="Classificação" options={classOptions} selected={filters.classifications}
          onChange={(next) => onFiltersChange({ ...filters, classifications: next })} placeholder="Todas" />

        <MultiSelectDropdown label="Origem" options={sourceOptions} selected={filters.sources}
          onChange={(next) => onFiltersChange({ ...filters, sources: next })} placeholder="Todas" />

        {availableTags.length > 0 && (
          <TagsFilter
            availableTags={availableTags}
            selected={filters.tags}
            onChange={(next) => onFiltersChange({ ...filters, tags: next })}
          />
        )}
      </div>

      {/* Row 2: Relacionamento */}
      <div className="flex flex-wrap gap-4 items-end">
        {listOptions.length > 0 && (
          <MultiSelectDropdown label="Lista" options={listOptions} selected={filters.contactListIds}
            onChange={(next) => onFiltersChange({ ...filters, contactListIds: next })} placeholder="Todas" />
        )}

        {productOptions.length > 0 && (
          <MultiSelectDropdown label="Produto" options={productOptions} selected={filters.productIds}
            onChange={(next) => onFiltersChange({ ...filters, productIds: next })} placeholder="Todos" />
        )}

        {showCorretorFilter && (
          <MultiSelectDropdown label="Corretor (negócios)" options={corretorOptions} selected={filters.dealOwnerIds}
            onChange={(next) => onFiltersChange({ ...filters, dealOwnerIds: next })} placeholder="Todos" />
        )}

        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Inativo há</label>
          <div className="flex items-center gap-1.5">
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
            <span className="text-xs text-muted-foreground">dias</span>
          </div>
        </div>
      </div>

      {/* Row 3: Toggles */}
      <div className="flex flex-wrap gap-2">
        <label
          className={`inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            filters.onlyWithPhone ? CHIP_ACTIVE : CHIP_INACTIVE
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

        <Button
          variant="unstyled"
          size="unstyled"
          type="button"
          onClick={() => onFiltersChange({
            ...filters,
            hasActiveDeal: filters.hasActiveDeal === true ? null : true,
          })}
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            filters.hasActiveDeal === true ? CHIP_ACTIVE : CHIP_INACTIVE
          }`}
        >
          Com negócio ativo
          {filters.hasActiveDeal === true && <X size={10} className="ml-0.5" />}
        </Button>

        <Button
          variant="unstyled"
          size="unstyled"
          type="button"
          onClick={() => onFiltersChange({
            ...filters,
            hasActiveDeal: filters.hasActiveDeal === false ? null : false,
          })}
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            filters.hasActiveDeal === false ? CHIP_ACTIVE : CHIP_INACTIVE
          }`}
        >
          Sem negócio ativo
          {filters.hasActiveDeal === false && <X size={10} className="ml-0.5" />}
        </Button>
      </div>
    </div>
  )
}
