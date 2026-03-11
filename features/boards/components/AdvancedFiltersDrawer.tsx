import React, { useCallback, useMemo } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/button';

interface AdvancedFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  dealTypeFilter: string[];
  setDealTypeFilter: (v: string[]) => void;
  valueRange: { min: number | null; max: number | null };
  setValueRange: (v: { min: number | null; max: number | null }) => void;
  closeDateFilter: { start: string; end: string };
  setCloseDateFilter: (v: { start: string; end: string }) => void;
  productFilter: string[];
  setProductFilter: (v: string[]) => void;
  tagFilter: string[];
  setTagFilter: (v: string[]) => void;
  probabilityRange: { min: number; max: number };
  setProbabilityRange: (v: { min: number; max: number }) => void;
  clearAdvancedFilters: () => void;
  uniqueProducts: string[];
  uniqueTags: string[];
}

const DEAL_TYPES = [
  { value: 'VENDA', label: 'Venda' },
  { value: 'LOCACAO', label: 'Locação' },
  { value: 'PERMUTA', label: 'Permuta' },
];

const CLOSE_DATE_SHORTCUTS = [
  { label: 'Este mês', getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return { start, end };
  }},
  { label: 'Próximo mês', getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split('T')[0];
    return { start, end };
  }},
];

function ChipGroup({ options, selected, onChange }: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = useCallback((value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter(v => v !== value)
        : [...selected, value]
    );
  }, [selected, onChange]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => {
        const isActive = selected.includes(opt.value);
        return (
          <Button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
              isActive
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-muted dark:bg-white/5 text-muted-foreground border-border hover:border-primary-400'
            }`}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}

export function AdvancedFiltersDrawer({
  isOpen, onClose,
  dealTypeFilter, setDealTypeFilter,
  valueRange, setValueRange,
  closeDateFilter, setCloseDateFilter,
  productFilter, setProductFilter,
  tagFilter, setTagFilter,
  probabilityRange, setProbabilityRange,
  clearAdvancedFilters,
  uniqueProducts, uniqueTags,
}: AdvancedFiltersDrawerProps) {
  const productOptions = useMemo(
    () => uniqueProducts.map(p => ({ value: p, label: p })),
    [uniqueProducts]
  );
  const tagOptions = useMemo(
    () => uniqueTags.map(t => ({ value: t, label: t })),
    [uniqueTags]
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} ariaLabel="Filtros Avançados">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border bg-white dark:bg-dark-card">
        <h2 className="text-sm font-semibold text-foreground">Filtros Avançados</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Fechar filtros"
          className="h-7 w-7 rounded-md"
        >
          <X size={16} />
        </Button>
      </div>

      {/* Filter sections */}
      <div className="p-4 space-y-5">
        {/* 1. Tipo de Negócio */}
        <section>
          <label className="block text-xs font-medium text-muted-foreground mb-2">Tipo de Negócio</label>
          <ChipGroup options={DEAL_TYPES} selected={dealTypeFilter} onChange={setDealTypeFilter} />
        </section>

        {/* 2. Range de Valor */}
        <section>
          <label className="block text-xs font-medium text-muted-foreground mb-2">Valor (R$)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Mín"
              aria-label="Valor mínimo"
              value={valueRange.min ?? ''}
              onChange={e => setValueRange({ ...valueRange, min: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-border bg-white/50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-xs text-muted-foreground shrink-0">até</span>
            <input
              type="number"
              placeholder="Máx"
              aria-label="Valor máximo"
              value={valueRange.max ?? ''}
              onChange={e => setValueRange({ ...valueRange, max: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-border bg-white/50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </section>

        {/* 3. Previsão de Fechamento */}
        <section>
          <label className="block text-xs font-medium text-muted-foreground mb-2">Previsão de Fechamento</label>
          <div className="flex gap-1.5 mb-2">
            {CLOSE_DATE_SHORTCUTS.map(shortcut => {
              const val = shortcut.getValue();
              const isActive = closeDateFilter.start === val.start && closeDateFilter.end === val.end;
              return (
                <Button
                  key={shortcut.label}
                  type="button"
                  onClick={() => setCloseDateFilter(isActive ? { start: '', end: '' } : val)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-muted dark:bg-white/5 text-muted-foreground border-border hover:border-primary-400'
                  }`}
                >
                  {shortcut.label}
                </Button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={closeDateFilter.start}
              onChange={e => setCloseDateFilter({ ...closeDateFilter, start: e.target.value })}
              aria-label="Data início previsão"
              className="w-full px-2 py-1.5 text-xs rounded-lg border border-border bg-white/50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-xs text-muted-foreground shrink-0">até</span>
            <input
              type="date"
              value={closeDateFilter.end}
              onChange={e => setCloseDateFilter({ ...closeDateFilter, end: e.target.value })}
              aria-label="Data fim previsão"
              className="w-full px-2 py-1.5 text-xs rounded-lg border border-border bg-white/50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </section>

        {/* 4. Produto */}
        <section>
          <label className="block text-xs font-medium text-muted-foreground mb-2">Produto</label>
          {productOptions.length > 0 ? (
            <ChipGroup options={productOptions} selected={productFilter} onChange={setProductFilter} />
          ) : (
            <p className="text-xs text-muted-foreground italic">Nenhum produto encontrado</p>
          )}
        </section>

        {/* 5. Tags do Contato */}
        <section>
          <label className="block text-xs font-medium text-muted-foreground mb-2">Tags do Contato</label>
          {tagOptions.length > 0 ? (
            <ChipGroup options={tagOptions} selected={tagFilter} onChange={setTagFilter} />
          ) : (
            <p className="text-xs text-muted-foreground italic">Nenhuma tag encontrada</p>
          )}
        </section>

        {/* 6. Probabilidade */}
        <section>
          <label className="block text-xs font-medium text-muted-foreground mb-2">
            Probabilidade: {probabilityRange.min}% — {probabilityRange.max}%
          </label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-8">Mín</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={probabilityRange.min}
                aria-label="Probabilidade mínima"
                onChange={e => {
                  const val = Number(e.target.value);
                  setProbabilityRange({ ...probabilityRange, min: Math.min(val, probabilityRange.max) });
                }}
                className="w-full accent-primary-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-8">Máx</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={probabilityRange.max}
                aria-label="Probabilidade máxima"
                onChange={e => {
                  const val = Number(e.target.value);
                  setProbabilityRange({ ...probabilityRange, max: Math.max(val, probabilityRange.min) });
                }}
                className="w-full accent-primary-600"
              />
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 flex items-center gap-2 px-4 py-3 border-t border-border bg-white dark:bg-dark-card">
        <Button
          variant="ghost"
          onClick={clearAdvancedFilters}
          className="flex-1 text-sm text-muted-foreground hover:text-destructive gap-1.5"
        >
          <Trash2 size={14} />
          Limpar Filtros
        </Button>
        <Button
          onClick={onClose}
          className="flex-1 bg-primary-700 hover:bg-primary-600 text-white text-sm rounded-lg"
        >
          Fechar
        </Button>
      </div>
    </Drawer>
  );
}
