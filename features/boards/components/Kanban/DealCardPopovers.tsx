import React, { useState } from 'react';
import { DealView, Product } from '@/types';
import { Check, Loader2, Minus, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { productsService } from '@/lib/supabase/products';
import type { OrgMember } from '@/hooks/useOrganizationMembers';

// Performance: reuse currency formatter instance.
const BRL_CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Get initials from name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

/* ------------------------------------------------------------------ */
/*  Product Picker Popover (Enriched — 2 states)                       */
/* ------------------------------------------------------------------ */

interface ProductPickerProps {
  deal: DealView;
  productName: string | null;
  products: Product[];
  productSearch: string;
  onProductSearchChange: (value: string) => void;
  productPickerOpen: boolean;
  onProductPickerOpenChange: (open: boolean) => void;
  filteredProducts: Product[];
  creatingProduct: boolean;
  onCreateProduct: () => void;
  onSelectProduct: (product: Product | null) => void;
  onUpdateItem?: (dealId: string, itemId: string, updates: { quantity?: number; price?: number }) => void;
}

export const ProductPicker: React.FC<ProductPickerProps> = ({
  deal,
  productName,
  products,
  productSearch,
  onProductSearchChange,
  productPickerOpen,
  onProductPickerOpenChange,
  filteredProducts,
  creatingProduct,
  onCreateProduct,
  onSelectProduct,
  onUpdateItem,
}) => {
  const currentItem = deal.items?.[0] ?? null;
  const hasProduct = !!currentItem;

  // "switching" forces the list view even when a product is selected
  const [switching, setSwitching] = useState(false);

  // Local editable fields for qty/price
  const [editQty, setEditQty] = useState<number>(currentItem?.quantity ?? 1);
  const [editPrice, setEditPrice] = useState<string>(currentItem?.price?.toString() ?? '');

  // Sync local state when popover opens
  const handleOpenChange = (open: boolean) => {
    if (open && currentItem) {
      setEditQty(currentItem.quantity ?? 1);
      setEditPrice(currentItem.price?.toString() ?? '');
      setSwitching(false);
    }
    if (!open) {
      setSwitching(false);
    }
    onProductPickerOpenChange(open);
  };

  const showEditView = hasProduct && !switching;

  const handleSaveItem = () => {
    if (!currentItem || !onUpdateItem) return;
    const parsedPrice = parseFloat(editPrice.replace(',', '.'));
    const finalPrice = isNaN(parsedPrice) ? currentItem.price : parsedPrice;
    onUpdateItem(deal.id, currentItem.id, {
      quantity: Math.max(1, editQty),
      price: finalPrice,
    });

    // Sync catalog price if product was just created (price still 0)
    if (currentItem.productId && finalPrice > 0) {
      const catalogProduct = products.find(p => p.id === currentItem.productId);
      if (catalogProduct && catalogProduct.price === 0) {
        productsService.update(catalogProduct.id, { price: finalPrice }).then(() => {
          window.dispatchEvent(new CustomEvent('crm:products-updated'));
        });
      }
    }

    onProductPickerOpenChange(false);
  };

  const handleRemove = () => {
    onSelectProduct(null);
    setSwitching(false);
  };

  const handleSelectAndReset = (product: Product | null) => {
    onSelectProduct(product);
    setSwitching(false);
  };

  const subtotal = (isNaN(parseFloat(editPrice.replace(',', '.'))) ? (currentItem?.price ?? 0) : parseFloat(editPrice.replace(',', '.'))) * Math.max(1, editQty);

  return (
    <div className="flex items-center gap-1 mt-1 ml-8 text-xs truncate">
      <Popover open={productPickerOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={`truncate hover:underline cursor-pointer ${productName ? 'text-green-600 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'}`}
          >
            {productName
              ? `${productName}${currentItem && currentItem.quantity > 1 ? ` (${currentItem.quantity}x)` : ''}`
              : 'Sem produto'}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-60 p-0 border border-border bg-white dark:bg-card rounded-lg shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Animated container — slides between edit and list views */}
          <div className="relative">
            {/* ── State A: Edit current product ── */}
            <div
              className={`transition-all duration-200 ease-out ${
                showEditView
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 -translate-x-2 absolute inset-0 pointer-events-none'
              }`}
            >
              {currentItem && (
                <>
                  {/* Header with product name */}
                  <div className="px-3 py-2.5 border-b border-border">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400 truncate">
                        {currentItem.name}
                      </span>
                      <span className="text-2xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded shrink-0">
                        Catalogo
                      </span>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Quantidade</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="unstyled"
                        size="unstyled"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEditQty(prev => Math.max(1, prev - 1)); }}
                        className="w-6 h-6 flex items-center justify-center rounded border border-border hover:bg-muted active:scale-90 transition-all text-muted-foreground hover:text-foreground"
                      >
                        <Minus size={10} />
                      </Button>
                      <input
                        type="number"
                        min={1}
                        value={editQty}
                        onChange={(e) => setEditQty(Math.max(1, parseInt(e.target.value) || 1))}
                        onClick={(e) => e.stopPropagation()}
                        className="w-10 text-center text-xs font-semibold bg-transparent border border-border rounded py-0.5 outline-none focus:ring-1 focus:ring-primary-500 transition-shadow"
                      />
                      <Button
                        variant="unstyled"
                        size="unstyled"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEditQty(prev => prev + 1); }}
                        className="w-6 h-6 flex items-center justify-center rounded border border-border hover:bg-muted active:scale-90 transition-all text-muted-foreground hover:text-foreground"
                      >
                        <Plus size={10} />
                      </Button>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="px-3 py-2 flex items-center justify-between border-t border-border/50">
                    <span className="text-xs text-muted-foreground">Preco unit.</span>
                    <div className="flex items-center gap-1">
                      <span className="text-2xs text-muted-foreground">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveItem(); }}
                        className="w-20 text-right text-xs font-semibold bg-transparent border border-border rounded py-0.5 px-1.5 outline-none focus:ring-1 focus:ring-primary-500 tabular-nums transition-shadow"
                      />
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="px-3 py-2 flex items-center justify-between bg-muted/50 dark:bg-white/5 border-t border-border">
                    <span className="text-xs font-medium text-muted-foreground">Subtotal</span>
                    <span className="text-xs font-bold text-foreground tabular-nums transition-all">
                      {BRL_CURRENCY.format(subtotal)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="px-3 py-2 flex items-center gap-2 border-t border-border">
                    <Button
                      variant="unstyled"
                      size="unstyled"
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSaveItem(); }}
                      className="flex-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-500 active:scale-[0.97] rounded py-1.5 transition-all text-center"
                    >
                      Salvar
                    </Button>
                    <Button
                      variant="unstyled"
                      size="unstyled"
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSwitching(true); }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground active:scale-90 transition-all py-1.5 px-2 rounded hover:bg-muted"
                      title="Trocar produto"
                    >
                      <RefreshCw size={10} />
                    </Button>
                    <Button
                      variant="unstyled"
                      size="unstyled"
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 active:scale-90 transition-all py-1.5 px-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Remover produto"
                    >
                      <Trash2 size={10} />
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* ── State B: Search / select product list ── */}
            <div
              className={`transition-all duration-200 ease-out ${
                !showEditView
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 translate-x-2 absolute inset-0 pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-2 px-2.5 py-2 border-b border-border">
                {switching ? (
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSwitching(false); }}
                    className="text-xs text-muted-foreground hover:text-foreground active:scale-90 transition-all shrink-0 p-0.5 rounded hover:bg-muted"
                    aria-label="Voltar para edição"
                  >
                    &larr;
                  </Button>
                ) : (
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <input
                  value={productSearch}
                  onChange={(e) => onProductSearchChange(e.target.value)}
                  placeholder="Buscar produto..."
                  aria-label="Buscar produto"
                  className="flex-1 bg-transparent text-xs text-foreground dark:text-muted-foreground outline-none placeholder:text-muted-foreground"
                  autoFocus={!showEditView}
                />
              </div>
              <div className="max-h-48 overflow-auto py-1">
                <Button
                  variant="unstyled"
                  size="unstyled"
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleSelectAndReset(null); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted dark:hover:bg-white/5 active:bg-muted/80 transition-colors ${!productName ? 'text-amber-500 font-semibold' : 'text-muted-foreground dark:text-muted-foreground'}`}
                >
                  Sem produto
                </Button>
                {filteredProducts.map((p) => (
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    key={p.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSelectAndReset(p); }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted dark:hover:bg-white/5 active:bg-muted/80 transition-colors flex items-center justify-between gap-2 ${currentItem?.productId === p.id ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-secondary-foreground dark:text-muted-foreground'}`}
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-2xs text-muted-foreground shrink-0 tabular-nums">
                      {BRL_CURRENCY.format(p.price)}
                    </span>
                  </Button>
                ))}
                {filteredProducts.length === 0 && (
                  productSearch.trim() ? (
                    <Button
                      variant="unstyled"
                      size="unstyled"
                      type="button"
                      disabled={creatingProduct}
                      onClick={(e) => { e.stopPropagation(); onCreateProduct(); }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted dark:hover:bg-white/5 active:bg-muted/80 transition-colors text-primary-500 dark:text-primary-400 flex items-center gap-1.5"
                    >
                      {creatingProduct ? <Loader2 className="h-3 w-3 animate-spin shrink-0" /> : <Plus className="h-3 w-3 shrink-0" />}
                      <span className="truncate">Criar &quot;{productSearch.trim()}&quot;</span>
                    </Button>
                  ) : (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum produto encontrado</div>
                  )
                )}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Owner Picker Popover                                               */
/* ------------------------------------------------------------------ */

interface OwnerPickerProps {
  deal: DealView;
  ownerSearch: string;
  onOwnerSearchChange: (value: string) => void;
  ownerPickerOpen: boolean;
  onOwnerPickerOpenChange: (open: boolean) => void;
  filteredMembers: OrgMember[];
  onSelectOwner: (member: OrgMember | null) => void;
}

export const OwnerPicker: React.FC<OwnerPickerProps> = ({
  deal,
  ownerSearch,
  onOwnerSearchChange,
  ownerPickerOpen,
  onOwnerPickerOpenChange,
  filteredMembers,
  onSelectOwner,
}) => (
  <div className="flex items-center mt-1 ml-1 text-xs">
    <Popover open={ownerPickerOpen} onOpenChange={onOwnerPickerOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="unstyled"
          size="unstyled"
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 truncate cursor-pointer group/owner"
        >
          {deal.owner?.name && deal.owner.name !== 'Sem Dono' ? (
            <>
              <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center text-[8px] font-bold shrink-0 ring-1 ring-blue-200/50 dark:ring-blue-700/30">
                {getInitials(deal.owner.name)}
              </span>
              <span className="truncate text-muted-foreground dark:text-muted-foreground group-hover/owner:text-foreground dark:group-hover/owner:text-muted-foreground transition-colors">
                {deal.owner.name}
              </span>
            </>
          ) : (
            <>
              <span className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center text-[8px] shrink-0">
                ?
              </span>
              <span className="text-amber-500 dark:text-amber-400 group-hover/owner:text-amber-600 dark:group-hover/owner:text-amber-300 transition-colors">
                Sem dono
              </span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-60 p-0 border border-border bg-white dark:bg-card rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-2.5 py-2 border-b border-border">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            value={ownerSearch}
            onChange={(e) => onOwnerSearchChange(e.target.value)}
            placeholder="Buscar corretor..."
            aria-label="Buscar corretor"
            className="flex-1 bg-transparent text-xs text-foreground dark:text-muted-foreground outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        </div>
        <div className="max-h-52 overflow-auto py-1">
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelectOwner(null); }}
            className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-background dark:hover:bg-white/5 transition-colors flex items-center gap-2 ${!deal.ownerId ? 'bg-background dark:bg-white/5' : ''}`}
          >
            <span className="w-5 h-5 rounded-full bg-muted dark:bg-white/10 text-muted-foreground flex items-center justify-center text-3xs shrink-0">

            </span>
            <span className={`flex-1 ${!deal.ownerId ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground dark:text-muted-foreground'}`}>
              Sem dono
            </span>
            {!deal.ownerId && <Check className="h-3 w-3 text-amber-500 shrink-0" />}
          </Button>
          {filteredMembers.map((m) => {
            const isSelected = deal.ownerId === m.id;
            return (
              <Button
                variant="unstyled"
                size="unstyled"
                key={m.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); onSelectOwner(m); }}
                className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-background dark:hover:bg-white/5 transition-colors flex items-center gap-2 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-3xs font-bold shrink-0 ${isSelected
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 ring-1 ring-blue-300/50 dark:ring-blue-600/30'
                    : 'bg-muted dark:bg-white/10 text-muted-foreground dark:text-muted-foreground'
                  }`}>
                  {getInitials(m.name)}
                </span>
                <span className={`flex-1 truncate ${isSelected ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-secondary-foreground dark:text-muted-foreground'}`}>
                  {m.name}
                </span>
                <span className={`text-3xs px-1 py-0.5 rounded ${m.role === 'admin' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400' :
                    m.role === 'diretor' ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-500 dark:text-sky-400' :
                      'bg-background dark:bg-white/5 text-muted-foreground dark:text-muted-foreground'
                  }`}>
                  {m.role}
                </span>
                {isSelected && <Check className="h-3 w-3 text-blue-500 dark:text-blue-400 shrink-0" />}
              </Button>
            );
          })}
          {filteredMembers.length === 0 && (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">Nenhum corretor encontrado</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  </div>
);
