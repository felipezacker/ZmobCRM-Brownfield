'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Briefcase, X } from 'lucide-react';
import type { Deal } from '@/types';

interface DealSearchComboboxProps {
  deals: Deal[];
  selectedDealId: string;
  onSelect: (dealId: string) => void;
  placeholder?: string;
  required?: boolean;
}

export const DealSearchCombobox: React.FC<DealSearchComboboxProps> = ({
  deals,
  selectedDealId,
  onSelect,
  placeholder = 'Buscar negócio...',
  required = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedDeal = useMemo(
    () => deals.find((d) => d.id === selectedDealId) ?? null,
    [deals, selectedDealId]
  );

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return deals.slice(0, 8);
    const q = searchTerm.toLowerCase().trim();
    return deals
      .filter((d) => d.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [deals, searchTerm]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filtered]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (deal: Deal) => {
    onSelect(deal.id);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect('');
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filtered.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightedIndex]) {
          handleSelect(filtered[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const formatValue = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (selectedDeal) {
    return (
      <div className="flex items-center gap-2 w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm">
        <Briefcase size={14} className="text-slate-400 shrink-0" />
        <span className="text-slate-900 dark:text-white truncate flex-1">
          {selectedDeal.title}
        </span>
        <button
          type="button"
          aria-label="Remover negócio selecionado"
          onClick={handleClear}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-white shrink-0"
        >
          <X size={14} />
        </button>
        {required && <input type="hidden" required value={selectedDealId} />}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Buscar negócio"
          className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
        />
        {required && !selectedDealId && (
          <input
            type="text"
            required
            value=""
            onChange={() => {}}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
        )}
      </div>

      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-lg shadow-xl overflow-hidden"
        >
          {filtered.length > 0 ? (
            <div className="max-h-48 overflow-y-auto">
              {filtered.map((deal, index) => (
                <button
                  key={deal.id}
                  type="button"
                  onClick={() => handleSelect(deal)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    index === highlightedIndex
                      ? 'bg-primary-50 dark:bg-primary-500/10'
                      : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <Briefcase size={14} className="text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {deal.title}
                    </p>
                    {deal.value > 0 && (
                      <p className="text-xs text-slate-500">{formatValue(deal.value)}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-sm text-slate-400 text-center">
              Nenhum negocio encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
};
