import React from 'react';
import { Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BRL_CURRENCY } from '@/features/boards/components/deal-detail/constants';
import type { Product } from '@/types';

export interface ProductPickerDropdownProps {
  products: Product[];
  filteredProducts: Product[];
  selectedProductId: string;
  productSearch: string;
  productSearchInputRef: React.RefObject<HTMLInputElement | null>;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export const ProductPickerDropdown: React.FC<ProductPickerDropdownProps> = ({
  products,
  filteredProducts,
  selectedProductId,
  productSearch,
  productSearchInputRef,
  onSearchChange,
  onSelect,
  onClose,
}) => (
  <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/95 backdrop-blur-xl shadow-2xl shadow-slate-300/30 dark:shadow-black/40">
    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/8 px-3 py-2">
      <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <input
        ref={productSearchInputRef}
        type="text"
        value={productSearch}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        placeholder="Buscar produto..."
        className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
      />
      {productSearch && (
        <span className="text-[10px] text-slate-400 dark:text-slate-600">{filteredProducts.length}</span>
      )}
    </div>
    <div className="max-h-52 overflow-auto py-1">
      {filteredProducts.length === 0 ? (
        <div className="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-600">Nenhum produto encontrado</div>
      ) : (
        filteredProducts.map((p) => {
          const isCurrent = p.id === selectedProductId;
          return (
            <Button
              variant="unstyled"
              size="unstyled"
              key={p.id}
              type="button"
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                isCurrent ? 'bg-slate-100 dark:bg-white/6' : 'hover:bg-slate-50 dark:hover:bg-white/4'
              }`}
              onClick={() => onSelect(p.id)}
            >
              <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${isCurrent ? 'text-primary-600 dark:text-primary-400' : 'text-transparent'}`}>
                <Check className="h-3 w-3" />
              </div>
              <span className={`truncate text-sm ${isCurrent ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                {p.name}
              </span>
              <span className="ml-auto shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400/70">
                {BRL_CURRENCY.format(p.price)}
              </span>
            </Button>
          );
        })
      )}
    </div>
    <div className="border-t border-slate-200 dark:border-white/8 px-3 py-1.5">
      <span className="text-[10px] text-slate-400 dark:text-slate-600">{products.length} produtos no catalogo</span>
    </div>
  </div>
);

export interface CustomItemFormProps {
  customItemName: string;
  customItemPrice: string;
  customItemQuantity: number;
  onNameChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onQuantityChange: (qty: number) => void;
  onAdd: () => void;
}

export const CustomItemForm: React.FC<CustomItemFormProps> = ({
  customItemName,
  customItemPrice,
  customItemQuantity,
  onNameChange,
  onPriceChange,
  onQuantityChange,
  onAdd,
}) => (
  <div className="mt-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3">
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
      <div className="sm:col-span-6">
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nome do item</label>
        <input
          value={customItemName}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Ex.: Pacote personalizado, Procedimento X..."
          className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
        />
      </div>
      <div className="sm:col-span-3">
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Preco</label>
        <input
          value={customItemPrice}
          onChange={e => onPriceChange(e.target.value)}
          inputMode="decimal"
          className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Qtd</label>
        <input
          type="number"
          min={1}
          value={customItemQuantity}
          onChange={e => onQuantityChange(parseInt(e.target.value))}
          className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
        />
      </div>
      <div className="sm:col-span-1">
        <Button
          type="button"
          onClick={onAdd}
          className="w-full bg-primary-600 hover:bg-primary-500 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors"
        >
          +
        </Button>
      </div>
    </div>
  </div>
);
