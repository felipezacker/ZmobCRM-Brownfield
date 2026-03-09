import React, { useState } from 'react';
import { Check, Search, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BRL_CURRENCY } from '@/features/boards/components/deal-detail/constants';
import { productsService } from '@/lib/supabase/products';
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
  onProductCreated?: (product: Product) => void;
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
  onProductCreated,
}) => {
  const [creatingProduct, setCreatingProduct] = useState(false);

  const handleCreateProduct = async () => {
    if (!productSearch.trim() || creatingProduct) return;
    setCreatingProduct(true);
    try {
      const { data: newProduct, error } = await productsService.create({
        name: productSearch.trim(),
        price: 0,
      });
      if (error || !newProduct) {
        console.error('Falha ao criar produto:', error);
        return;
      }
      window.dispatchEvent(new CustomEvent('crm:products-updated'));
      onProductCreated?.(newProduct);
      onSelect(newProduct.id);
      onClose();
    } finally {
      setCreatingProduct(false);
    }
  };

  return (
  <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-border bg-white dark:bg-background/95 backdrop-blur-xl shadow-2xl shadow-border/30 dark:shadow-black/40">
    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
      <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <input
        ref={productSearchInputRef}
        type="text"
        value={productSearch}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        placeholder="Buscar produto..."
        className="flex-1 bg-transparent text-sm text-secondary-foreground dark:text-muted-foreground outline-none placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
      />
      {productSearch && (
        <span className="text-[10px] text-muted-foreground dark:text-secondary-foreground">{filteredProducts.length}</span>
      )}
    </div>
    <div className="max-h-52 overflow-auto py-1">
      {filteredProducts.length === 0 ? (
        productSearch.trim() ? (
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            disabled={creatingProduct}
            onClick={handleCreateProduct}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-background dark:hover:bg-white/4 text-primary-600 dark:text-primary-400"
          >
            {creatingProduct ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Plus className="h-3.5 w-3.5 shrink-0" />}
            <span className="text-sm">Criar &quot;{productSearch.trim()}&quot;</span>
          </Button>
        ) : (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground dark:text-secondary-foreground">Nenhum produto encontrado</div>
        )
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
                isCurrent ? 'bg-muted dark:bg-white/6' : 'hover:bg-background dark:hover:bg-white/4'
              }`}
              onClick={() => onSelect(p.id)}
            >
              <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${isCurrent ? 'text-primary-600 dark:text-primary-400' : 'text-transparent'}`}>
                <Check className="h-3 w-3" />
              </div>
              <span className={`truncate text-sm ${isCurrent ? 'font-semibold text-foreground ' : 'text-secondary-foreground dark:text-muted-foreground'}`}>
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
    <div className="border-t border-border px-3 py-1.5">
      <span className="text-[10px] text-muted-foreground dark:text-secondary-foreground">{products.length} produtos no catalogo</span>
    </div>
  </div>
  );
};

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
  <div className="mt-3 rounded-xl border border-border bg-white/60 dark:bg-white/5 p-3">
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
      <div className="sm:col-span-6">
        <label className="block text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">Nome do item</label>
        <input
          value={customItemName}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Ex.: Pacote personalizado, Procedimento X..."
          className="w-full bg-white dark:bg-black/20 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div className="sm:col-span-3">
        <label className="block text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">Preco</label>
        <input
          value={customItemPrice}
          onChange={e => onPriceChange(e.target.value)}
          inputMode="decimal"
          className="w-full bg-white dark:bg-black/20 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">Qtd</label>
        <input
          type="number"
          min={1}
          value={customItemQuantity}
          onChange={e => onQuantityChange(parseInt(e.target.value))}
          className="w-full bg-white dark:bg-black/20 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
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
