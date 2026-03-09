'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Product } from '@/types';
import { formatCurrencyBRL } from '@/features/deals/cockpit/cockpit-utils';
import { INPUT_CLASS, SELECT_CLASS } from '@/features/deals/cockpit/components/cockpit-data-constants';

export interface AddItemFormProps {
  products?: Product[];
  onAddItem: (item: { productId?: string; name: string; price: number; quantity: number }) => void;
}

/** Add-item form with catalog picker and custom entry modes. */
export function AddItemForm({ products, onAddItem }: AddItemFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [addMode, setAddMode] = useState<'catalog' | 'custom'>('catalog');
  // Catalog mode
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productQty, setProductQty] = useState(1);
  const productPickerRef = useRef<HTMLDivElement>(null);
  const productSearchRef = useRef<HTMLInputElement>(null);
  // Custom mode
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState('1');

  // Click-outside to close product picker
  useEffect(() => {
    if (!productPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (productPickerRef.current && !productPickerRef.current.contains(e.target as Node)) {
        setProductPickerOpen(false);
        setProductSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [productPickerOpen]);

  // Auto-focus search when picker opens
  useEffect(() => {
    if (productPickerOpen) productSearchRef.current?.focus();
  }, [productPickerOpen]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  const selectedProduct = useMemo(() => {
    if (!selectedProductId || !products) return null;
    return products.find((p) => p.id === selectedProductId) ?? null;
  }, [selectedProductId, products]);

  const resetForm = () => {
    setSelectedProductId('');
    setProductSearch('');
    setProductPickerOpen(false);
    setProductQty(1);
    setCustomName('');
    setCustomPrice('');
    setCustomQty('1');
    setShowForm(false);
  };

  const handleAddCatalogItem = () => {
    if (!selectedProductId) return;
    const product = products?.find((p) => p.id === selectedProductId);
    if (!product) return;
    onAddItem({ productId: product.id, name: product.name, price: product.price, quantity: productQty });
    resetForm();
  };

  const handleAddCustomItem = () => {
    if (!customName.trim()) return;
    onAddItem({ name: customName.trim(), price: parseFloat(customPrice) || 0, quantity: parseInt(customQty, 10) || 1 });
    resetForm();
  };

  if (!showForm) {
    return (
      <Button
        variant="unstyled" size="unstyled" type="button"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors mt-1"
        onClick={() => setShowForm(true)}
      >
        <Plus className="h-3 w-3" /> Produto
      </Button>
    );
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-border bg-white dark:bg-white/3 p-2">
      {/* Mode tabs */}
      <div className="flex gap-1 mb-2">
        <Button
          variant="unstyled" size="unstyled" type="button"
          className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors ${
            addMode === 'catalog'
              ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-200'
              : 'text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground'
          }`}
          onClick={() => setAddMode('catalog')}
        >
          Catalogo
        </Button>
        <Button
          variant="unstyled" size="unstyled" type="button"
          className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors ${
            addMode === 'custom'
              ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-200'
              : 'text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground'
          }`}
          onClick={() => setAddMode('custom')}
        >
          Personalizado
        </Button>
      </div>

      {addMode === 'catalog' ? (
        products && products.length > 0 ? (
          <>
            {/* Searchable product picker */}
            <div className="relative" ref={productPickerRef}>
              <Button
                variant="unstyled" size="unstyled" type="button"
                className={`${SELECT_CLASS} w-full flex items-center justify-between gap-1 text-secondary-foreground dark:text-muted-foreground`}
                onClick={() => setProductPickerOpen(!productPickerOpen)}
              >
                <span className="truncate">
                  {selectedProduct ? selectedProduct.name : 'Selecionar produto...'}
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                  {selectedProduct ? formatCurrencyBRL(selectedProduct.price) : ''}
                </span>
              </Button>

              {productPickerOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-white dark:bg-background/95 backdrop-blur-xl shadow-xl shadow-border/30 dark:shadow-black/40">
                  <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
                    <Search className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <input
                      ref={productSearchRef}
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') { setProductPickerOpen(false); setProductSearch(''); }
                      }}
                      placeholder="Buscar produto..."
                      className="flex-1 bg-transparent text-xs text-secondary-foreground dark:text-muted-foreground outline-none placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="max-h-[150px] overflow-auto py-0.5">
                    {filteredProducts.length === 0 ? (
                      <div className="px-2 py-3 text-center text-xs text-muted-foreground dark:text-secondary-foreground">Nenhum produto encontrado</div>
                    ) : (
                      filteredProducts.map((p) => {
                        const isCurrent = p.id === selectedProductId;
                        return (
                          <Button
                            variant="unstyled" size="unstyled" key={p.id} type="button"
                            className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-left transition-colors ${
                              isCurrent ? 'bg-muted dark:bg-white/6' : 'hover:bg-background dark:hover:bg-white/4'
                            }`}
                            onClick={() => { setSelectedProductId(p.id); setProductPickerOpen(false); setProductSearch(''); }}
                          >
                            <div className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded ${isCurrent ? 'text-cyan-600 dark:text-cyan-400' : 'text-transparent'}`}>
                              <Check className="h-2.5 w-2.5" />
                            </div>
                            <span className={`truncate text-xs ${isCurrent ? 'font-semibold text-foreground dark:text-muted-foreground' : 'text-secondary-foreground dark:text-muted-foreground'}`}>
                              {p.name}
                            </span>
                            <span className="ml-auto shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400/70">
                              {formatCurrencyBRL(p.price)}
                            </span>
                          </Button>
                        );
                      })
                    )}
                  </div>
                  <div className="border-t border-border px-2 py-1">
                    <span className="text-xs text-muted-foreground dark:text-secondary-foreground">{products.length} produtos no catalogo</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Qtd</span>
              <input
                type="number"
                className={`${INPUT_CLASS} w-12 text-center text-secondary-foreground dark:text-muted-foreground`}
                value={productQty}
                onChange={(e) => setProductQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                min={1}
              />
            </div>
            <div className="flex gap-1.5">
              <Button
                type="button"
                className="flex-1 rounded-lg bg-cyan-500/15 px-2 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-200 hover:bg-cyan-500/25 transition-colors"
                onClick={handleAddCatalogItem}
                disabled={!selectedProductId}
              >
                Adicionar
              </Button>
              <Button
                type="button"
                className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted dark:hover:bg-white/5 transition-colors"
                onClick={resetForm}
              >
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground">
            Nenhum produto cadastrado.{' '}
            <Button variant="unstyled" size="unstyled" type="button" className="text-cyan-600 dark:text-cyan-300 hover:underline" onClick={() => setAddMode('custom')}>
              Adicionar manualmente
            </Button>
          </div>
        )
      ) : (
        <>
          <input
            type="text"
            className={`${INPUT_CLASS} w-full text-secondary-foreground dark:text-muted-foreground`}
            placeholder="Nome do produto"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
          <div className="flex gap-1.5">
            <input
              type="number"
              className={`${INPUT_CLASS} flex-1 text-secondary-foreground dark:text-muted-foreground`}
              placeholder="Preco"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
            />
            <input
              type="number"
              className={`${INPUT_CLASS} w-12 text-center text-secondary-foreground dark:text-muted-foreground`}
              placeholder="Qtd"
              value={customQty}
              onChange={(e) => setCustomQty(e.target.value)}
              min={1}
            />
          </div>
          <div className="flex gap-1.5">
            <Button
              type="button"
              className="flex-1 rounded-lg bg-cyan-500/15 px-2 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-200 hover:bg-cyan-500/25 transition-colors"
              onClick={handleAddCustomItem}
              disabled={!customName.trim()}
            >
              Adicionar
            </Button>
            <Button
              type="button"
              className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted dark:hover:bg-white/5 transition-colors"
              onClick={resetForm}
            >
              Cancelar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
