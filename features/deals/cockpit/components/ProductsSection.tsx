'use client';

import React, { useMemo } from 'react';
import { Package, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Product } from '@/types';
import { formatCurrencyBRL } from '@/features/deals/cockpit/cockpit-utils';
import { SectionHeader } from '@/features/deals/cockpit/components/SectionHeader';
import { AddItemForm } from '@/features/deals/cockpit/components/AddItemForm';

interface DealItem {
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
}

export interface ProductsSectionProps {
  items: DealItem[] | undefined;
  collapsed: boolean;
  onToggle: () => void;
  products?: Product[];
  onAddItem?: (item: { productId?: string; name: string; price: number; quantity: number }) => void;
  onRemoveItem?: (itemId: string) => void;
}

/** Products section with list and add-item form. */
export function ProductsSection({
  items,
  collapsed,
  onToggle,
  products,
  onAddItem,
  onRemoveItem,
}: ProductsSectionProps) {
  const productsTotal = useMemo(() => {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum: number, item) => sum + (item.price ?? 0) * (item.quantity ?? 1), 0);
  }, [items]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-3">
      <SectionHeader
        label="Produtos"
        icon={<Package className="h-3.5 w-3.5" />}
        iconColor="text-emerald-500 dark:text-emerald-400"
        collapsed={collapsed}
        onToggle={onToggle}
      />
      {!collapsed && (
        <div className="mt-2">
          {items && items.length > 0 ? (
            <div className="space-y-1.5 text-xs">
              {items.map((item, idx) => (
                <div key={item.id ?? idx} className="group flex items-center justify-between gap-2">
                  <span className="text-slate-700 dark:text-slate-200 truncate">{item.name ?? 'Produto'}</span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className="text-slate-600 dark:text-slate-300">
                      {item.quantity && item.quantity > 1 ? `${item.quantity}x ` : ''}
                      {item.price != null ? formatCurrencyBRL(item.price) : ''}
                    </span>
                    {onRemoveItem && item.id ? (
                      <Button
                        variant="unstyled"
                        size="unstyled"
                        type="button"
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-all"
                        title="Remover produto"
                        onClick={() => onRemoveItem(item.id!)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    ) : null}
                  </span>
                </div>
              ))}
              {/* Total */}
              {productsTotal > 0 && (
                <div className="flex items-center justify-between gap-2 border-t border-slate-200 dark:border-white/10 pt-1.5 mt-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-300">{formatCurrencyBRL(productsTotal)}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-2">
              <Package className="h-4 w-4 text-slate-300 dark:text-slate-600" />
              <span className="text-xs text-slate-400 dark:text-slate-500">Nenhum produto adicionado</span>
            </div>
          )}
          {/* Add item form */}
          {onAddItem ? (
            <div className="mt-2">
              <AddItemForm products={products} onAddItem={onAddItem} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
