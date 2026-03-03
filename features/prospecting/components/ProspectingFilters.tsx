'use client'

import React from 'react'
import { Filter, X } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import {
  CLASSIFICATION_LABELS,
  SOURCE_LABELS,
  TEMPERATURE_CONFIG,
  STAGE_LABELS,
} from '@/features/contacts/constants'

const SELECT_CLASS =
  'bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white'

const INPUT_CLASS =
  'bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white w-20'

export interface ProspectingFiltersState {
  stages: string[]
  temperatures: string[]
  classifications: string[]
  source: string
  ownerId: string
  inactiveDays: number | null
}

export const INITIAL_FILTERS: ProspectingFiltersState = {
  stages: [],
  temperatures: [],
  classifications: [],
  source: '',
  ownerId: '',
  inactiveDays: null,
}

interface ProspectingFiltersProps {
  filters: ProspectingFiltersState
  onFiltersChange: (filters: ProspectingFiltersState) => void
  profiles: Array<{ id: string; name: string }>
  showOwnerFilter: boolean
  onApply: () => void
}

export const ProspectingFilters: React.FC<ProspectingFiltersProps> = ({
  filters,
  onFiltersChange,
  profiles,
  showOwnerFilter,
  onApply,
}) => {
  const hasAnyFilter =
    filters.stages.length > 0 ||
    filters.temperatures.length > 0 ||
    filters.classifications.length > 0 ||
    filters.source !== '' ||
    filters.ownerId !== '' ||
    filters.inactiveDays !== null

  const handleClear = () => {
    onFiltersChange(INITIAL_FILTERS)
  }

  const toggleMulti = (field: 'stages' | 'temperatures' | 'classifications', value: string) => {
    const current = filters[field]
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    onFiltersChange({ ...filters, [field]: next })
  }

  return (
    <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <Filter size={14} />
          Filtros de Prospecção
        </div>
        <div className="flex items-center gap-2">
          {hasAnyFilter && (
            <Button
              onClick={handleClear}
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
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-600 text-white transition-colors"
          >
            Aplicar Filtros
          </Button>
        </div>
      </div>

      {/* Row 1: Stage multi-select */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Estágio</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(STAGE_LABELS).map(([value, label]) => (
            <label
              key={value}
              className={`flex items-center gap-1.5 cursor-pointer text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                filters.stages.includes(value)
                  ? 'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-500/20 dark:text-primary-300 dark:border-primary-500/30'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-black/20 dark:text-slate-400 dark:border-white/10 dark:hover:border-white/20'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={filters.stages.includes(value)}
                onChange={() => toggleMulti('stages', value)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Row 2: Temperature multi-select */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Temperatura</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TEMPERATURE_CONFIG).map(([value, config]) => (
            <label
              key={value}
              className={`flex items-center gap-1.5 cursor-pointer text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                filters.temperatures.includes(value)
                  ? 'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-500/20 dark:text-primary-300 dark:border-primary-500/30'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-black/20 dark:text-slate-400 dark:border-white/10 dark:hover:border-white/20'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={filters.temperatures.includes(value)}
                onChange={() => toggleMulti('temperatures', value)}
              />
              {config.label}
            </label>
          ))}
        </div>
      </div>

      {/* Row 3: Classification multi-select */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Classificação</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CLASSIFICATION_LABELS).map(([value, label]) => (
            <label
              key={value}
              className={`flex items-center gap-1.5 cursor-pointer text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                filters.classifications.includes(value)
                  ? 'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-500/20 dark:text-primary-300 dark:border-primary-500/30'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-black/20 dark:text-slate-400 dark:border-white/10 dark:hover:border-white/20'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={filters.classifications.includes(value)}
                onChange={() => toggleMulti('classifications', value)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Row 4: Source + Owner + Inactive days */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Origem</label>
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
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Corretor</label>
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
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sem atividade há (dias)</label>
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
      </div>
    </div>
  )
}
